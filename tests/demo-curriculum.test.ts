import { describe, expect, it } from "vitest";
import { demoState, DEMO_TEACHER, DEMO_STUDENT } from "@/lib/demo/seed";
import { curriculumTopics } from "@/lib/curriculum/catalog";
import { prepareDemoQuestions } from "@/lib/server/demo-curriculum";
import { dashboard } from "@/lib/server/assessment";
import { memoryRepository } from "./helpers";
import { stateSchema } from "@/lib/state-schema";

function fixture() {
  const s = demoState();
  s.topics.push(...curriculumTopics());
  return s;
}
describe("Soal simulasi PKM siap dicoba", () => {
  it("menyiapkan semua mapel tanpa mengubah profil, jawaban, atau nilai sebelumnya", async () => {
    const state = fixture();
    const before = structuredClone(state);
    prepareDemoQuestions(state);
    expect(state.profiles).toEqual(before.profiles);
    expect(state.mastery).toEqual(before.mastery);
    expect(state.attempts).toEqual(before.attempts);
    expect(state.questions).toHaveLength(before.questions.length + 72);
    expect(stateSchema.safeParse(state).success).toBe(true);
    const lab = memoryRepository(state);
    const student = state.profiles.find((p) => p.id === DEMO_STUDENT)!;
    for (const subject of [
      "matematika",
      "bahasa-inggris",
      "bahasa-indonesia",
    ] as const) {
      const d = await dashboard(lab.repo, student, subject);
      expect(d.recommendations.length).toBeGreaterThan(0);
      for (const t of curriculumTopics().filter((t) => t.subject === subject))
        expect(d.questionCounts.find((c) => c.topic_id === t.id)?.count).toBe(
          6,
        );
    }
  });
  it("pemuatan ulang memakai ID stabil dan tidak menggandakan soal", () => {
    const a = prepareDemoQuestions(fixture());
    const b = prepareDemoQuestions(fixture());
    expect(a.questions).toEqual(b.questions);
    const before = structuredClone(a);
    prepareDemoQuestions(a);
    expect(a).toEqual(before);
  });
  it("tidak menciptakan guru atau memberi peran baru", () => {
    const state = fixture();
    state.profiles = state.profiles.filter((p) => p.id !== DEMO_TEACHER);
    const before = structuredClone(state);
    prepareDemoQuestions(state);
    expect(state).toEqual(before);
  });
});
