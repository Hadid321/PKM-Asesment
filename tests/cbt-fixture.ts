import { createCbtService } from "@/lib/server/cbt/engine";
import {
  cbtStateSchema,
  type CbtRepository,
  type CbtState,
} from "@/lib/cbt/model";
import { demoState, DEMO_TEACHER, DEMO_STUDENT } from "@/lib/demo/seed";
import { curriculumTopics } from "@/lib/curriculum/catalog";
import type { Profile } from "@/lib/types";
export function cbtLab() {
  const context = demoState();
  context.topics.push(...curriculumTopics());
  const teacher = context.profiles.find((p) => p.id === DEMO_TEACHER)!;
  const student = context.profiles.find((p) => p.id === DEMO_STUDENT)!;
  let clock = Date.now();
  let state: CbtState = { exams: [], sittings: [] };
  let queue: Promise<unknown> = Promise.resolve();
  const repo: CbtRepository = {
    transact: async (fn) => {
      const task = queue.then(() => {
        const draft = structuredClone(state);
        const r = fn(draft);
        cbtStateSchema.parse(draft);
        state = draft;
        return r;
      });
      queue = task.catch(() => undefined);
      return task;
    },
  };
  const service = (actor: Profile) =>
    createCbtService(repo, context, actor, () => clock);
  return {
    context,
    teacher,
    student,
    repo,
    service,
    state: () => structuredClone(state),
    advance: (ms: number) => {
      clock += ms;
    },
  };
}
