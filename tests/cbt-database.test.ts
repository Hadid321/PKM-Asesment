import { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  demoState,
  DEMO_STUDENT,
  DEMO_TEACHER,
  OTHER_STUDENT,
  OTHER_TEACHER,
} from "@/lib/demo/seed";
import { curriculumTopics } from "@/lib/curriculum/catalog";
import { createCbtService } from "@/lib/server/cbt/engine";
import type { CbtRepository, CbtState } from "@/lib/cbt/model";
const context = demoState();
context.topics.push(...curriculumTopics());
const teacher = context.profiles.find((p) => p.id === DEMO_TEACHER)!;
const student = context.profiles.find((p) => p.id === DEMO_STUDENT)!;
let db: PGlite;
const mutation = "supabase/migrations/20261103121424_private_cbt_exams.sql";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema private; grant usage on schema public,private to service_role; create table public.profiles(id uuid primary key,role text); create table public.classes(id uuid primary key,teacher_id uuid); create table public.class_members(class_id uuid,student_id uuid); create table public.topics(id uuid primary key,subject text); create table private.app_revision(id integer primary key,revision bigint); insert into private.app_revision values(1,0); grant all on public.profiles,public.classes,public.class_members,public.topics,private.app_revision to service_role;",
  );
  for (const p of context.profiles)
    await db.query("insert into public.profiles values($1,$2)", [p.id, p.role]);
  for (const c of context.classes)
    await db.query("insert into public.classes values($1,$2)", [
      c.id,
      c.teacher_id,
    ]);
  for (const m of context.class_members)
    await db.query("insert into public.class_members values($1,$2)", [
      m.class_id,
      m.student_id,
    ]);
  for (const t of context.topics)
    await db.query("insert into public.topics values($1,$2)", [
      t.id,
      t.subject,
    ]);
  await db.exec(
    "create table public.questions(id uuid primary key default gen_random_uuid(),question_text text,options jsonb); grant all on public.questions to service_role;",
  );
  await db.exec(await readFile(mutation, "utf8"));
  await db.exec(
    await readFile(
      "supabase/migrations/20261110063036_assessment_activity_and_learning_briefs.sql",
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/20261110112854_assessment_focus_guard.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
beforeEach(async () => {
  await db.exec(
    "reset role; delete from private.assessment_focus_actions; delete from private.assessment_focus_controls; delete from private.assessment_events; delete from private.assessment_presence; delete from private.assessment_briefs; delete from private.cbt_sittings; delete from private.cbt_exams; delete from public.questions; update private.app_revision set revision=0 where id=1;",
  );
});
async function snapshot(actor: string) {
  const r = await db.query<{ data: { revision: number; state: CbtState } }>(
    "select public.read_cbt_state($1) as data",
    [actor],
  );
  return r.rows[0].data;
}
async function commit(actor: string, revision: number, changes: unknown) {
  return (
    await db.query<{ ok: boolean }>(
      "select public.commit_cbt_state($1,$2,$3) as ok",
      [actor, revision, JSON.stringify(changes)],
    )
  ).rows[0].ok;
}
function repo(actor: string): CbtRepository {
  return {
    transact: async (fn) => {
      const before = await snapshot(actor);
      const state = structuredClone(before.state);
      const r = fn(state);
      const changes = {
        exams: state.exams.filter(
          (x) =>
            !before.state.exams.some(
              (y) => JSON.stringify(x) === JSON.stringify(y),
            ),
        ),
        sittings: state.sittings.filter(
          (x) =>
            !before.state.sittings.some(
              (y) => JSON.stringify(x) === JSON.stringify(y),
            ),
        ),
      };
      if (changes.exams.length || changes.sittings.length)
        expect(await commit(actor, before.revision, changes)).toBe(true);
      return r;
    },
  };
}
describe("Penyimpanan CBT privat", () => {
  async function fixture() {
    await db.exec("set role service_role");
    const t = createCbtService(repo(teacher.id), context, teacher);
    await t.execute({
      action: "publish",
      reviewed: true,
      class_id: context.classes[0].id,
      subject: "matematika",
      title: "Asesmen dukungan",
      duration_minutes: 45,
    });
    const exam = (await snapshot(teacher.id)).state.exams[0];
    const studentService = createCbtService(repo(student.id), context, student);
    const start = await studentService.execute({
      action: "start",
      exam_id: exam.id,
      code: exam.access_code,
    });
    return { t, exam, sitting: start.sitting_id! };
  }
  it("aktivitas terisolasi, idempotent, tidak mengubah versi jawaban dan berhenti setelah ditutup", async () => {
    const f = await fixture(),
      event = { id: crypto.randomUUID(), kind: "hidden" };
    const presence = {
      visible: false,
      focused: false,
      online: true,
      fullscreen: false,
    };
    const send = (actor: string, e = event) =>
      db.query<{ accepted: boolean }>(
        "select public.record_assessment_activity($1,$2,$3,$4) as accepted",
        [actor, f.sitting, JSON.stringify([e]), JSON.stringify(presence)],
      );
    await expect(send(OTHER_STUDENT)).rejects.toThrow(/forbidden/);
    const version = (await snapshot(student.id)).state.sittings[0].version;
    expect((await send(student.id)).rows[0].accepted).toBe(true);
    await send(student.id);
    await expect(
      send(student.id, { ...event, kind: "visible" }),
    ).rejects.toThrow(/ID reused/);
    const read = (actor: string) =>
      db.query<{ data: { hidden_count: number; last_seen: string }[] }>(
        "select public.read_assessment_monitor($1) as data",
        [actor],
      );
    const first = (await read(teacher.id)).rows[0].data;
    expect(first[0].hidden_count).toBe(1);
    expect((await read(teacher.id)).rows[0].data[0].last_seen).toBe(
      first[0].last_seen,
    );
    expect((await read(OTHER_TEACHER)).rows[0].data).toEqual([]);
    expect((await snapshot(student.id)).state.sittings[0].version).toBe(
      version,
    );
    await f.t.execute({ action: "close", exam_id: f.exam.id });
    expect(
      (await send(student.id, { ...event, id: crypto.randomUUID() })).rows[0]
        .accepted,
    ).toBe(false);
  });
  it("cache AI memeriksa akses dan rilis, klaim tunggal, serta pemulihan lease", async () => {
    const f = await fixture();
    const claim = (actor: string, id: string, kind: string) =>
      db.query<{ data: { status: string; claim_id: string } }>(
        "select public.claim_assessment_brief($1,$2,$3) as data",
        [actor, id, kind],
      );
    await expect(claim(student.id, f.sitting, "student")).rejects.toThrow(
      /forbidden/,
    );
    await expect(claim(teacher.id, f.exam.id, "teacher")).rejects.toThrow(
      /forbidden/,
    );
    await f.t.execute({ action: "close", exam_id: f.exam.id });
    const first = (await claim(teacher.id, f.exam.id, "teacher")).rows[0].data;
    expect(first.status).toBe("claimed");
    expect(
      (await claim(teacher.id, f.exam.id, "teacher")).rows[0].data.status,
    ).toBe("pending");
    await db.query(
      "update private.assessment_briefs set claimed_at=clock_timestamp()-interval '100 seconds' where target_id=$1",
      [f.exam.id],
    );
    const next = (await claim(teacher.id, f.exam.id, "teacher")).rows[0].data;
    expect(next.status).toBe("claimed");
    expect(next.claim_id).not.toBe(first.claim_id);
    const finish = (id: string) =>
      db.query<{ ok: boolean }>(
        "select public.complete_assessment_brief($1,$2,'teacher',$3,$4,'template') as ok",
        [
          teacher.id,
          f.exam.id,
          id,
          JSON.stringify({
            overview: "Panduan asesmen",
            actions: [],
            reflection: "Diskusikan bersama guru.",
          }),
        ],
      );
    expect((await finish(first.claim_id)).rows[0].ok).toBe(false);
    expect((await finish(next.claim_id)).rows[0].ok).toBe(true);
    expect(
      (await claim(teacher.id, f.exam.id, "teacher")).rows[0].data.status,
    ).toBe("ready");
    await expect(claim(OTHER_TEACHER, f.exam.id, "teacher")).rejects.toThrow(
      /forbidden/,
    );
    await expect(claim(student.id, f.sitting, "student")).rejects.toThrow(
      /forbidden/,
    );
    await f.t.execute({ action: "release", exam_id: f.exam.id });
    expect(
      (await claim(student.id, f.sitting, "student")).rows[0].data.status,
    ).toBe("claimed");
    await expect(claim(OTHER_STUDENT, f.sitting, "student")).rejects.toThrow(
      /forbidden/,
    );
  });
  it("guard paket dan bank latihan berlaku lintas guru di database", async () => {
    const other = context.profiles.find((p) => p.id === OTHER_TEACHER)!;
    const room = {
      ...context.classes[0],
      id: crypto.randomUUID(),
      teacher_id: other.id,
      name: "Kelas lain",
      class_code: "LAIN-CBT",
    };
    const otherContext = structuredClone(context);
    otherContext.classes.push(room);
    await db.query("insert into public.classes values($1,$2)", [
      room.id,
      other.id,
    ]);
    await db.exec("set role service_role");
    const t1 = createCbtService(repo(teacher.id), context, teacher);
    const t2 = createCbtService(repo(other.id), otherContext, other);
    const a = await t1.execute({
      action: "publish",
      reviewed: true,
      class_id: context.classes[0].id,
      subject: "bahasa-inggris",
      title: "Lintas kelas pertama",
      duration_minutes: 45,
    });
    const b = await t2.execute({
      action: "publish",
      reviewed: true,
      class_id: room.id,
      subject: "bahasa-inggris",
      title: "Lintas kelas kedua",
      duration_minutes: 45,
    });
    await t1.execute({ action: "close", exam_id: a.exam_id });
    await expect(
      t1.execute({ action: "release", exam_id: a.exam_id }),
    ).rejects.toThrow(/CBT_PACKET_BUSY/);
    await t2.execute({ action: "close", exam_id: b.exam_id });
    await t1.execute({ action: "release", exam_id: a.exam_id });
    await expect(
      t2.execute({
        action: "publish",
        reviewed: true,
        class_id: room.id,
        subject: "bahasa-inggris",
        title: "Kunci sudah terbuka",
        duration_minutes: 45,
      }),
    ).rejects.toThrow(/CBT_PACKET_EXPOSED/);
    const question = t1.preview("bahasa-indonesia")[0];
    const practice = await db.query<{ id: string }>(
      "insert into public.questions(question_text,options) values($1,$2) returning id",
      [question.question_text, JSON.stringify(question.options)],
    );
    await expect(
      t2.execute({
        action: "publish",
        reviewed: true,
        class_id: room.id,
        subject: "bahasa-indonesia",
        title: "Overlap latihan guru lain",
        duration_minutes: 45,
      }),
    ).rejects.toThrow(/CBT_PRACTICE_OVERLAP/);
    await db.query("delete from public.questions where id=$1", [
      practice.rows[0].id,
    ]);
    await t2.execute({
      action: "publish",
      reviewed: true,
      class_id: room.id,
      subject: "bahasa-indonesia",
      title: "Ujian privat baru",
      duration_minutes: 45,
    });
    await expect(
      db.query(
        "insert into public.questions(question_text,options) values($1,$2)",
        [question.question_text, JSON.stringify(question.options)],
      ),
    ).rejects.toThrow(/CBT_ACTIVE_PRACTICE_OVERLAP/);
    const privateExam = (await snapshot(other.id)).state.exams.find(
      (e) => e.subject === "bahasa-indonesia",
    )!;
    await t2.execute({ action: "close", exam_id: privateExam.id });
    await expect(
      db.query(
        "insert into public.questions(question_text,options) values($1,$2)",
        [question.question_text, JSON.stringify(question.options)],
      ),
    ).rejects.toThrow(/CBT_ACTIVE_PRACTICE_OVERLAP/);
    await t2.execute({ action: "release", exam_id: privateExam.id });
    await db.query(
      "insert into public.questions(question_text,options) values($1,$2)",
      [question.question_text, JSON.stringify(question.options)],
    );
    await db.exec("reset role");
  });
  it("RPC dan snapshot kunci tidak dapat dibaca token siswa atau anonymous", async () => {
    for (const role of ["anon", "authenticated"]) {
      await db.exec("set role " + role);
      await expect(
        db.query("select * from private.assessment_events"),
      ).rejects.toThrow(/permission/);
      await expect(
        db.query("select public.read_assessment_monitor($1)", [DEMO_TEACHER]),
      ).rejects.toThrow(/permission/);
      await expect(
        db.query("select public.claim_assessment_brief($1,$1,'student')", [
          DEMO_STUDENT,
        ]),
      ).rejects.toThrow(/permission/);
      await expect(
        db.query("select public.read_cbt_state($1)", [DEMO_STUDENT]),
      ).rejects.toThrow(/permission/);
      await expect(db.query("select * from private.cbt_exams")).rejects.toThrow(
        /permission/,
      );
      await expect(
        db.query("select public.commit_cbt_state($1,0,'{}')", [DEMO_STUDENT]),
      ).rejects.toThrow(/permission/);
      await db.exec("reset role");
    }
  });
  it("service role dapat menyimpan ujian, jawaban, penutupan, dan rilis secara atomik", async () => {
    await db.exec("set role service_role");
    const t = createCbtService(repo(teacher.id), context, teacher);
    await t.execute({
      action: "publish",
      reviewed: true,
      class_id: context.classes[0].id,
      subject: "matematika",
      title: "Uji transaksi CBT",
      duration_minutes: 45,
    });
    const exam = (await snapshot(teacher.id)).state.exams[0];
    const s = createCbtService(repo(student.id), context, student);
    const start = await s.execute({
      action: "start",
      exam_id: exam.id,
      code: exam.access_code,
    });
    const view = await s.view(start.sitting_id!);
    await s.execute({
      action: "save",
      sitting_id: view.id,
      item_id: view.questions[0].id,
      option: "A",
      flagged: true,
      expected_version: 0,
    });
    expect((await s.view(view.id)).answered).toBe(1);
    await t.execute({ action: "close", exam_id: exam.id });
    expect((await s.view(view.id)).result).toBeNull();
    await t.execute({ action: "release", exam_id: exam.id });
    expect((await s.view(view.id)).result?.review).toHaveLength(24);
    await db.exec("reset role");
  });
  it("DB menolak pemalsuan kunci, kepemilikan, deadline, dan versi lama", async () => {
    await db.exec("set role service_role");
    const t = createCbtService(repo(teacher.id), context, teacher);
    await t.execute({
      action: "publish",
      reviewed: true,
      class_id: context.classes[0].id,
      subject: "matematika",
      title: "Uji invariansi CBT",
      duration_minutes: 45,
    });
    const source = (await snapshot(teacher.id)).state.exams[0];
    await createCbtService(repo(student.id), context, student).execute({
      action: "start",
      exam_id: source.id,
      code: source.access_code,
    });
    const teacherState = await snapshot(teacher.id);
    const exam = structuredClone(teacherState.state.exams[0]);
    exam.items[0].correct_option =
      exam.items[0].correct_option === "A" ? "B" : "A";
    await expect(
      commit(teacher.id, teacherState.revision, {
        exams: [exam],
        sittings: [],
      }),
    ).rejects.toThrow(/Immutable exam/);
    const before = await snapshot(student.id);
    const sitting = structuredClone(before.state.sittings[0]);
    sitting.deadline_at = new Date(Date.now() + 9999999).toISOString();
    sitting.version++;
    await expect(
      commit(student.id, before.revision, { exams: [], sittings: [sitting] }),
    ).rejects.toThrow(/Immutable sitting/);
    expect(
      await commit(student.id, before.revision - 1, {
        exams: [],
        sittings: [],
      }),
    ).toBe(false);
    const outsider = await snapshot(OTHER_STUDENT);
    expect(
      outsider.state.sittings.every((s) => s.student_id === OTHER_STUDENT),
    ).toBe(true);
    await db.exec("reset role");
  });
});

describe("Aturan fokus dan peringkat privat", () => {
  async function guarded() {
    await db.exec("set role service_role");
    const t = createCbtService(repo(teacher.id), context, teacher),
      u = createCbtService(repo(student.id), context, student);
    await t.execute({
      action: "publish",
      reviewed: true,
      focus_guard: true,
      class_id: context.classes[0].id,
      subject: "matematika",
      title: "Asesmen fokus",
      duration_minutes: 45,
    });
    const exam = (await snapshot(teacher.id)).state.exams[0];
    await expect(
      u.execute({ action: "start", exam_id: exam.id, code: exam.access_code }),
    ).rejects.toThrow(/setujui/);
    const { sitting_id: id } = await u.execute({
      action: "start",
      exam_id: exam.id,
      code: exam.access_code,
      acknowledge_policy: true,
    });
    const page = crypto.randomUUID();
    let sequence = 0;
    const send = (kinds: string[], visible = true) =>
      db.query("select public.record_assessment_activity($1,$2,$3,$4)", [
        student.id,
        id,
        JSON.stringify(
          kinds.map((kind) => ({ id: crypto.randomUUID(), kind })),
        ),
        JSON.stringify({
          visible,
          focused: visible,
          online: true,
          fullscreen: false,
          page_id: page,
          sequence: ++sequence,
        }),
      ]);
    const focus = async (actor = student.id) =>
      (
        await db.query<{
          data: {
            strikes: number;
            locked: boolean;
            version: number;
            total_strikes: number;
          }[];
        }>("select public.read_assessment_focus($1,$2) as data", [actor, [id]])
      ).rows[0].data;
    await send(["opened"]);
    return { t, u, exam, id: id!, send, focus };
  }
  it("tiga kejadian memblokir jawaban; izin guru mempertahankan riwayat", async () => {
    const f = await guarded(),
      view = await f.u.view(f.id),
      q = view.questions[0];
    await f.u.execute({
      action: "save",
      sitting_id: f.id,
      item_id: q.id,
      option: "A",
      flagged: false,
      expected_version: 0,
    });
    for (let i = 0; i < 3; i++) {
      await f.send(["left_assessment"], false);
      await f.send(["visible"]);
    }
    expect((await f.focus())[0]).toMatchObject({
      strikes: 3,
      total_strikes: 3,
      locked: true,
    });
    expect(await f.focus(OTHER_TEACHER)).toEqual([]);
    const save = {
      action: "save",
      sitting_id: f.id,
      item_id: q.id,
      option: "B",
      flagged: false,
      expected_version: 1,
    };
    await expect(f.u.execute(save)).rejects.toThrow(/ASSESSMENT_FOCUS_LOCKED/);
    await expect(
      f.u.execute({ action: "submit", sitting_id: f.id, expected_version: 1 }),
    ).rejects.toThrow(/ASSESSMENT_FOCUS_LOCKED/);
    // A forged end_reason cannot bypass the trigger.
    const before = await snapshot(student.id),
      forged = {
        ...before.state.sittings[0],
        status: "submitted",
        submitted_at: new Date().toISOString(),
        end_reason: "time",
        version: 2,
      };
    await expect(
      commit(student.id, before.revision, { exams: [], sittings: [forged] }),
    ).rejects.toThrow();
    const request = crypto.randomUUID(),
      args = [teacher.id, f.id, request, "Perangkat diperiksa pengawas"];
    await expect(
      db.query("select public.resume_assessment_focus($1,$2,$3,$4)", [
        OTHER_TEACHER,
        ...args.slice(1),
      ]),
    ).rejects.toThrow(/forbidden/);
    await db.query("select public.resume_assessment_focus($1,$2,$3,$4)", args);
    await db.query("select public.resume_assessment_focus($1,$2,$3,$4)", args);
    expect((await f.focus())[0]).toMatchObject({
      strikes: 0,
      total_strikes: 3,
      locked: false,
      version: 4,
    });
    await f.u.execute(save);
    expect(
      (await snapshot(student.id)).state.sittings[0].answers[q.id].option,
    ).toBe("B");
  });
  it("ketidakhadiran perlu konfirmasi; catatan berulang tidak menambah pelanggaran", async () => {
    const f = await guarded();
    await f.send(["hidden"], false);
    expect((await f.focus())[0].strikes).toBe(0);
    await f.send(["visible"]);
    await f.send(["hidden", "visible"]);
    expect((await f.focus())[0].strikes).toBe(0);
    await f.send(["hidden"], false);
    await db.exec(
      "reset role; update private.assessment_focus_controls set pending_since=clock_timestamp()-interval '3 seconds'; set role service_role;",
    );
    await f.send([], false);
    await f.send(["left_assessment"], false);
    expect((await f.focus())[0].strikes).toBe(1);
    await f.send(["visible", "blur", "offline", "fullscreen_exit"]);
    expect((await f.focus())[0].strikes).toBe(1);
  });
  it("penutupan mengumpulkan jawaban terkunci; peringkat menunggu rilis", async () => {
    const f = await guarded();
    const ranking = async (actor = student.id) =>
      (
        await db.query<{ data: unknown }>(
          "select public.read_assessment_ranking($1,$2) as data",
          [actor, f.exam.id],
        )
      ).rows[0].data;
    expect(await ranking()).toBeNull();
    for (let i = 0; i < 3; i++) {
      await f.send(["left_assessment"], false);
      await f.send(["visible"]);
    }
    await f.t.execute({ action: "close", exam_id: f.exam.id });
    expect((await snapshot(student.id)).state.sittings[0].status).toBe(
      "submitted",
    );
    await expect(
      db.query("select public.resume_assessment_focus($1,$2,$3,$4)", [
        teacher.id,
        f.id,
        crypto.randomUUID(),
        "Perangkat sudah diperiksa",
      ]),
    ).rejects.toThrow(/no longer active/);
    expect(await ranking()).toBeNull();
    await f.t.execute({ action: "release", exam_id: f.exam.id });
    expect(await ranking()).toEqual([
      { rank: 1, label: "Anda", score: 0, correct: 0, total: 24, is_you: true },
    ]);
    expect(await ranking(OTHER_STUDENT)).toBeNull();
  });
  it("commit jawaban lama yang tiba setelah pelanggaran ketiga ditolak", async () => {
    const f = await guarded(),
      old = await snapshot(student.id),
      changed = structuredClone(old.state.sittings[0]);
    changed.answers[changed.order[0]] = { option: "A", flagged: false };
    changed.version++;
    for (let i = 0; i < 3; i++) {
      await f.send(["left_assessment"], false);
      await f.send(["visible"]);
    }
    await expect(
      commit(student.id, old.revision, { exams: [], sittings: [changed] }),
    ).rejects.toThrow(/ASSESSMENT_FOCUS_LOCKED/);
    expect((await snapshot(student.id)).state.sittings[0].answers).toEqual({});
  });
  it("batas waktu nyata tetap mengumpulkan pengerjaan yang dihentikan", async () => {
    const f = await guarded();
    for (let i = 0; i < 3; i++) {
      await f.send(["left_assessment"], false);
      await f.send(["visible"]);
    }
    await db.query(
      "update private.cbt_sittings set payload=jsonb_set(payload,'{deadline_at}',to_jsonb((clock_timestamp()-interval '1 second')::text)) where id=$1",
      [f.id],
    );
    await expect(
      db.query("select public.resume_assessment_focus($1,$2,$3,$4)", [
        teacher.id,
        f.id,
        crypto.randomUUID(),
        "Perangkat telah diperiksa",
      ]),
    ).rejects.toThrow(/no longer active/);
    expect((await f.u.view(f.id)).status).toBe("submitted");
  });
  it("ranking SQL menghitung pilihan yang diacak dan seri tanpa identitas teman", async () => {
    const f = await guarded(),
      snapshot0 = await snapshot(student.id),
      source = snapshot0.state.sittings[0],
      all = [];
    await db.exec("reset role");
    for (let i = 0; i < 101; i++) {
      const row = structuredClone(source);
      row.id = i ? crypto.randomUUID() : source.id;
      row.student_id = i ? crypto.randomUUID() : student.id;
      if (i) {
        await db.query("insert into public.profiles values($1,'student')", [
          row.student_id,
        ]);
        await db.query("insert into public.class_members values($1,$2)", [
          f.exam.class_id,
          row.student_id,
        ]);
      }
      row.started_at = new Date(
        Date.parse(source.started_at) + i * 1000,
      ).toISOString();
      row.policy_acknowledged_at = row.started_at;
      row.status = "submitted";
      row.submitted_at = new Date().toISOString();
      row.end_reason = "manual";
      row.version = 1;
      for (const id of row.order.slice(0, [4, 2, 2, 0][i] ?? 0)) {
        const q = f.exam.items.find((q) => q.id === id)!;
        row.answers[id] = {
          option: (["A", "B", "C", "D"] as const)[
            row.option_orders[id].indexOf(q.correct_option)
          ],
          flagged: false,
        };
      }
      await db.query(
        "insert into private.cbt_sittings values($1,$2,$3,$4) on conflict(id) do update set payload=excluded.payload",
        [row.id, row.exam_id, row.student_id, JSON.stringify(row)],
      );
      all.push(row);
    }
    await db.exec("set role service_role");
    await f.t.execute({ action: "close", exam_id: f.exam.id });
    await f.t.execute({ action: "release", exam_id: f.exam.id });
    const data = (
      await db.query<{
        data: { rank: number; correct: number; label: string }[];
      }>("select public.read_assessment_ranking($1,$2) as data", [
        student.id,
        f.exam.id,
      ])
    ).rows[0].data;
    expect(data.slice(0, 4).map((r) => r.rank)).toEqual([1, 2, 2, 4]);
    expect(data).toHaveLength(101);
    expect(new Set(data.map((r) => r.label)).size).toBe(101);
    expect(data.some((r) => r.label === "Peserta 100")).toBe(true);
    expect(data.slice(0, 4).map((r) => r.correct)).toEqual([4, 2, 2, 0]);
    expect(data[0].label).toBe("Anda");
    for (const row of all)
      expect(JSON.stringify(data)).not.toContain(row.student_id);
  });
  it("RLS dan hak fungsi baru tetap tertutup bagi token browser", async () => {
    const access = await db.query<{
      name: string;
      rls: boolean;
      anon: boolean;
      student: boolean;
    }>(
      "select c.relname as name,c.relrowsecurity as rls,has_table_privilege('anon',c.oid,'SELECT') as anon,has_table_privilege('authenticated',c.oid,'SELECT') as student from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('assessment_focus_controls','assessment_focus_actions')",
    );
    expect(access.rows).toHaveLength(2);
    for (const row of access.rows)
      expect(row).toMatchObject({ rls: true, anon: false, student: false });
    for (const signature of [
      "public.read_assessment_focus(uuid,uuid[])",
      "public.resume_assessment_focus(uuid,uuid,uuid,text)",
      "public.read_assessment_ranking(uuid,uuid)",
    ]) {
      const permissions = (
        await db.query<{ anon: boolean; student: boolean; server: boolean }>(
          "select has_function_privilege('anon',$1,'EXECUTE') as anon,has_function_privilege('authenticated',$1,'EXECUTE') as student,has_function_privilege('service_role',$1,'EXECUTE') as server",
          [signature],
        )
      ).rows[0];
      expect(permissions).toEqual({
        anon: false,
        student: false,
        server: true,
      });
    }
  });
  it("kembali tanpa heartbeat tetap terhitung setelah grace server", async () => {
    const f = await guarded();
    await f.send(["hidden"], false);
    await db.query(
      "update private.assessment_focus_controls set pending_since=clock_timestamp()-interval '10 seconds' where sitting_id=$1",
      [f.id],
    );
    await f.send(["visible"]);
    expect((await f.focus())[0].strikes).toBe(1);
  });
});
