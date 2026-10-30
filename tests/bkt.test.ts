import { describe, expect, it } from "vitest";
import { BKT, difficultyFor, updateBkt } from "@/lib/domain/bkt";
import {
  assertAcyclic,
  nextQuestion,
  publicQuestion,
  recommend,
} from "@/lib/domain/adaptive";
import { seedContent } from "@/lib/demo/seed";
const seed = seedContent();
describe("BKT sesuai rumus prototipe", () => {
  it("memulai dari 0,3", () => expect(BKT.initial).toBe(0.3));
  it("memperbarui jawaban benar melalui posterior lalu learning", () =>
    expect(updateBkt(0.3, true)).toBe(0.69268293));
  it("memperbarui jawaban salah", () =>
    expect(updateBkt(0.3, false)).toBe(0.14576271));
  it("deterministik dan tetap pada rentang probabilitas", () => {
    for (let i = 0; i <= 100; i++)
      for (const b of [true, false]) {
        const p = updateBkt(i / 100, b);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
        expect(p).toBe(updateBkt(i / 100, b));
      }
  });
  it.each([-1, 1.1, NaN, Infinity])("menolak probabilitas invalid %s", (p) =>
    expect(() => updateBkt(p, true)).toThrow(),
  );
  it("memvalidasi seluruh parameter", () => {
    for (const key of Object.keys(BKT))
      expect(() => updateBkt(0.3, true, { ...BKT, [key]: 2 })).toThrow();
  });
  it("menangani bukti mustahil tanpa NaN", () => {
    expect(updateBkt(0, true, { ...BKT, guess: 0 })).toBe(0.1);
    expect(updateBkt(1, false, { ...BKT, slip: 0 })).toBe(1);
  });
  it.each([
    [0.399, "easy"],
    [0.4, "medium"],
    [0.7, "medium"],
    [0.7001, "hard"],
  ])("memilih kesulitan untuk %s", (p, d) =>
    expect(difficultyFor(p as number)).toBe(d),
  );
});
describe("Rekomendasi dan seleksi soal", () => {
  it("memprioritaskan prasyarat lemah secara rekursif", () => {
    const mastery = [
      {
        student_id: "s",
        topic_id: seed.topics[2].id,
        p_l: 0.1,
        updated_at: "",
      },
    ];
    const r = recommend(seed.topics, seed.topic_prerequisites, mastery);
    expect(r[0].topic_id).toBe(seed.topics[0].id);
    expect(r[1].topic_id).toBe(seed.topics[1].id);
  });
  it("melewati prasyarat di atas 0,6", () => {
    const m = seed.topics.map((t, i) => ({
      student_id: "s",
      topic_id: t.id,
      p_l: i === 2 ? 0.1 : 0.61,
      updated_at: "",
    }));
    expect(
      recommend(seed.topics, seed.topic_prerequisites, m)[0].topic_id,
    ).toBe(seed.topics[2].id);
  });
  it("memprioritaskan prasyarat tepat 0,6", () => {
    const m = seed.topics.map((t, i) => ({
      student_id: "s",
      topic_id: t.id,
      p_l: i === 2 ? 0.1 : 0.6,
      updated_at: "",
    }));
    expect(
      recommend(seed.topics, seed.topic_prerequisites, m)[0].topic_id,
    ).toBe(seed.topics[0].id);
  });
  it("tanpa relasi memilih topik terendah dan memakai prior topik baru", () => {
    const r = recommend(
      seed.topics,
      [],
      [
        {
          student_id: "s",
          topic_id: seed.topics[3].id,
          p_l: 0.1,
          updated_at: "",
        },
      ],
    );
    expect(r[0].topic_id).toBe(seed.topics[3].id);
    expect(r[1].p_l).toBe(0.3);
  });
  it("menolak siklus", () =>
    expect(() =>
      assertAcyclic(seed.topics, [
        ...seed.topic_prerequisites,
        {
          topic_id: seed.topics[0].id,
          prerequisite_topic_id: seed.topics[2].id,
        },
      ]),
    ).toThrow());
  it("kosong jika tidak tersedia soal", () =>
    expect(nextQuestion([], [], 0.3)).toBeUndefined());
  it("tidak memaksa soal sulit saat estimasi dasar rendah dan bank dasar habis", () => {
    const hard = seed.questions.filter((q) => q.difficulty === "hard");
    expect(nextQuestion(hard, [], 0.3)).toBeUndefined();
    expect(nextQuestion(hard, [], 0.5)?.difficulty).toBe("hard");
  });
  it("tidak mengulang soal dan memilih fallback terdekat", () => {
    const q = seed.questions.filter(
      (q) => q.topic_id === seed.topics[0].id && q.difficulty !== "medium",
    );
    const next = nextQuestion(q, [q[0].id], 0.5);
    expect(next?.difficulty).toBe("easy");
    expect(next?.id).not.toBe(q[0].id);
  });
  it("berhenti setelah 10 soal", () =>
    expect(
      nextQuestion(
        seed.questions,
        seed.questions.slice(0, 10).map((q) => q.id),
        0.3,
      ),
    ).toBeUndefined());
  it("DTO soal tidak memuat kunci atau pembahasan", () => {
    const dto = publicQuestion(seed.questions[0]);
    expect(Object.keys(dto).sort()).toEqual([
      "difficulty",
      "id",
      "options",
      "question_text",
      "topic_id",
    ]);
  });
});
