import { describe, expect, it } from "vitest";
import { dashboard, execute, quizView } from "@/lib/server/assessment";
import { summarize } from "@/lib/server/explanation";
import { DEMO_STUDENT, DEMO_TEACHER, demoState } from "@/lib/demo/seed";
import { memoryRepository } from "./helpers";

async function school() {
  const initial = demoState();
  initial.questions = [];
  initial.attempts = [];
  initial.mastery = [];
  initial.quiz_sessions = [];
  const lab = memoryRepository(initial);
  const teacher = initial.profiles.find((p) => p.id === DEMO_TEACHER)!;
  const student = initial.profiles.find((p) => p.id === DEMO_STUDENT)!;
  for (const subject of ["matematika", "bahasa-inggris"] as const)
    await execute(lab.repo, teacher, {
      action: "import-curriculum",
      subject,
      reviewed: true,
    });
  return { ...lab, student };
}

async function finishEnglish() {
  const lab = await school();
  const topic = lab.state().topics.find((t) => t.subject === "bahasa-inggris")!;
  const started = await execute(lab.repo, lab.student, {
    action: "start",
    topic_id: topic.id,
  });
  const id = started.session_id!;
  for (let i = 0; i < 6; i++) {
    const view = await quizView(lab.repo, lab.student, id);
    if (view.session.status === "completed") break;
    const q = lab.state().questions.find((q) => q.id === view.question!.id)!;
    await execute(lab.repo, lab.student, {
      action: "answer",
      session_id: id,
      question_id: q.id,
      selected_option: q.correct_option,
    });
  }
  return { ...lab, id };
}

