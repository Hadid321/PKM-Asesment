import "server-only";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mode, supabaseServerConfig } from "./config";
import {
  applyFocus,
  focusView,
  newFocusControl,
  resumeFocus,
  type FocusControl,
  type FocusState,
} from "../assessment-focus";
import type { CbtState } from "../cbt/model";
import type { RankRow } from "./cbt/ranking";
import { AppError, ensure } from "../domain/errors";
import type {
  ActivityInput,
  Monitor,
  BriefRecord,
  LearningBrief,
} from "../assessment-support";
type LocalState = {
  controls?: Record<string, FocusControl>;
  actions?: Record<
    string,
    { sitting_id: string; teacher_id: string; reason: string }
  >;
  events: {
    id: string;
    sitting_id: string;
    kind: ActivityInput["events"][number]["kind"];
    received_at: string;
  }[];
  presence: Record<string, Monitor>;
  briefs: Record<string, BriefRecord>;
};
let queue: Promise<unknown> = Promise.resolve();
async function local<T>(fn: (state: LocalState) => T | Promise<T>) {
  const task = queue.then(async () => {
    const file = path.join(process.cwd(), ".data", "assessment-support.json");
    let state: LocalState;
    try {
      state = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      state = { events: [], presence: {}, briefs: {} };
    }
    const result = await fn(state);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file + ".tmp", JSON.stringify(state), { mode: 0o600 });
    await rename(file + ".tmp", file);
    return result;
  });
  queue = task.catch(() => undefined);
  return task;
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { url, key } = supabaseServerConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.rpc(name, args);
  if (error)
    throw new AppError(
      "Layanan pendamping asesmen belum dapat diakses. Coba lagi.",
      503,
    );
  return data as T;
}
export async function recordActivity(
  actorId: string,
  input: ActivityInput,
  enabled = false,
) {
  if (mode() !== "demo")
    return rpc<boolean>("record_assessment_activity", {
      actor_id: actorId,
      ...input,
    });
  return local((s) => {
    let count = s.events.filter(
      (e) => e.sitting_id === input.sitting_id,
    ).length;
    const fresh: ActivityInput["events"] = [];
    for (const e of input.events) {
      const old = s.events.find((x) => x.id === e.id);
      if (old) {
        ensure(
          old.sitting_id === input.sitting_id && old.kind === e.kind,
          "Identitas catatan sudah dipakai.",
          409,
        );
        continue;
      }
      if (count++ < 1000) {
        fresh.push(e);
        s.events.push({
          ...e,
          sitting_id: input.sitting_id,
          received_at: new Date().toISOString(),
        });
      }
    }
    if (enabled) {
      s.controls ??= {};
      const c = (s.controls[input.sitting_id] ??= newFocusControl());
      if (!applyFocus(c, { ...input, events: fresh }, Date.now())) return true;
    }
    const events = s.events.filter((e) => e.sitting_id === input.sitting_id);
    s.presence[input.sitting_id] = {
      ...input.presence,
      sitting_id: input.sitting_id,
      last_seen: new Date().toISOString(),
      left_count: events.filter((e) => e.kind === "left_assessment").length,
      hidden_count: events.filter((e) => e.kind === "hidden").length,
      blur_count: events.filter((e) => e.kind === "blur").length,
      fullscreen_exits: events.filter((e) => e.kind === "fullscreen_exit")
        .length,
      offline_count: events.filter((e) => e.kind === "offline").length,
      recent: events
        .slice(-10)
        .reverse()
        .map(({ kind, received_at }) => ({ kind, received_at })),
    };
    return true;
  });
}
export async function readMonitor(actorId: string, allowedIds: string[]) {
  if (mode() !== "demo")
    return rpc<Monitor[]>("read_assessment_monitor", { actor_id: actorId });
  return local((s) =>
    Object.values(s.presence).filter((p) => allowedIds.includes(p.sitting_id)),
  );
}
export type Claim =
  | { status: "claimed"; claim_id: string }
  | { status: "pending" }
  | { status: "ready"; brief: LearningBrief; source: "groq" | "template" };
