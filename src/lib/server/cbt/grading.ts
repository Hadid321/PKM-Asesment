import "server-only";
import { BKT, updateBkt } from "../../domain/bkt";
import { keys, type Exam, type Sitting } from "../../cbt/model";
export function grade(exam: Exam, sitting: Sitting) {
  const mastery = { ...sitting.priors };
  let correct = 0;
  const review = sitting.order.map((id) => {
    const item = exam.items.find((q) => q.id === id)!;
    const selected = sitting.answers[id]?.option ?? null;
    const order = sitting.option_orders[id];
    const original = selected ? order[keys.indexOf(selected)] : null;
    const right = original === item.correct_option;
    if (right) correct++;
    if (original)
      mastery[item.topic_id] = updateBkt(
        mastery[item.topic_id] ?? BKT.initial,
        right,
      );
    return {
      id,
      question_text: item.question_text,
      options: Object.fromEntries(
        keys.map((k, i) => [k, item.options[order[i]]]),
      ),
      selected_option: selected,
      correct_option: keys[order.indexOf(item.correct_option)],
      is_correct: right,
      explanation: item.explanation,
    };
  });
  const topics = [
    ...new Map(
      exam.items.map((q) => [
        q.topic_id,
        {
          id: q.topic_id,
          name: q.topic_name,
          p_l: mastery[q.topic_id] ?? BKT.initial,
        },
      ]),
    ).values(),
  ].sort((a, b) => a.p_l - b.p_l);
  return {
    correct,
    total: exam.items.length,
    score: Math.round((correct / exam.items.length) * 100),
    topics,
    review,
  };
}