describe("Tindak lanjut yang dapat dikerjakan siswa", () => {
  it.each(["start", "view"])(
    "sesi lama dengan soal sulit dinormalisasi saat %s tanpa mengubah jawaban",
    async (route) => {
      const { repo, state, student } = await school();
      const topic = state().topics.find((t) => t.subject === "bahasa-inggris")!;
      const start = await execute(repo, student, {
        action: "start",
        topic_id: topic.id,
      });
      for (let i = 0; i < 4; i++) {
        const view = await quizView(repo, student, start.session_id!);
        const q = state().questions.find((q) => q.id === view.question!.id)!;
        await execute(repo, student, {
          action: "answer",
          session_id: start.session_id,
          question_id: q.id,
          selected_option: q.correct_option === "A" ? "B" : "A",
        });
      }
      const hard = state().questions.find(
        (q) => q.topic_id === topic.id && q.difficulty === "hard",
      )!;
      await repo.transact(student, (draft) => {
        const session = draft.quiz_sessions.find(
          (s) => s.id === start.session_id,
        )!;
        Object.assign(session, {
          status: "active",
          current_question_id: hard.id,
          completed_at: null,
          end_reason: null,
          summary: null,
        });
      });
      const attempts = structuredClone(state().attempts);
      const mastery = structuredClone(state().mastery);
      await expect(
        execute(repo, student, {
          action: "answer",
          session_id: start.session_id,
          question_id: hard.id,
          selected_option: hard.correct_option,
        }),
      ).rejects.toMatchObject({ status: 409 });
      if (route === "start") {
        const resumed = await execute(repo, student, {
          action: "start",
          topic_id: topic.id,
        });
        expect(resumed.session_id).toBe(start.session_id);
        expect(
          state().quiz_sessions.find((s) => s.id === start.session_id)?.status,
        ).toBe("completed");
      }
      const result = await quizView(repo, student, start.session_id!);
      expect(result.session.status).toBe("completed");
      expect(result.session.end_reason).toBe(
        "Guru perlu melengkapi soal pada tingkat yang sesuai",
      );
      expect(result.question).toBeNull();
      expect(state().attempts).toEqual(attempts);
      expect(state().mastery).toEqual(mastery);
      expect(state().quiz_sessions).toHaveLength(1);
    },
  );
  it("bank hanya soal sulit tidak ditawarkan kepada siswa yang memerlukan dasar", async () => {
    const { repo, state, student } = await school();
    const topic = state().topics.find((t) => t.subject === "bahasa-inggris")!;
    await repo.transact(student, (draft) => {
      draft.questions = draft.questions.filter(
        (q) => q.topic_id !== topic.id || q.difficulty === "hard",
      );
    });
    const data = await dashboard(repo, student, "bahasa-inggris");
    expect(data.recommendations.some((r) => r.topic_id === topic.id)).toBe(
      false,
    );
    expect(
      data.waitingRecommendations.some((r) => r.topic_id === topic.id),
    ).toBe(true);
    await expect(
      execute(repo, student, { action: "start", topic_id: topic.id }),
    ).rejects.toMatchObject({ status: 409 });
    expect(state().quiz_sessions).toHaveLength(0);
  });
  it("sesi berhenti dengan alasan jelas sebelum melompat dari dasar ke soal sulit", async () => {
    const { repo, state, student } = await school();
    const topic = state().topics.find((t) => t.subject === "bahasa-inggris")!;
    const start = await execute(repo, student, {
      action: "start",
      topic_id: topic.id,
    });
    for (let i = 0; i < 4; i++) {
      const view = await quizView(repo, student, start.session_id!);
      const q = state().questions.find((q) => q.id === view.question!.id)!;
      expect(q.difficulty).not.toBe("hard");
      await execute(repo, student, {
        action: "answer",
        session_id: start.session_id,
        question_id: q.id,
        selected_option: q.correct_option === "A" ? "B" : "A",
      });
    }
    const view = await quizView(repo, student, start.session_id!);
    expect(view.session.status).toBe("completed");
    expect(view.session.end_reason).toBe(
      "Guru perlu melengkapi soal pada tingkat yang sesuai",
    );
    expect(view.attempts).toHaveLength(4);
  });
  it("bank guru lain tidak membuat rekomendasi siswa terlihat siap", async () => {
    const { repo, state, student } = await school();
    await repo.transact(student, (draft) => {
      const other = draft.profiles.find(
        (p) => p.role === "teacher" && p.id !== DEMO_TEACHER,
      )!;
      draft.questions.forEach((q) => {
        q.created_by = other.id;
      });
    });
    const data = await dashboard(repo, student, "bahasa-inggris");
    expect(data.recommendations).toHaveLength(0);
    expect(data.waitingRecommendations).toHaveLength(4);
    expect(data.questionCounts.every((q) => q.count === 0)).toBe(true);
    expect(state().attempts).toHaveLength(0);
  });
  it("memisahkan topik tanpa soal dari rekomendasi latihan", async () => {
    const { repo, student } = await school();
    const data = await dashboard(repo, student, "matematika");
    const counts = new Map(
      data.questionCounts.map((row) => [row.topic_id, row.count]),
    );
    expect(data.recommendations.length).toBeGreaterThan(0);
    expect(data.recommendations.every((r) => counts.get(r.topic_id)! > 0)).toBe(
      true,
    );
    expect(data.waitingRecommendations.map((r) => r.name)).toContain(
      "Peluang kejadian",
    );
  });

  it("hasil bahasa hanya menyarankan mapel/kategori sesi dan bank yang tersedia", async () => {
    const { repo, student, id, state } = await finishEnglish();
    const view = await quizView(repo, student, id);
    expect(view.session.status).toBe("completed");
    expect(view.summary).not.toContain("Limit fungsi");
    expect(view.recommendations.length).toBeGreaterThan(0);
    for (const r of view.recommendations) {
      const topic = state().topics.find((t) => t.id === r.topic_id)!;
      expect(topic.subject).toBe("bahasa-inggris");
      expect(topic.curriculum_track).toBe("wajib");
    }
  });

  it("rencana baru untuk hasil lama tidak menulis ulang ringkasan atau jawaban tersimpan", async () => {
    const { repo, student, id, state } = await finishEnglish();
    await repo.transact(student, (draft) => {
      draft.quiz_sessions.find((s) => s.id === id)!.summary =
        "Prioritas berikutnya: Limit fungsi.";
    });
    const before = state();
    const view = await quizView(repo, student, id);
    expect(view.summary).not.toContain("Limit fungsi");
    expect(state()).toEqual(before);
  });

  it("prioritas yang diterima Groq memakai konteks latihan yang sama", async () => {
    const { repo, student, id } = await finishEnglish();
    let names: string[] = [];
    await summarize(repo, student, id, async (input) => {
      names = input.priorities.map((r) => r.name);
      return JSON.stringify({
        explanation:
          "Pelajari kembali bacaan dan alasan jawabanmu. Estimasi model perlu didampingi guru.",
      });
    });
    expect(names.length).toBeGreaterThan(0);
    expect(names).not.toContain("Limit fungsi");
    expect(names).not.toContain("Peluang kejadian");
  });
});
