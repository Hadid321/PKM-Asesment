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
          const result = fn(state);
          if (JSON.stringify(state) !== before) {
            await mkdir(path.dirname(file), { recursive: true });
            await writeFile(file + ".tmp", JSON.stringify(state), {
              mode: 0o600,
            });
            await rename(file + ".tmp", file);
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
  ensure(cbtEnabled(), "Ujian CBT sedang disiapkan oleh panitia.", 503);
  const context = await repository().read(actor);
  return createCbtService(cbtRepository(actor), context, actor);
}
