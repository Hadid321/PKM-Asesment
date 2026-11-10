import "server-only";
import { randomUUID } from "node:crypto";
import { readFile, mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mode, supabaseServerConfig } from "./config";
import { AppError, ensure } from "../domain/errors";
import type {
  ActivityInput,
  Monitor,
  BriefRecord,
  LearningBrief,
} from "../assessment-support";
type LocalState = {
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
async function local<T>(fn: (state: LocalState) => T) {
  const task = queue.then(async () => {
    const file = path.join(process.cwd(), ".data", "assessment-support.json");
    let state: LocalState;
    try {
      state = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      state = { events: [], presence: {}, briefs: {} };
    }
    const result = fn(state);
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
export async function recordActivity(actorId: string, input: ActivityInput) {
  if (mode() !== "demo")
    return rpc<boolean>("record_assessment_activity", {
      actor_id: actorId,
      ...input,
    });
  return local((s) => {
    let count = s.events.filter(
      (e) => e.sitting_id === input.sitting_id,
    ).length;
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
      if (count++ < 1000)
        s.events.push({
          ...e,
          sitting_id: input.sitting_id,
          received_at: new Date().toISOString(),
        });
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
