import type { Repository } from "@/lib/server/repository";
import { scopeState } from "@/lib/server/repository";
import type { State } from "@/lib/types";
import { demoState } from "@/lib/demo/seed";
export function memoryRepository(initial = demoState()) {
  let state = structuredClone(initial);
  let queue: Promise<unknown> = Promise.resolve();
  const repo: Repository = {
    read: async (actor) => scopeState(structuredClone(state), actor),
    transact: async (_actor, fn) => {
      const task = queue.then(() => {
        const draft = structuredClone(state);
        const value = fn(draft);
        state = draft;
        return value;
      });
      queue = task.catch(() => undefined);
      return task;
    },
    joinClass: async (actor, code) => {
      await repo.transact(actor, (draft) => {
        const c = draft.classes.find((c) => c.class_code === code);
        if (!c) throw new Error("Kode tidak ditemukan");
        if (
          !draft.class_members.some(
            (m) => m.class_id === c.id && m.student_id === actor.id,
          )
        )
          draft.class_members.push({
            class_id: c.id,
            student_id: actor.id,
            joined_at: new Date().toISOString(),
          });
      });
    },
  };
  return { repo, state: (): State => structuredClone(state) };
}
