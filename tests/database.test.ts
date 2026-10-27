import { PGlite } from "@electric-sql/pglite";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { readFile } from "node:fs/promises";
import {
  demoState,
  DEMO_STUDENT,
  DEMO_TEACHER,
  OTHER_TEACHER,
} from "@/lib/demo/seed";
import type { State } from "@/lib/types";
import { TABLES } from "@/lib/types";
import { snapshotSchema } from "@/lib/state-schema";
import { execute } from "@/lib/server/assessment";
import { memoryRepository } from "./helpers";
const seed = demoState();
let db: PGlite;
async function asUser(id: string) {
  await db.exec("set local role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [id]);
}
async function asService() {
  await db.exec("reset role; set local role service_role");
}
async function stateFor(id: string) {
  const result = await db.query<{ data: { revision: number; state: State } }>(
    "select public.read_assessment_state($1) as data",
    [id],
  );
  return snapshotSchema.parse(result.rows[0].data);
}
function diff(before: State, after: State) {
  const changes: Record<string, unknown> = {};
  for (const table of TABLES) {
    if (table !== "topic_prerequisites")
      changes[table] = after[table].filter(
        (row) =>
          !before[table].some((r) => JSON.stringify(r) === JSON.stringify(row)),
      );
  }
  changes.prerequisite_topics = [];
  changes.topic_prerequisites = [];
  return changes;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; grant usage on schema public to anon,authenticated,service_role;
    create schema auth; grant usage on schema auth to anon,authenticated,service_role;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.exec(
    await readFile(
      "supabase/migrations/20261023104730_assessment_core.sql",
      "utf8",
    ),
  );
  for (const p of seed.profiles) {
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
      [p.id, JSON.stringify({ full_name: p.full_name, role: "teacher" })],
    );
    await db.query("update public.profiles set role=$1 where id=$2", [
      p.role,
      p.id,
    ]);
  }
  for (const table of [
    "topics",
    "topic_prerequisites",
    "questions",
    "classes",
    "class_members",
    "quiz_sessions",
    "attempts",
    "mastery",
  ] as const) {
    await db.query(
      `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table},$1::jsonb)`,
      [JSON.stringify(seed[table])],
    );
  }
  await db.exec(
    await readFile(
      "supabase/migrations/20261023123926_teacher_managed_question_bank.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261027034148_required_subjects_grade12.sql",
      "utf8",
    ),
  );
}, 60000);
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});
afterAll(async () => {
  await db?.close();
});
describe("Migration dan RLS pada PostgreSQL lokal PGlite", () => {
  it("migration tiga mapel menjaga topik lama dan menandai kalkulus sebagai pengayaan", async () => {
    const topics = await db.query<{ subject: string; count: number }>(
      "select subject,count(*)::integer as count from public.topics group by subject order by subject",
    );
    expect(topics.rows).toEqual([
      { subject: "bahasa-indonesia", count: 4 },
      { subject: "bahasa-inggris", count: 4 },
      { subject: "matematika", count: 8 },
    ]);
    expect(
      (
        await db.query(
          "select id from public.topics where curriculum_track='pengayaan'",
        )
      ).rows,
    ).toHaveLength(3);
    expect(
      (await db.query("select id from public.questions")).rows,
    ).toHaveLength(seed.questions.length);
  });
  it("database menolak prasyarat lintas mapel", async () => {
    await asService();
    await expect(
      db.query(
        "insert into public.topic_prerequisites(topic_id,prerequisite_topic_id) select a.id,b.id from public.topics a cross join public.topics b where a.slug='ing-narrative-reading' and b.slug='mtk-busur-juring'",
      ),
    ).rejects.toThrow("mapel");
  });
  it("klasifikasi topik tidak dapat mengubah arti riwayat", async () => {
    await asService();
    await expect(
      db.query(
        "update public.topics set subject='bahasa-inggris' where slug='peluang-kejadian'",
      ),
    ).rejects.toThrow("Mapel");
  });
  it("RPC tetap menyimpan topik Bahasa Inggris dengan metadata baru", async () => {
    await asService();
    const snapshot = await stateFor(DEMO_TEACHER);
    const { repo, state } = memoryRepository(snapshot.state);
    await execute(
      repo,
      snapshot.state.profiles.find((p) => p.id === DEMO_TEACHER)!,
      {
        action: "import-curriculum",
        subject: "bahasa-inggris",
        reviewed: true,
      },
    );
    const changes = diff(snapshot.state, state());
    const result = await db.query<{ ok: boolean }>(
      "select public.commit_assessment_state($1,$2,$3::jsonb) as ok",
      [DEMO_TEACHER, snapshot.revision, JSON.stringify(changes)],
    );
    expect(result.rows[0].ok).toBe(true);
    const imported = (await stateFor(DEMO_TEACHER)).state.questions.filter(
      (q) => q.explanation.includes("kelas12-2026-10-27"),
    );
    expect(imported).toHaveLength(24);
    expect(imported.every((q) => q.created_by === DEMO_TEACHER)).toBe(true);
  });
  it("seed lama tidak dihapus dan tidak ikut snapshot siswa maupun bank guru", async () => {
    const legacy = {
      ...seed.questions[0],
      id: crypto.randomUUID(),
      created_by: null,
    };
    await db.query(
      "insert into public.questions select (jsonb_populate_record(null::public.questions,$1::jsonb)).*",
      [JSON.stringify(legacy)],
    );
    await asService();
    expect(
      (await stateFor(DEMO_STUDENT)).state.questions.some(
        (q) => q.id === legacy.id,
      ),
    ).toBe(false);
    expect(
      (await stateFor(DEMO_TEACHER)).state.questions.some(
        (q) => q.id === legacy.id,
      ),
    ).toBe(false);
    expect(
      (
        await db.query("select id from public.questions where id=$1", [
          legacy.id,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("database menolak sesi yang menerbitkan soal seed tanpa guru", async () => {
    const legacy = {
      ...seed.questions[0],
      id: crypto.randomUUID(),
      created_by: null,
    };
    await db.query(
      "insert into public.questions select (jsonb_populate_record(null::public.questions,$1::jsonb)).*",
      [JSON.stringify(legacy)],
    );
    await asService();
    await expect(
      db.query(
        "insert into public.quiz_sessions(id,student_id,topic_id,current_question_id,status) values($1,$2,$3,$4,'active')",
        [crypto.randomUUID(), DEMO_STUDENT, legacy.topic_id, legacy.id],
      ),
    ).rejects.toThrow("Soal harus berasal dari guru kelas siswa");
  });
  it("guru tidak mendapat izin INSERT langsung ke questions", async () => {
    await asUser(DEMO_TEACHER);
    await expect(
      db.exec("insert into public.questions default values"),
    ).rejects.toThrow(/permission denied/i);
  });
  it("siswa hanya dapat membaca rekam asesmen dan profil sendiri", async () => {
    await asUser(DEMO_STUDENT);
    const r = await db.query<{ student_id: string }>(
      "select student_id from public.attempts",
    );
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.rows.every((a) => a.student_id === DEMO_STUDENT)).toBe(true);
    const p = await db.query("select * from public.profiles");
    expect(p.rows).toHaveLength(1);
  });
  it("siswa tidak mendapat bank soal atau kunci dari Data API", async () => {
    await asUser(DEMO_STUDENT);
    expect(
      (await db.query("select * from public.questions")).rows,
    ).toHaveLength(0);
  });
  it("siswa tidak dapat mengubah role", async () => {
    await asUser(DEMO_STUDENT);
    await expect(
      db.query("update public.profiles set role='teacher' where id=$1", [
        DEMO_STUDENT,
      ]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("siswa dapat memperbarui nama sendiri", async () => {
    await asUser(DEMO_STUDENT);
    await db.query(
      "update public.profiles set full_name='Nama Baru' where id=$1",
      [DEMO_STUDENT],
    );
    expect(
      (
        await db.query<{ full_name: string }>(
          "select full_name from public.profiles",
        )
      ).rows[0].full_name,
    ).toBe("Nama Baru");
  });
  it("mastery tidak dapat ditulis client", async () => {
    await asUser(DEMO_STUDENT);
    await expect(
      db.query("update public.mastery set p_l=1 where student_id=$1", [
        DEMO_STUDENT,
      ]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("penilaian tidak dapat ditulis client", async () => {
    await asUser(DEMO_STUDENT);
    await expect(
      db.exec("update public.attempts set is_correct=true"),
    ).rejects.toThrow(/permission denied/i);
  });
  it("guru lain tidak dapat membaca kelas atau siswa guru demo", async () => {
    await asUser(OTHER_TEACHER);
    expect((await db.query("select * from public.classes")).rows).toHaveLength(
      0,
    );
    expect((await db.query("select * from public.attempts")).rows).toHaveLength(
      0,
    );
  });
  it("guru pemilik dapat membaca hasil anggota kelas", async () => {
    await asUser(DEMO_TEACHER);
    expect((await db.query("select * from public.attempts")).rows).toHaveLength(
      15,
    );
  });
  it("anon tidak dapat membaca asesmen", async () => {
    await db.exec("set local role anon");
    await expect(db.exec("select * from public.attempts")).rejects.toThrow(
      /permission denied/i,
    );
  });
  it("RPC administratif ditolak untuk authenticated", async () => {
    await asUser(DEMO_STUDENT);
    await expect(
      db.query("select public.read_assessment_state($1)", [DEMO_STUDENT]),
    ).rejects.toThrow(/permission denied/i);
  });
  it("metadata signup tidak dapat membuat guru", async () => {
    const newId = crypto.randomUUID();
    await db.query(
      "insert into auth.users(id,raw_user_meta_data) values($1,$2)",
      [newId, JSON.stringify({ full_name: "Siswa Baru", role: "teacher" })],
    );
    expect(
      (
        await db.query<{ role: string }>(
          "select role from public.profiles where id=$1",
          [newId],
        )
      ).rows[0].role,
    ).toBe("student");
  });
  it("database menolak prasyarat melingkar", async () => {
    await expect(
      db.query("insert into public.topic_prerequisites values($1,$2)", [
        seed.topics[0].id,
        seed.topics[2].id,
      ]),
    ).rejects.toThrow(/melingkar/i);
  });
  it("fungsi transaksi menyimpan sesi, jawaban dan mastery secara atomik serta menolak revision lama", async () => {
    await asService();
    const actor = seed.profiles.find((p) => p.id === DEMO_STUDENT)!;
    const initial = await stateFor(actor.id);
    const store = memoryRepository(initial.state);
    const start = await execute(store.repo, actor, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    const sid = "session_id" in start ? start.session_id! : "";
    const changes = diff(initial.state, store.state());
    const commit = await db.query<{ ok: boolean }>(
      "select public.commit_assessment_state($1,$2,$3::jsonb) as ok",
      [actor.id, initial.revision, JSON.stringify(changes)],
    );
    expect(commit.rows[0].ok).toBe(true);
    const stale = await db.query<{ ok: boolean }>(
      "select public.commit_assessment_state($1,$2,$3::jsonb) as ok",
      [actor.id, initial.revision, JSON.stringify(changes)],
    );
    expect(stale.rows[0].ok).toBe(false);
    const current = await stateFor(actor.id);
    const second = memoryRepository(current.state);
    const session = current.state.quiz_sessions.find((s) => s.id === sid)!;
    const q = current.state.questions.find(
      (q) => q.id === session.current_question_id,
    )!;
    await execute(second.repo, actor, {
      action: "answer",
      session_id: sid,
      question_id: q.id,
      selected_option: q.correct_option,
    });
    await db.query("select public.commit_assessment_state($1,$2,$3::jsonb)", [
      actor.id,
      current.revision,
      JSON.stringify(diff(current.state, second.state())),
    ]);
    const final = await stateFor(actor.id);
    expect(
      final.state.attempts.filter((a) => a.session_id === sid),
    ).toHaveLength(1);
    expect(
      final.state.mastery.find((m) => m.topic_id === q.topic_id)?.p_l,
    ).toBe(0.69268293);
    expect(
      final.state.quiz_sessions.find((s) => s.id === sid)?.current_question_id,
    ).not.toBe(q.id);
  });
  it("join par code tidak menggandakan anggota", async () => {
    await asService();
    await db.query("select public.join_assessment_class($1,$2)", [
      DEMO_STUDENT,
      "DEMO-XII",
    ]);
    expect(
      (
        await db.query(
          "select * from public.class_members where student_id=$1",
          [DEMO_STUDENT],
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("unique constraint menolak jawaban kedua untuk sesi–soal yang sama", async () => {
    await asService();
    const a = { ...seed.attempts[0], id: crypto.randomUUID() };
    await expect(
      db.query(
        "insert into public.attempts select (jsonb_populate_record(null::public.attempts,$1::jsonb)).*",
        [JSON.stringify(a)],
      ),
    ).rejects.toThrow(/duplicate key/i);
  });
  it("kegagalan commit membatalkan seluruh perubahan sebelumnya", async () => {
    await asService();
    const before = await stateFor(DEMO_STUDENT);
    const changes = {
      profiles: [{ ...seed.profiles[0], full_name: "Tidak boleh tersimpan" }],
      attempts: [{ ...seed.attempts[0], id: crypto.randomUUID() }],
    };
    await db.exec("savepoint failed_commit");
    await expect(
      db.query("select public.commit_assessment_state($1,$2,$3::jsonb)", [
        DEMO_STUDENT,
        before.revision,
        JSON.stringify(changes),
      ]),
    ).rejects.toThrow();
    await db.exec("rollback to savepoint failed_commit");
    const after = await stateFor(DEMO_STUDENT);
    expect(after.revision).toBe(before.revision);
    expect(after.state.profiles[0].full_name).toBe(
      before.state.profiles[0].full_name,
    );
  });
});
