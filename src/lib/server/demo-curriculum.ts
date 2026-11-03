import "server-only";
import { fingerprint } from "../domain/csv";
import { DEMO_TEACHER } from "../demo/seed";
import type { State } from "../types";
import { curriculumPackage } from "./curriculum-content";

// Hanya dipakai oleh penyimpanan demo lokal, tidak oleh adapter data sekolah.
export function prepareDemoQuestions(state: State) {
  if (
    !state.profiles.some((p) => p.id === DEMO_TEACHER && p.role === "teacher")
  )
    return state;
  const existing = new Set(
    state.questions
      .filter((q) => q.created_by === DEMO_TEACHER)
      .map((q) => q.fingerprint),
  );
  for (const subject of [
    "matematika",
    "bahasa-inggris",
    "bahasa-indonesia",
  ] as const) {
    for (const item of curriculumPackage(subject).questions) {
      const topic = state.topics.find((t) => t.slug === item.topic_slug);
      if (
        !topic ||
        topic.subject !== subject ||
        topic.curriculum_track !== "wajib"
      )
        continue;
      const question = {
        topic_id: topic.id,
        question_text: item.question_text,
        options: item.options,
        correct_option: item.correct_option,
        difficulty: item.difficulty,
        explanation: `${item.explanation} Bahan simulasi PKM, ${item.code}.`,
      };
      const hash = fingerprint(question);
      if (existing.has(hash)) continue;
      existing.add(hash);
      state.questions.push({
        ...question,
        id: `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`,
        fingerprint: hash,
        created_by: DEMO_TEACHER,
        created_at: "2026-11-03T00:00:00.000Z",
        updated_at: "2026-11-03T00:00:00.000Z",
      });
    }
  }
  return state;
}
