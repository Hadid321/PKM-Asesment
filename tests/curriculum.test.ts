import { describe, expect, it } from "vitest";
import {
  CURRICULUM_QUESTIONS,
  curriculumPackage,
} from "@/lib/server/curriculum-content";
import { CURRICULUM_TOPICS, curriculumTopics } from "@/lib/curriculum/catalog";
import { SUBJECTS, selectedSubject } from "@/lib/subjects";
import { questionInput, operationInput } from "@/lib/validation";
import {
  demoState,
  DEMO_TEACHER,
  DEMO_STUDENT,
  OTHER_TEACHER,
} from "@/lib/demo/seed";
import { dashboard, execute, quizView } from "@/lib/server/assessment";
import { memoryRepository } from "./helpers";
const seed = demoState();
const teacher = seed.profiles.find((p) => p.id === DEMO_TEACHER)!;
const student = seed.profiles.find((p) => p.id === DEMO_STUDENT)!;
describe("Paket kelas XII dan pemisahan mapel", () => {
  it("memuat 72 soal unik, 12 topik, 24 soal per mapel dengan seluruh tingkat kesulitan", () => {
    expect(CURRICULUM_TOPICS).toHaveLength(12);
    expect(CURRICULUM_QUESTIONS).toHaveLength(72);
    expect(new Set(CURRICULUM_QUESTIONS.map((q) => q.code)).size).toBe(72);
    expect(new Set(CURRICULUM_QUESTIONS.map((q) => q.question_text)).size).toBe(
      72,
    );
    for (const subject of SUBJECTS)
      expect(curriculumPackage(subject).questions).toHaveLength(24);
    for (const topic of CURRICULUM_TOPICS) {
      const questions = CURRICULUM_QUESTIONS.filter(
        (q) => q.topic_slug === topic.slug,
      );
      for (const difficulty of ["easy", "medium", "hard"])
        expect(
          questions.filter((q) => q.difficulty === difficulty),
        ).toHaveLength(2);
      expect(topic.source_ids.length).toBeGreaterThan(0);
      for (const q of questions)
        expect(
          questionInput.safeParse({
            topic_id: curriculumTopics().find((t) => t.slug === topic.slug)!.id,
            question_text: q.question_text,
            options: q.options,
            correct_option: q.correct_option,
            explanation: q.explanation,
            difficulty: q.difficulty,
          }).success,
        ).toBe(true);
    }
  });
  it("menolak impor siswa dan permintaan tanpa pengakuan peninjauan", async () => {
    const { repo } = memoryRepository();
    await expect(
      execute(repo, student, {
        action: "import-curriculum",
        subject: "matematika",
        reviewed: true,
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      operationInput.safeParse({
        action: "import-curriculum",
        subject: "matematika",
        reviewed: false,
      }).success,
    ).toBe(false);
  });
  it("impor guru atomik, menandai kepemilikan, tidak menggandakan, dan menjaga bank guru lain", async () => {
    const { repo, state } = memoryRepository();
    const other = seed.profiles.find((p) => p.id === OTHER_TEACHER)!;
    const before = state().questions.length;
    await execute(repo, teacher, {
      action: "import-curriculum",
      subject: "bahasa-inggris",
      reviewed: true,
    });
    expect(state().questions).toHaveLength(before + 24);
    expect(
      state()
        .questions.slice(-24)
        .every((q) => q.created_by === teacher.id),
    ).toBe(true);
    await execute(repo, teacher, {
      action: "import-curriculum",
      subject: "bahasa-inggris",
      reviewed: true,
    });
    expect(state().questions).toHaveLength(before + 24);
    expect((await repo.read(other)).questions).toHaveLength(0);
    const own = await dashboard(repo, student, "bahasa-inggris");
    expect(own.topics).toHaveLength(4);
    expect(own.topics.every((t) => t.subject === "bahasa-inggris")).toBe(true);
    expect(own.questionCounts.reduce((n, q) => n + q.count, 0)).toBe(24);
    expect(own.attempts).toHaveLength(0);
  });
  it("menilai bahasa tanpa mengubah penguasaan matematika dan hanya mengirim DTO soal", async () => {
    const { repo, state } = memoryRepository();
    await execute(repo, teacher, {
      action: "import-curriculum",
      subject: "bahasa-indonesia",
      reviewed: true,
    });
    const topic = state().topics.find((t) => t.subject === "bahasa-indonesia")!;
    const priorMath = state().mastery;
    const start = await execute(repo, student, {
      action: "start",
      topic_id: topic.id,
    });
    const view = await quizView(repo, student, start.session_id!);
    expect(view.question).not.toHaveProperty("correct_option");
    expect(view.question).not.toHaveProperty("explanation");
    const q = state().questions.find((q) => q.id === view.question!.id)!;
    await execute(repo, student, {
      action: "answer",
      session_id: start.session_id,
      question_id: q.id,
      selected_option: q.correct_option,
    });
    expect(state().mastery.filter((m) => m.topic_id !== topic.id)).toEqual(
      priorMath,
    );
    expect(
      (await dashboard(repo, student, "matematika")).activeSession?.id,
    ).toBe(start.session_id);
  });
  it("tidak mengubah apa pun jika slug paket berbenturan dengan mapel lain", async () => {
    const initial = demoState();
    initial.topics.push({ ...curriculumTopics()[4], subject: "matematika" });
    const { repo, state } = memoryRepository(initial);
    const before = state();
    await expect(
      execute(repo, teacher, {
        action: "import-curriculum",
        subject: "bahasa-inggris",
        reviewed: true,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(state()).toEqual(before);
  });
  it("menolak prasyarat lintas mapel dan perubahan klasifikasi topik", async () => {
    const initial = demoState();
    initial.topics.push(...curriculumTopics());
    const { repo } = memoryRepository(initial);
    const topic = initial.topics.find((t) => t.subject === "bahasa-inggris")!;
    const editable = Object.fromEntries(
      Object.entries(topic).filter(
        ([key]) => !["created_at", "sort_order"].includes(key),
      ),
    );
    await expect(
      execute(repo, teacher, {
        action: "save-topic",
        topic: { ...editable, prerequisites: [seed.topics[0].id] },
      }),
    ).rejects.toThrow("mata pelajaran");
    await expect(
      execute(repo, teacher, {
        action: "save-topic",
        topic: { ...editable, subject: "matematika", prerequisites: [] },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("filter mapel tidak mencampur pengayaan ke latihan wajib", async () => {
    const { repo } = memoryRepository();
    const data = await dashboard(repo, student, "matematika");
    expect(data.topics.some((t) => t.slug === "turunan-fungsi")).toBe(false);
    expect(selectedSubject("mapel-tidak-valid")).toBe("matematika");
  });
});
