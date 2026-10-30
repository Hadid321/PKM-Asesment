import "server-only";
import { countQuestions, learningPlan } from "../domain/learning-plan";
import type { Profile, State, Topic } from "../types";
import { scopeState } from "./repository";

export function sessionLearningPlan(
  state: State,
  actor: Profile,
  topic: Topic,
) {
  const scoped = scopeState(state, actor);
  return learningPlan(
    scoped.topics,
    scoped.topic_prerequisites,
    scoped.mastery.filter((m) => m.student_id === actor.id),
    countQuestions(
      scoped.topics,
      scoped.questions,
      scoped.mastery.filter((m) => m.student_id === actor.id),
    ),
    topic,
  );
}
