import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { demoState, DEMO_TEACHER } from "../demo/seed";
import { mode, supabaseServerConfig } from "./config";
import { AppError, ensure } from "../domain/errors";
import { TABLES, type Profile, type State } from "../types";
import { snapshotSchema, stateSchema } from "../state-schema";
import { curriculumTopics } from "../curriculum/catalog";
import { LEGACY_ENRICHMENT } from "../subjects";
import { prepareDemoQuestions } from "./demo-curriculum";
function upgradeDemoTopics(state: State) {
  for (const t of state.topics)
    if (LEGACY_ENRICHMENT.has(t.slug)) t.curriculum_track = "pengayaan";
  for (const t of curriculumTopics())
    if (!state.topics.some((existing) => existing.slug === t.slug))
      state.topics.push(t);
  return prepareDemoQuestions(state);
}
export interface Repository {
  read(actor: Profile): Promise<State>;
  transact<T>(actor: Profile, fn: (state: State) => T): Promise<T>;
  joinClass(actor: Profile, code: string): Promise<void>;
}
export function scopeState(state: State, actor: Profile): State {
  const classes = state.classes.filter((c) =>
    actor.role === "teacher"
      ? c.teacher_id === actor.id
      : state.class_members.some(
          (m) => m.class_id === c.id && m.student_id === actor.id,
        ),
  );
  const members = state.class_members.filter(
    (m) =>
      classes.some((c) => c.id === m.class_id) &&
      (actor.role === "teacher" || m.student_id === actor.id),
  );
  const students = new Set(
    actor.role === "student" ? [actor.id] : members.map((m) => m.student_id),
  );
  const teachers = new Set(classes.map((c) => c.teacher_id));
  return {
    ...state,
    profiles: state.profiles.filter(
      (p) => p.id === actor.id || students.has(p.id),
    ),
    classes,
    class_members: members,
    questions: state.questions.filter(
      (q) =>
        q.created_by !== null &&
        (actor.role === "teacher"
          ? q.created_by === actor.id
          : teachers.has(q.created_by)),
    ),
    attempts: state.attempts.filter((a) => students.has(a.student_id)),
    mastery: state.mastery.filter((m) => students.has(m.student_id)),
    quiz_sessions: state.quiz_sessions.filter((s) =>
      students.has(s.student_id),
    ),
  };
}
type Runtime = { queue: Promise<unknown>; secret: string };
const globalRuntime = globalThis as typeof globalThis & {
  adaptivaRuntime?: Runtime;
};
export const runtime = (globalRuntime.adaptivaRuntime ??= {
  queue: Promise.resolve(),
  secret: crypto.randomUUID() + crypto.randomUUID(),
});
const dataPath = () => path.join(process.cwd(), ".data", "demo.json");
async function readDemo(): Promise<State> {
  try {
    const state = stateSchema.parse(
      JSON.parse(await readFile(dataPath(), "utf8")),
    );
    // Migrasi fixture lokal lama saja; tidak pernah berjalan pada database sekolah.
    const fixtureIds = new Set(demoState().questions.map((q) => q.id));
    for (const question of state.questions) {
      if (question.created_by === null && fixtureIds.has(question.id))
        question.created_by = DEMO_TEACHER;
    }
    return upgradeDemoTopics(state);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT")
      throw new AppError(
        "Data demo tidak dapat dibaca. Periksa .data/demo.json.",
        503,
      );
    const state = upgradeDemoTopics(demoState());
    await saveDemo(state);
    return state;
  }
}
async function saveDemo(state: State) {
  await mkdir(path.dirname(dataPath()), { recursive: true });
  const temporary = `${dataPath()}.tmp`;
  await writeFile(temporary, JSON.stringify(state), {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporary, dataPath());
}
async function locked<T>(fn: () => Promise<T>): Promise<T> {
  const next = runtime.queue.then(fn, fn);
  runtime.queue = next.catch(() => undefined);
  return next;
}
export const demoRepository: Repository = {
  joinClass: async (actor, code) => {
    await demoRepository.transact(actor, (state) => {
      const room = state.classes.find((c) => c.class_code === code);
      ensure(room, "Kode kelas tidak ditemukan.", 404);
      if (
        !state.class_members.some(
          (m) => m.class_id === room.id && m.student_id === actor.id,
        )
      )
        state.class_members.push({
          class_id: room.id,
          student_id: actor.id,
          joined_at: new Date().toISOString(),
        });
    });
  },
  read: (actor) => locked(async () => scopeState(await readDemo(), actor)),
  transact: (actor, fn) =>
    locked(async () => {
      const state = await readDemo();
      ensure(
        state.profiles.some((p) => p.id === actor.id && p.role === actor.role),
        "Akun demo tidak ditemukan.",
        401,
      );
      const result = fn(state);
      await saveDemo(state);
      return result;
    }),
};
// Hanya dipanggil setelah requireActor(); tidak diekspor ke Route Handler.
function administrativeClient() {
  const { url, key } = supabaseServerConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
interface Snapshot {
  revision: number;
  state: State;
}
async function snapshot(actor: Profile): Promise<Snapshot> {
  const { data, error } = await administrativeClient().rpc(
    "read_assessment_state",
    { actor_id: actor.id },
  );
  if (error) {
    console.error("assessment_database_read_failed", { code: error.code });
    throw new AppError(
      "Database belum siap atau tidak dapat diakses. Periksa migration dan konfigurasi server.",
      503,
    );
  }
  const parsed = snapshotSchema.safeParse(data);
  ensure(
    parsed.success,
    "Format data database tidak sesuai. Periksa versi migration.",
    503,
  );
  const result = parsed.data;
  ensure(
    result?.state?.profiles?.some(
      (p) => p.id === actor.id && p.role === actor.role,
    ),
    "Sesi tidak valid.",
    401,
  );
  return result;
}
export const supabaseRepository: Repository = {
  joinClass: async (actor, code) => {
    const { error } = await administrativeClient().rpc(
      "join_assessment_class",
      { actor_id: actor.id, code },
    );
    if (error)
      throw new AppError(
        "Kode kelas tidak ditemukan atau keanggotaan tidak dapat disimpan.",
        400,
      );
  },
  read: async (actor) => scopeState((await snapshot(actor)).state, actor),
  transact: async (actor, fn) => {
    for (let retry = 0; retry < 5; retry++) {
      const { revision, state } = await snapshot(actor);
      const original = structuredClone(state);
      const result = fn(state);
      const changes: Record<string, unknown> = {};
      for (const table of TABLES) {
        if (table === "topic_prerequisites") continue;
        const prior = new Set(
          original[table].map((row) => JSON.stringify(row)),
        );
        changes[table] = state[table].filter(
          (row) => !prior.has(JSON.stringify(row)),
        );
      }
      const changedTopics = state.topics
        .filter(
          (t) =>
            JSON.stringify(
              state.topic_prerequisites.filter((e) => e.topic_id === t.id),
            ) !==
            JSON.stringify(
              original.topic_prerequisites.filter((e) => e.topic_id === t.id),
            ),
        )
        .map((t) => t.id);
      changes.prerequisite_topics = changedTopics;
      changes.topic_prerequisites = state.topic_prerequisites.filter((e) =>
        changedTopics.includes(e.topic_id),
      );
      const { data, error } = await administrativeClient().rpc(
        "commit_assessment_state",
        { actor_id: actor.id, expected_revision: revision, changes },
      );
      if (error)
        throw new AppError(
          "Perubahan tidak dapat disimpan. Periksa konfigurasi database atau coba lagi.",
          503,
        );
      if (data === true) return result;
    }
    throw new AppError(
      "Data sedang diperbarui. Silakan kirim ulang jawaban yang sama; jawaban tidak akan dihitung ganda.",
      409,
    );
  },
};
export function repository(): Repository {
  return mode() === "demo" ? demoRepository : supabaseRepository;
}
