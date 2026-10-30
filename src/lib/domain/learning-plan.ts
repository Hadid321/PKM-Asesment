import { appropriateDifficulty, recommend } from "./adaptive";
import { BKT } from "./bkt";
import type {
  Attempt,
  Mastery,
  Prerequisite,
  Question,
  Recommendation,
  Topic,
} from "../types";

export function countQuestions(
  topics: Topic[],
  questions: Pick<Question, "topic_id" | "difficulty">[],
  mastery: Mastery[] = [],
) {
  const counts = new Map<string, number>();
  const practice = new Map<string, number>();
  const estimates = new Map(mastery.map((m) => [m.topic_id, m.p_l]));
  for (const q of questions) {
    counts.set(q.topic_id, (counts.get(q.topic_id) ?? 0) + 1);
    if (
      appropriateDifficulty(
        q.difficulty,
        estimates.get(q.topic_id) ?? BKT.initial,
      )
    )
      practice.set(q.topic_id, (practice.get(q.topic_id) ?? 0) + 1);
  }
  return topics.map((t) => ({
    topic_id: t.id,
    count: counts.get(t.id) ?? 0,
    practice_count: practice.get(t.id) ?? 0,
  }));
}

export function learningPlan(
  topics: Topic[],
  prerequisites: Prerequisite[],
  mastery: Mastery[],
  questionCounts: {
    topic_id: string;
    count: number;
    practice_count?: number;
  }[],
  context?: Pick<Topic, "subject" | "curriculum_track">,
) {
  const scoped = context
    ? topics.filter(
        (t) =>
          t.subject === context.subject &&
          t.curriculum_track === context.curriculum_track,
      )
    : topics;
  const ids = new Set(scoped.map((t) => t.id));
  const available = new Set(
    questionCounts
      .filter((q) => (q.practice_count ?? q.count) > 0)
      .map((q) => q.topic_id),
  );
  const totals = new Map(questionCounts.map((q) => [q.topic_id, q.count]));
  // BKT dan urutan prasyarat tetap dihitung bersama, termasuk dasar yang menunggu soal.
  const ranked = recommend(
    scoped,
    prerequisites.filter(
      (p) => ids.has(p.topic_id) && ids.has(p.prerequisite_topic_id),
    ),
    mastery,
  );
  return {
    recommendations: ranked.filter((r) => available.has(r.topic_id)),
    waitingRecommendations: ranked
      .filter((r) => !available.has(r.topic_id))
      .map((r) =>
        (totals.get(r.topic_id) ?? 0) > 0
          ? {
              ...r,
              reason: `${r.reason} Mintalah guru melengkapi soal pada tingkat yang sesuai.`,
            }
          : r,
      ),
  };
}

export function sessionOverview(
  topic: Topic,
  attempts: Pick<Attempt, "is_correct" | "p_after">[],
  recommendations: Recommendation[],
) {
  const correct = attempts.filter((a) => a.is_correct).length;
  const p = attempts.at(-1)?.p_after ?? BKT.initial;
  const next = recommendations[0];
  const followUp = next
    ? `Prioritas berikutnya: ${next.name}.`
    : "Belum ada latihan yang tersedia pada kelompok topik ini. Hubungi guru untuk menyiapkan soal.";
  return `${topic.name}: ${correct} dari ${attempts.length} jawaban benar. Estimasi penguasaan BKT ${Math.round(p * 100)}%. ${followUp} Pelajari pembahasan kesalahan dan materi pendamping. Estimasi model bukan sertifikasi kompetensi.`;
}
