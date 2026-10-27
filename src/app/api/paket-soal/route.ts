import { z } from "zod";
import { requireActor } from "@/lib/server/auth";
import { apiError } from "@/lib/server/http";
import { curriculumPackage } from "@/lib/server/curriculum-content";
import { CURRICULUM_SOURCES } from "@/lib/curriculum/catalog";
import { SUBJECTS } from "@/lib/subjects";
import { CSV_COLUMNS, csvCell } from "@/lib/domain/csv";
export async function GET(request: Request) {
  try {
    await requireActor("teacher");
    const subject = z
      .enum(SUBJECTS)
      .parse(new URL(request.url).searchParams.get("mapel"));
    const pack = curriculumPackage(subject);
    const rows = pack.questions.map((q) =>
      [
        q.topic_slug,
        q.question_text,
        q.options.A,
        q.options.B,
        q.options.C,
        q.options.D,
        q.correct_option,
        { easy: "mudah", medium: "sedang", hard: "sulit" }[q.difficulty],
        `${q.explanation}\nLatihan orisinal ${pack.version}/${q.code}. Acuan: ${CURRICULUM_SOURCES[2].url}`,
      ]
        .map(csvCell)
        .join(","),
    );
    return new Response(
      "\uFEFF" + CSV_COLUMNS.join(",") + "\r\n" + rows.join("\r\n"),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="paket-xii-${subject}.csv"`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
