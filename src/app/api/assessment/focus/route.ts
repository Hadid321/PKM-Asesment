import { requireActor } from "@/lib/server/auth";
import { json, apiError, rateLimit, readJson } from "@/lib/server/http";
import { focusResumeInput } from "@/lib/assessment-support";
import { ensure } from "@/lib/domain/errors";
import { cbtRepository } from "@/lib/server/cbt/repository";
import { repository } from "@/lib/server/repository";
import { unlockFocus } from "@/lib/server/assessment-support-store";
import { cbtEnabled } from "@/lib/server/config";
export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    ensure(
      cbtEnabled() && actor.role === "teacher",
      "Izin lanjut hanya diberikan guru pengawas.",
      403,
    );
    rateLimit("focus:" + actor.id, 30);
    const input = focusResumeInput.parse(await readJson(request)),
      context = await repository().read(actor);
    await cbtRepository(actor).transact((state) => {
      const s = state.sittings.find((s) => s.id === input.sitting_id),
        e = state.exams.find((e) => e.id === s?.exam_id);
      ensure(
        s &&
          e &&
          e.teacher_id === actor.id &&
          context.classes.some(
            (c) => c.id === e.class_id && c.teacher_id === actor.id,
          ),
        "Pengerjaan tidak ditemukan.",
        404,
      );
      ensure(
        e.focus_guard &&
          e.status === "open" &&
          s.status === "active" &&
          Date.now() < Date.parse(s.deadline_at),
        "Pengerjaan sudah berakhir; izin lanjut tidak tersedia.",
        409,
      );
    });
    await unlockFocus(actor.id, input);
    return json({
      message:
        "Izin lanjut diberikan. Waktu dan jawaban sebelumnya tetap berlaku.",
    });
  } catch (e) {
    return apiError(e);
  }
}
