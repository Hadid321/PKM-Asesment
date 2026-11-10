import { requireActor } from "@/lib/server/auth";
import { json, apiError, rateLimit, readJson } from "@/lib/server/http";
import { activityInput } from "@/lib/assessment-support";
import { ensure } from "@/lib/domain/errors";
import { cbtRepository } from "@/lib/server/cbt/repository";
import { repository } from "@/lib/server/repository";
import {
  recordActivity,
  readFocus,
} from "@/lib/server/assessment-support-store";
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
      if (e.focus_guard)
        ensure(
          input.presence.page_id && input.presence.sequence,
          "Catatan fokus belum lengkap. Muat ulang halaman.",
          400,
        );
      return {
        enabled: e.focus_guard === true,
        active:
          s.status === "active" &&
          e.status === "open" &&
          Date.now() < Date.parse(s.deadline_at),
      };
    });
    const accepted = active.active
      ? await recordActivity(actor.id, input, active.enabled)
      : false;
    const [focus] = await readFocus(
      actor.id,
      [input.sitting_id],
      active.enabled ? [input.sitting_id] : [],
    );
    return json({ accepted, focus });
  } catch (e) {
    return apiError(e);
  }
}
