import { requireActor } from "@/lib/server/auth";
import { json, apiError, rateLimit, readJson } from "@/lib/server/http";
import { activityInput } from "@/lib/assessment-support";
import { ensure } from "@/lib/domain/errors";
import { cbtRepository } from "@/lib/server/cbt/repository";
import { repository } from "@/lib/server/repository";
import { recordActivity } from "@/lib/server/assessment-support-store";
import { cbtEnabled } from "@/lib/server/config";
export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    ensure(
      cbtEnabled() && actor.role === "student",
      "Pencatatan khusus peserta asesmen.",
      403,
    );
    rateLimit("activity:" + actor.id, 180);
    const input = activityInput.parse(await readJson(request));
    const context = await repository().read(actor);
    const active = await cbtRepository(actor).transact((state) => {
      const s = state.sittings.find(
        (s) => s.id === input.sitting_id && s.student_id === actor.id,
      );
      const e = state.exams.find((e) => e.id === s?.exam_id);
      ensure(
        s &&
          e &&
          context.class_members.some(
            (m) => m.class_id === e.class_id && m.student_id === actor.id,
          ),
        "Pengerjaan tidak ditemukan.",
        404,
      );
      return (
        s.status === "active" &&
        e.status === "open" &&
        Date.now() < Date.parse(s.deadline_at)
      );
    });
    return json({
      accepted: active ? await recordActivity(actor.id, input) : false,
    });
  } catch (e) {
    return apiError(e);
  }
}
