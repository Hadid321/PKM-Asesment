import { describe, expect, it } from "vitest";
import { dashboard, execute, quizView } from "@/lib/server/assessment";
import {
  demoState,
  DEMO_STUDENT,
  DEMO_TEACHER,
  OTHER_STUDENT,
  OTHER_TEACHER,
} from "@/lib/demo/seed";
import { explain, summarize } from "@/lib/server/explanation";
import { memoryRepository } from "./helpers";
const seed = demoState();
const student = seed.profiles.find((p) => p.id === DEMO_STUDENT)!;
const teacher = seed.profiles.find((p) => p.id === DEMO_TEACHER)!;
describe("Alur asesmen dan otorisasi", () => {
  it("menyelesaikan 10 soal, menyimpan prior lintas sesi, dan mencegah duplikasi paralel", async () => {
    const { repo, state } = memoryRepository();
    const start = await execute(repo, student, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    const sid = "session_id" in start ? (start.session_id ?? "") : "";
    const q = (await quizView(repo, student, sid)).question!;
    const actual = seed.questions.find((x) => x.id === q.id)!;
    const wrong = actual.correct_option === "A" ? "B" : "A";
    const input = {
      action: "answer",
      session_id: sid,
      question_id: q.id,
      selected_option: wrong,
    };
    await Promise.all([
      execute(repo, student, input),
      execute(repo, student, input),
    ]);
    expect(state().attempts.filter((a) => a.session_id === sid)).toHaveLength(
      1,
    );
    for (let i = 1; i < 10; i++) {
      const view = await quizView(repo, student, sid);
      const q = view.question!;
      const real = seed.questions.find((x) => x.id === q.id)!;
      await execute(repo, student, {
        ...input,
        question_id: q.id,
        selected_option: real.correct_option === "A" ? "B" : "A",
      });
    }
    const final = await quizView(repo, student, sid);
    expect(final.session.status).toBe("completed");
    expect(final.attempts).toHaveLength(10);
    expect(new Set(final.attempts.map((a) => a.question_id)).size).toBe(10);
    expect(final.session.summary_source).toBe("template");
    const next = await execute(repo, student, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    const v = await quizView(
      repo,
      student,
      "session_id" in next ? (next.session_id ?? "") : "",
    );
    await execute(repo, student, {
      ...input,
      session_id: v.session.id,
      question_id: v.question!.id,
    });
    expect(
      state().attempts.filter((a) => a.session_id === v.session.id)[0].p_before,
    ).toBe(final.attempts.at(-1)!.p_after);
  });
  it("mengakhiri lebih awal saat ambang model tercapai", async () => {
    const { repo } = memoryRepository();
    const start = await execute(repo, student, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    const sid = "session_id" in start ? (start.session_id ?? "") : "";
    for (let i = 0; i < 10; i++) {
      const view = await quizView(repo, student, sid);
      if (view.session.status === "completed") break;
      const q = seed.questions.find((q) => q.id === view.question!.id)!;
      await execute(repo, student, {
        action: "answer",
        session_id: sid,
        question_id: q.id,
        selected_option: q.correct_option,
      });
    }
    const result = await quizView(repo, student, sid);
    expect(result.attempts.length).toBeLessThan(10);
    expect(result.attempts.at(-1)!.p_after).toBeGreaterThanOrEqual(0.95);
  });
  it("tidak membocorkan siswa lain ke dashboard", async () => {
    const { repo } = memoryRepository();
    const result = await dashboard(repo, student);
    expect(result.attempts.every((a) => a.student_id === student.id)).toBe(
      true,
    );
    expect(result.students).toHaveLength(1);
    expect(result).not.toHaveProperty("questions");
  });
  it("menolak akses sesi siswa lain dan bank guru melalui peran siswa", async () => {
    const { repo } = memoryRepository();
    const other = seed.quiz_sessions.find(
      (s) => s.student_id === OTHER_STUDENT,
    )!;
    await expect(quizView(repo, student, other.id)).rejects.toThrow(
      "Sesi tidak ditemukan",
    );
    await expect(
      execute(repo, student, { action: "create-class", name: "X" }),
    ).rejects.toThrow("guru");
  });
  it("guru lain tidak melihat kelas, siswa, atau hasil", async () => {
    const { repo } = memoryRepository();
    const other = seed.profiles.find((p) => p.id === OTHER_TEACHER)!;
    const d = await dashboard(repo, other);
    expect(d.classes).toHaveLength(0);
    expect(d.attempts).toHaveLength(0);
    expect(d.students).toHaveLength(0);
  });
  it("menolak role, identitas, dan penilaian dari browser", async () => {
    const { repo } = memoryRepository();
    await expect(
      execute(repo, student, {
        action: "profile",
        full_name: "X",
        role: "teacher",
      }),
    ).rejects.toThrow();
    await expect(
      execute(repo, student, {
        action: "answer",
        session_id: seed.quiz_sessions[0].id,
        question_id: seed.questions[0].id,
        selected_option: "A",
        p_l: 1,
        is_correct: true,
        student_id: OTHER_STUDENT,
      }),
    ).rejects.toThrow();
  });
  it("menolak soal yang bukan giliran sesi", async () => {
    const { repo } = memoryRepository();
    const s = await execute(repo, student, {
      action: "start",
      topic_id: seed.topics[1].id,
    });
    await expect(
      execute(repo, student, {
        action: "answer",
        session_id: "session_id" in s ? (s.session_id ?? "") : "",
        question_id: seed.questions[0].id,
        selected_option: "A",
      }),
    ).rejects.toThrow("Soal tidak sesuai");
  });
  it("keanggotaan kode kelas idempotent", async () => {
    const { repo, state } = memoryRepository();
    await execute(repo, student, { action: "join-class", code: "demo-xii" });
    expect(
      state().class_members.filter((m) => m.student_id === student.id),
    ).toHaveLength(1);
  });
  it("menolak siklus dan tidak menyimpan perubahan parsial", async () => {
    const { repo, state } = memoryRepository();
    const t = seed.topics[0];
    const before = state();
    await expect(
      execute(repo, teacher, {
        action: "save-topic",
        topic: {
          id: t.id,
          subject: t.subject,
          curriculum_track: t.curriculum_track,
          name: t.name,
          slug: t.slug,
          description: t.description,
          material_title: "",
          material_url: "",
          prerequisites: [seed.topics[2].id],
        },
      }),
    ).rejects.toThrow("melingkar");
    expect(state()).toEqual(before);
  });
  it("topik tanpa soal ditolak dengan pesan yang jelas", async () => {
    const input = demoState();
    input.questions = [];
    const { repo } = memoryRepository(input);
    await expect(
      execute(repo, student, { action: "start", topic_id: seed.topics[0].id }),
    ).rejects.toThrow("Belum ada soal");
  });
});
describe("Penjelasan opsional", () => {
  const input = {
    topic: "Limit",
    mastery: 0.3,
    wrong: [],
    priorities: [{ name: "Limit", reason: "Perkuat" }],
    fallback: "Ringkasan template hasil asesmen.",
  };
  it("fallback tanpa kunci", async () => {
    const before = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    expect((await explain(input)).source).toBe("template");
    if (before) process.env.GROQ_API_KEY = before;
  });
  it.each(["429", "timeout", "model unavailable"])(
    "fallback saat provider gagal %s",
    async (message) =>
      expect(
        await explain(input, async () => {
          throw new Error(message);
        }),
      ).toEqual({ source: "template", text: input.fallback }),
  );
  it("menolak respons tidak valid atau tautan/nilai tambahan", async () => {
    expect(
      (
        await explain(
          input,
          async () =>
            '{"explanation":"Nilai baru 100% kunjungi https://palsu.invalid"}',
        )
      ).source,
    ).toBe("template");
    expect((await explain(input, async () => "rusak")).source).toBe("template");
  });
  it("menerima penjelasan dengan bentuk yang benar", async () =>
    expect(
      (
        await explain(input, async () =>
          JSON.stringify({
            explanation:
              "Pelajari limit terlebih dahulu, baca pembahasan yang tersedia lalu coba latihan lanjutan.",
          }),
        )
      ).source,
    ).toBe("groq"));
  it("klaim ringkasan tidak diulang", async () => {
    const { repo } = memoryRepository();
    const sid = seed.quiz_sessions[0].id;
    await summarize(repo, student, sid);
    await summarize(repo, student, sid);
    expect(
      (await repo.read(student)).quiz_sessions.find((s) => s.id === sid)
        ?.summary_source,
    ).toBe("template");
  });
  it("dua permintaan ringkasan bersamaan hanya memanggil provider sekali", async () => {
    const initial = demoState();
    initial.quiz_sessions[0].summary_claimed = false;
    const { repo } = memoryRepository(initial);
    let calls = 0;
    const complete = async () => {
      calls++;
      return JSON.stringify({
        explanation:
          "Perkuat dasar limit, baca pembahasan yang tersedia, lalu lanjutkan latihan berikutnya.",
      });
    };
    await Promise.all([
      summarize(repo, student, initial.quiz_sessions[0].id, complete),
      summarize(repo, student, initial.quiz_sessions[0].id, complete),
    ]);
    expect(calls).toBe(1);
    expect((await repo.read(student)).quiz_sessions[0].summary_source).toBe(
      "groq",
    );
  });
});
