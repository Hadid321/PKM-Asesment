import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  demoState,
  DEMO_STUDENT,
  DEMO_TEACHER,
  OTHER_TEACHER,
} from "@/lib/demo/seed";
import { dashboard, execute, quizView } from "@/lib/server/assessment";
import { memoryRepository } from "./helpers";
const seed = demoState();
const student = seed.profiles.find((p) => p.id === DEMO_STUDENT)!;
const teacher = seed.profiles.find((p) => p.id === DEMO_TEACHER)!;
const csv =
  'topik,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,kesulitan,pembahasan\nlimit-fungsi,"Nilai lim x→4 (x+9) adalah …",11,12,13,14,C,mudah,"Substitusi x=4 menghasilkan 13."';
describe("Bank soal hanya dikelola guru kelas", () => {
  it("menolak upload siswa pada pratinjau dan commit", async () => {
    const { repo } = memoryRepository();
    for (const preview of [true, false])
      await expect(
        execute(repo, student, { action: "import", csv, preview }),
      ).rejects.toMatchObject({ status: 403 });
  });
  it("menolak siswa membuat atau menyunting soal", async () => {
    const { repo } = memoryRepository();
    const q = seed.questions[0];
    const question = {
      topic_id: q.topic_id,
      question_text: q.question_text,
      options: q.options,
      correct_option: q.correct_option,
      difficulty: q.difficulty,
      explanation: q.explanation,
    };
    await expect(
      execute(repo, student, { action: "save-question", question }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("guru mengimpor soal, identitas pembuat ditetapkan server, duplikat tidak ditambahkan", async () => {
    const { repo, state } = memoryRepository();
    const before = state().questions.length;
    await execute(repo, teacher, { action: "import", csv, preview: true });
    expect(state().questions).toHaveLength(before);
    await execute(repo, teacher, { action: "import", csv, preview: false });
    expect(state().questions.at(-1)?.created_by).toBe(teacher.id);
    await execute(repo, teacher, { action: "import", csv, preview: false });
    expect(state().questions).toHaveLength(before + 1);
  });
  it("file campuran valid-invalid dibatalkan seluruhnya", async () => {
    const { repo, state } = memoryRepository();
    const before = state().questions.length;
    await expect(
      execute(repo, teacher, {
        action: "import",
        csv: csv + "\ntopik-tidak-ada,Soal,1,2,3,4,A,mudah,Pembahasan",
        preview: false,
      }),
    ).rejects.toThrow("Impor dibatalkan");
    expect(state().questions).toHaveLength(before);
  });
  it("soal seed tanpa guru tidak dipakai latihan dan tetap tersimpan", async () => {
    const old = demoState();
    old.questions.forEach((q) => (q.created_by = null));
    const { repo, state } = memoryRepository(old);
    expect(
      (await dashboard(repo, student)).questionCounts.every(
        (q) => q.count === 0,
      ),
    ).toBe(true);
    await expect(
      execute(repo, student, { action: "start", topic_id: old.topics[0].id }),
    ).rejects.toThrow("Belum ada soal");
    expect(state().questions).toHaveLength(48);
    expect(state().attempts).toHaveLength(old.attempts.length);
  });
  it("siswa tanpa keanggotaan tidak memperoleh soal, tetapi riwayat sendiri tetap ada", async () => {
    const initial = demoState();
    initial.class_members = initial.class_members.filter(
      (m) => m.student_id !== student.id,
    );
    const { repo } = memoryRepository(initial);
    const data = await dashboard(repo, student);
    expect(data.questionCounts.every((q) => q.count === 0)).toBe(true);
    expect(data.attempts.length).toBeGreaterThan(0);
    await expect(
      execute(repo, student, {
        action: "start",
        topic_id: initial.topics[0].id,
      }),
    ).rejects.toThrow("Belum ada soal");
  });
  it("soal guru kelas lain tidak dapat dipilih atau diedit guru ini", async () => {
    const initial = demoState();
    const q = {
      ...initial.questions[0],
      id: randomUUID(),
      created_by: OTHER_TEACHER,
      question_text: "Pertanyaan guru lain",
    };
    initial.questions.push(q);
    const { repo } = memoryRepository(initial);
    expect(
      (await repo.read(student)).questions.some((x) => x.id === q.id),
    ).toBe(false);
    await expect(
      execute(repo, teacher, {
        action: "save-question",
        question: {
          id: q.id,
          topic_id: q.topic_id,
          question_text: q.question_text,
          options: q.options,
          correct_option: q.correct_option,
          difficulty: q.difficulty,
          explanation: q.explanation,
        },
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("sesi lama dari seed ditutup tanpa menghapus jawaban atau mengulang BKT", async () => {
    const { repo, state } = memoryRepository();
    const start = await execute(repo, student, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    const sid = "session_id" in start ? start.session_id! : "";
    const question = (await quizView(repo, student, sid)).question!;
    await execute(repo, student, {
      action: "answer",
      session_id: sid,
      question_id: question.id,
      selected_option: "A",
    });
    const before = state();
    await repo.transact(teacher, (draft) => {
      draft.questions.forEach((q) => (q.created_by = null));
    });
    const result = await quizView(repo, student, sid);
    expect(result.session.status).toBe("completed");
    expect(result.question).toBeNull();
    expect(result.attempts).toHaveLength(1);
    expect(state().mastery).toEqual(before.mastery);
    expect(state().attempts).toEqual(before.attempts);
  });
});
