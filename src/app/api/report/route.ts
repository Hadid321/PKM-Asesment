import { requireActor } from "@/lib/server/auth";
import { repository } from "@/lib/server/repository";
import { dashboard } from "@/lib/server/assessment";
import { csvCell } from "@/lib/domain/csv";
import { mode } from "@/lib/server/config";
import { apiError } from "@/lib/server/http";
export async function GET() {
  try {
    const data = await dashboard(repository(), await requireActor("teacher"));
    const rows: unknown[][] = [
      [
        "mode",
        "student_id_pseudonim",
        "session_id",
        "topic",
        "question_id",
        "correct",
        "p_before",
        "p_after",
        "answered_at",
      ],
    ];
    for (const a of data.attempts)
      rows.push([
        mode(),
        a.student_id,
        a.session_id,
        data.topics.find((t) => t.id === a.topic_id)?.name,
        a.question_id,
        a.is_correct,
        a.p_before,
        a.p_after,
        a.answered_at,
      ]);
    return new Response(
      "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="asesmen-adaptiva.csv"',
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
