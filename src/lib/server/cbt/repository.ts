import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  cbtStateSchema,
  type CbtRepository,
  type CbtState,
} from "../../cbt/model";
import { AppError, ensure } from "../../domain/errors";
import type { Profile } from "../../types";
import { mode, supabaseServerConfig, cbtEnabled } from "../config";
export { cbtEnabled } from "../config";
import { repository } from "../repository";
import { createCbtService } from "./engine";
import { cbtInput } from "../../cbt/model";
import type { CbtView } from "./engine";
import {
  guardFocusWrites,
  readFocus,
  readReleasedRanking,
  readMonitor,
} from "../assessment-support-store";
let queue: Promise<unknown> = Promise.resolve();
export function cbtRepository(actor: Profile): CbtRepository {
  if (mode() === "demo")
    return {
      transact: async (fn) => {
        const run = queue.then(async () => {
          const file = path.join(process.cwd(), ".data", "cbt.json");
          let state: CbtState;
          try {
            state = cbtStateSchema.parse(
              JSON.parse(await readFile(file, "utf8")),
            );
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT")
              throw new AppError(
                "Data ujian belum dapat dimuat. Hubungi panitia.",
                503,
              );
            state = { exams: [], sittings: [] };
          }
          const before = JSON.stringify(state);
          const original = structuredClone(state);
          const result = fn(state);
          if (JSON.stringify(state) !== before) {
            await guardFocusWrites(state, original, async () => {
              await mkdir(path.dirname(file), { recursive: true });
              await writeFile(file + ".tmp", JSON.stringify(state), {
                mode: 0o600,
              });
              await rename(file + ".tmp", file);
            });
          }
          return result;
        });
        queue = run.catch(() => undefined);
        return run;
      },
    };
  const { url, key } = supabaseServerConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    transact: async (fn) => {
      for (let retry = 0; retry < 5; retry++) {
        const { data, error } = await client.rpc("read_cbt_state", {
          actor_id: actor.id,
        });
        if (error)
          throw new AppError("Layanan ujian belum siap. Hubungi panitia.", 503);
        const parsed = z
          .object({
            revision: z.number().int().nonnegative(),
            state: cbtStateSchema,
          })
          .parse(data);
        const state = parsed.state;
        const original = structuredClone(state);
        const result = fn(state);
        const changed = <K extends keyof CbtState>(table: K) =>
          state[table].filter(
            (row) =>
              !original[table].some(
                (old) => JSON.stringify(old) === JSON.stringify(row),
              ),
          );
        const changes = {
          exams: changed("exams"),
          sittings: changed("sittings"),
        };
        if (!changes.exams.length && !changes.sittings.length) return result;
        const commit = await client.rpc("commit_cbt_state", {
          actor_id: actor.id,
          expected_revision: parsed.revision,
          changes,
        });
        if (commit.error?.message.includes("ASSESSMENT_FOCUS_LOCKED"))
          throw new AppError(
            "Pengerjaan dihentikan sementara. Hubungi guru untuk izin lanjut.",
            409,
          );
        if (commit.error?.message.includes("CBT_PACKET_EXPOSED"))
          throw new AppError(
            "Sebagian soal sudah pernah dirilis. Siapkan 24 soal baru untuk gelombang berikutnya.",
            409,
          );
        if (commit.error?.message.includes("CBT_PRACTICE_OVERLAP"))
          throw new AppError(
            "Sebagian soal sudah tersedia dalam bank latihan sekolah. Gunakan 24 soal ujian baru yang belum dibuka kepada peserta.",
            409,
          );
        if (commit.error?.message.includes("CBT_PACKET_BUSY"))
          throw new AppError(
            "Soal yang sama masih dipakai ujian lain. Tutup seluruh ujian terkait sebelum merilis hasil.",
            409,
          );
        if (commit.error)
          throw new AppError(
            "Jawaban belum tersimpan. Muat ulang untuk memeriksa status terakhir.",
            503,
          );
        if (commit.data === true) return result;
      }
      throw new AppError("Ujian sedang diperbarui. Coba lagi.", 409);
    },
  };
}
export async function cbtService(actor: Profile) {
  ensure(cbtEnabled(), "Asesmen sedang disiapkan oleh panitia.", 503);
  const context = await repository().read(actor);
  const service = createCbtService(cbtRepository(actor), context, actor);
  async function enrich(view: CbtView) {
    const [focus] = await readFocus(
      actor.id,
      [view.id],
      view.focus.enabled ? [view.id] : [],
    );
    view.focus = focus ?? view.focus;
    if (view.focus.locked && view.status === "active") view.questions = [];
    if (mode() !== "demo" && view.result)
      view.ranking = await readReleasedRanking(actor.id, view.exam_id);
    return view;
  }
  return {
    ...service,
    view: async (id: string) => enrich(await service.view(id)),
    execute: async (raw: unknown) => {
      const input = cbtInput.parse(raw);
      if (input.action === "save" || input.action === "submit") {
        const view = await enrich(await service.view(input.sitting_id));
        ensure(
          view.status !== "active" || !view.focus.locked,
          "Pengerjaan dihentikan sementara. Hubungi guru untuk izin lanjut.",
          409,
        );
      }
      const result = await service.execute(input);
      if ("view" in result && result.view)
        result.view = await enrich(result.view);
      return result;
    },
    list: async () => {
      const list = await service.list();
      if (actor.role === "teacher") {
        const ids = list.exams.flatMap(
          (e) => e.participants?.map((s) => s.id) ?? [],
        );
        const [monitor, focus] = await Promise.all([
          readMonitor(actor.id, ids),
          readFocus(
            actor.id,
            ids,
            list.exams
              .filter((e) => e.focus_guard)
              .flatMap((e) => e.participants?.map((s) => s.id) ?? []),
          ),
        ]);
        for (const exam of list.exams)
          for (const s of exam.participants ?? []) {
            s.monitor = monitor.find((m) => m.sitting_id === s.id) ?? null;
            const f = focus.find((f) => f.sitting_id === s.id);
            if (s.monitor && f) s.monitor.focus = f;
          }
      }
      if (actor.role === "student" && mode() !== "demo")
        await Promise.all(
          list.exams
            .filter((e) => e.ranking !== null)
            .map(async (e) => {
              e.ranking = await readReleasedRanking(actor.id, e.id);
            }),
        );
      return list;
    },
  };
}
