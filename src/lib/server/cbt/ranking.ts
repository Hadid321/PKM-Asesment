import "server-only";
import type { Exam, Sitting } from "../../cbt/model";
import type { Profile, State } from "../../types";
import { grade } from "./grading";
export type RankRow = {
  rank: number;
  label: string;
  score: number;
  correct: number;
  total: number;
  is_you: boolean;
};
export function assessmentRanking(
  exam: Exam,
  sittings: Sitting[],
  actor: Profile,
  context: State,
): RankRow[] | null {
  const teacher =
    actor.role === "teacher" &&
    exam.teacher_id === actor.id &&
    context.classes.some(
      (c) => c.id === exam.class_id && c.teacher_id === actor.id,
    );
  const mine = sittings.find(
    (s) => s.exam_id === exam.id && s.student_id === actor.id,
  );
  if (
    !teacher &&
    !(
      actor.role === "student" &&
      exam.released &&
      mine?.status === "submitted" &&
      context.class_members.some(
        (m) => m.class_id === exam.class_id && m.student_id === actor.id,
      )
    )
  )
    return null;
  const aliases = new Map(
    sittings
      .filter((s) => s.exam_id === exam.id)
      .sort(
        (a, b) =>
          a.started_at.localeCompare(b.started_at) || a.id.localeCompare(b.id),
      )
      .map((s, i) => [s.id, "Peserta " + String(i + 1).padStart(2, "0")]),
  );
  const rows = sittings
    .filter((s) => s.exam_id === exam.id && s.status === "submitted")
    .map((s) => ({ s, grade: grade(exam, s) }))
    .sort(
      (a, b) =>
        b.grade.correct - a.grade.correct ||
        (aliases.get(a.s.id) ?? "").localeCompare(aliases.get(b.s.id) ?? ""),
    );
  let rank = 0,
    previous = -1;
  return rows.map(({ s, grade: g }, i) => {
    if (g.correct !== previous) {
      rank = i + 1;
      previous = g.correct;
    }
    return {
      rank,
      label: teacher
        ? (context.profiles.find((p) => p.id === s.student_id)?.full_name ??
          "Peserta")
        : s.student_id === actor.id
          ? "Anda"
          : aliases.get(s.id)!,
      score: g.score,
      correct: g.correct,
      total: g.total,
      is_you: s.student_id === actor.id,
    };
  });
}
