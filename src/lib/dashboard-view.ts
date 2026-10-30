import type { DashboardData } from "./server/assessment";
import type { Subject } from "./subjects";
import { learningPlan } from "./domain/learning-plan";

// Hanya DTO milik aktor yang sudah disaring server. Bank soal tidak dikirim ke sini.
export function dashboardForSubject(
  data: DashboardData,
  subject: Subject,
): DashboardData {
  const topics = data.topics.filter(
    (topic) => topic.subject === subject && topic.curriculum_track === "wajib",
  );
  const ids = new Set(topics.map((topic) => topic.id));
  const mastery = data.mastery.filter((row) => ids.has(row.topic_id));
  const prerequisites = data.prerequisites.filter(
    (row) => ids.has(row.topic_id) && ids.has(row.prerequisite_topic_id),
  );
  return {
    ...data,
    subject,
    topics,
    mastery,
    prerequisites,
    attempts: data.attempts.filter((row) => ids.has(row.topic_id)),
    sessions: data.sessions.filter((row) => ids.has(row.topic_id)),
    questionCounts: data.questionCounts.filter((row) => ids.has(row.topic_id)),
    ...learningPlan(
      topics,
      prerequisites,
      mastery.filter((row) => row.student_id === data.actor.id),
      data.questionCounts,
    ),
  };
}