export async function claimBrief(
  actorId: string,
  targetId: string,
  kind: "student" | "teacher",
): Promise<Claim> {
  if (mode() !== "demo")
    return rpc("claim_assessment_brief", {
      actor_id: actorId,
      target_id: targetId,
      kind,
    });
  return local((s) => {
    const key = kind + ":" + targetId;
    const old = s.briefs[key];
    if (old) {
      ensure(old.owner_id === actorId, "Hasil tidak ditemukan.", 404);
      if (old.status === "ready")
        return { status: "ready", brief: old.brief!, source: old.source! };
      if (Date.now() - Date.parse(old.claimed_at) < 90000)
        return { status: "pending" };
    }
    const claim_id = randomUUID();
    s.briefs[key] = {
      status: "pending",
      owner_id: actorId,
      claim_id,
      claimed_at: new Date().toISOString(),
    };
    return { status: "claimed", claim_id };
  });
}
export async function completeBrief(
  actorId: string,
  targetId: string,
  kind: "student" | "teacher",
  claimId: string,
  brief: LearningBrief,
  source: "groq" | "template",
) {
  if (mode() !== "demo")
    return rpc<boolean>("complete_assessment_brief", {
      actor_id: actorId,
      target_id: targetId,
      kind,
      claim_id: claimId,
      brief,
      source,
    });
  return local((s) => {
    const row = s.briefs[kind + ":" + targetId];
    if (
      !row ||
      row.owner_id !== actorId ||
      row.claim_id !== claimId ||
      row.status !== "pending"
    )
      return false;
    row.status = "ready";
    row.brief = brief;
    row.source = source;
    return true;
  });
}

export async function readFocus(
  actorId: string,
  ids: string[],
  enabledIds: string[],
) {
  if (mode() !== "demo")
    return rpc<(FocusState & { sitting_id: string })[]>(
      "read_assessment_focus",
      { actor_id: actorId, sitting_ids: ids },
    );
  return local((s) =>
    ids.map((id) => ({
      sitting_id: id,
      ...focusView(enabledIds.includes(id), s.controls?.[id]),
    })),
  );
}
export async function readReleasedRanking(actorId: string, examId: string) {
  return rpc<RankRow[] | null>("read_assessment_ranking", {
    actor_id: actorId,
    exam_id: examId,
  });
}
export async function unlockFocus(
  actorId: string,
  input: { sitting_id: string; request_id: string; reason: string },
) {
  if (mode() !== "demo")
    return rpc<boolean>("resume_assessment_focus", {
      actor_id: actorId,
      ...input,
    });
  return local((s) => {
    s.actions ??= {};
    const old = s.actions[input.request_id];
    if (old) {
      ensure(
        old.sitting_id === input.sitting_id &&
          old.teacher_id === actorId &&
          old.reason === input.reason,
        "Permintaan izin sudah dipakai.",
        409,
      );
      return true;
    }
    const c = s.controls?.[input.sitting_id];
    ensure(c?.locked, "Pengerjaan tidak sedang dihentikan.", 409);
    s.actions[input.request_id] = {
      sitting_id: input.sitting_id,
      teacher_id: actorId,
      reason: input.reason,
    };
    resumeFocus(c);
    return true;
  });
}
export function guardFocusWrites(
  next: CbtState,
  old: CbtState,
  commit: () => Promise<void>,
) {
  return local(async (s) => {
    for (const n of next.sittings) {
      const before = old.sittings.find((x) => x.id === n.id),
        e = next.exams.find((e) => e.id === n.exam_id);
      if (!e?.focus_guard || !before || !s.controls?.[n.id]?.locked) continue;
      ensure(
        JSON.stringify(n.answers) === JSON.stringify(before.answers) &&
          !(
            before.status === "active" &&
            n.status === "submitted" &&
            e.status !== "closed" &&
            Date.parse(before.deadline_at) > Date.now()
          ),
        "Pengerjaan dihentikan sementara. Hubungi guru untuk izin lanjut.",
        409,
      );
    }
    await commit();
  });
}
