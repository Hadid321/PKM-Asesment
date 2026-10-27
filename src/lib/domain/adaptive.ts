import { BKT, difficultyFor, MASTERY_THRESHOLD, MAX_QUESTIONS } from "./bkt";
import type {
  Mastery,
  Prerequisite,
  PublicQuestion,
  Question,
  Recommendation,
  Topic,
} from "../types";
export function recommend(
  topics: Topic[],
  prerequisites: Prerequisite[],
  mastery: Mastery[],
): Recommendation[] {
  const p = (id: string) =>
    mastery.find((m) => m.topic_id === id)?.p_l ?? BKT.initial;
  const sorted = [...topics].sort(
    (a, b) => p(a.id) - p(b.id) || a.sort_order - b.sort_order,
  );
  const result: Recommendation[] = [];
  const visited = new Set<string>();
  function visit(topic: Topic, forTopic?: string) {
    if (visited.has(topic.id)) return;
    visited.add(topic.id);
    for (const edge of prerequisites.filter((e) => e.topic_id === topic.id)) {
      const prerequisite = topics.find(
        (t) => t.id === edge.prerequisite_topic_id,
      );
      if (prerequisite && p(prerequisite.id) <= 0.6)
        visit(prerequisite, topic.name);
    }
    result.push({
      topic_id: topic.id,
      name: topic.name,
      p_l: p(topic.id),
      prerequisite_for: forTopic,
      reason: forTopic
        ? `Perkuat dasar ${topic.name} sebelum melanjutkan ke ${forTopic}.`
        : p(topic.id) >= MASTERY_THRESHOLD
          ? "Ambang estimasi tercapai. Coba latihan penguatan berkala."
          : `Estimasi ${Math.round(p(topic.id) * 100)}%. Latihan bertahap membantu memperkuat topik ini.`,
    });
  }
  sorted.forEach((t) => visit(t));
  return result;
}
export function assertAcyclic(topics: Topic[], edges: Prerequisite[]) {
  const visiting = new Set<string>(),
    done = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id))
      throw new Error(
        "Prasyarat tidak boleh melingkar atau menunjuk topik itu sendiri.",
      );
    if (done.has(id)) return;
    visiting.add(id);
    for (const edge of edges.filter((e) => e.topic_id === id)) {
      if (!topics.some((t) => t.id === edge.prerequisite_topic_id))
        throw new Error("Topik prasyarat tidak ditemukan.");
      visit(edge.prerequisite_topic_id);
    }
    visiting.delete(id);
    done.add(id);
  }
  topics.forEach((t) => visit(t.id));
}
export function nextQuestion(
  questions: Question[],
  answeredIds: string[],
  p: number,
): Question | undefined {
  if (answeredIds.length >= MAX_QUESTIONS) return;
  const levels = ["easy", "medium", "hard"];
  const target = levels.indexOf(difficultyFor(p));
  // Tingkat terdekat; jika berjarak sama, dahulukan yang lebih mudah. ID menstabilkan urutan.
  return questions
    .filter((q) => !answeredIds.includes(q.id))
    .sort(
      (a, b) =>
        Math.abs(levels.indexOf(a.difficulty) - target) -
          Math.abs(levels.indexOf(b.difficulty) - target) ||
        levels.indexOf(a.difficulty) - levels.indexOf(b.difficulty) ||
        a.id.localeCompare(b.id),
    )[0];
}
export function publicQuestion(q: Question): PublicQuestion {
  return {
    id: q.id,
    topic_id: q.topic_id,
    question_text: q.question_text,
    options: q.options,
    difficulty: q.difficulty,
  };
}
