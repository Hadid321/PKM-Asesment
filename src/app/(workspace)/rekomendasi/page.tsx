import { pageData } from "@/lib/server/page-data";
import {
  Badge,
  Card,
  EstimateNote,
  MaterialLink,
  PageTitle,
  percent,
} from "@/components/ui";
import { StartButton } from "@/components/actions";
import { SubjectNav } from "@/components/subject-nav";
import { selectedSubject } from "@/lib/subjects";
export default async function Recommendations({
  searchParams,
}: PageProps<"/rekomendasi">) {
  const subject = selectedSubject((await searchParams).mapel);
  const data = await pageData("student", subject);
  return (
    <>
      <SubjectNav subject={subject} base="/rekomendasi" />
      <PageTitle
        eyebrow="ARAH BELAJAR"
        title="Rencana belajar"
        description="Urutan ditentukan BKT dan prasyarat topik. Penjelasan AI tidak mengubah prioritas ini."
      />
      <div className="stack">
        {data.recommendations.map((r, i) => {
          const t = data.topics.find((t) => t.id === r.topic_id)!;
          return (
            <Card key={r.topic_id} className="recommendation-row">
              <span className="step-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="grow">
                <Badge tone={i === 0 ? "amber" : "neutral"}>
                  {i === 0 ? "Pelajari terlebih dahulu" : "Langkah selanjutnya"}
                </Badge>
                <h2>{r.name}</h2>
                <p>{r.reason}</p>
                <p className="muted">
                  Estimasi penguasaan saat ini:{" "}
                  <strong>{percent(r.p_l)}</strong>
                </p>
                {t.material_url && (
                  <MaterialLink href={t.material_url}>
                    {t.material_title || "Buka materi guru"}
                  </MaterialLink>
                )}
              </div>
              {data.questionCounts.some(
                (q) => q.topic_id === r.topic_id && q.count > 0,
              ) ? (
                <StartButton secondary topicId={r.topic_id} />
              ) : (
                <Badge>Menunggu soal guru</Badge>
              )}
            </Card>
          );
        })}
      </div>
      <Card className="mt">
        <h2>Belajar dari jawaban yang belum tepat</h2>
        {data.attempts
          .filter((a) => !a.is_correct)
          .slice(-5)
          .reverse()
          .map((a) => (
            <details className="review-detail" key={a.id}>
              <summary>{a.question_text}</summary>
              <p>{a.explanation}</p>
              <small>
                Jawabanmu {a.selected_option} · Kunci setelah dinilai:{" "}
                {a.correct_option}
              </small>
            </details>
          ))}
        {!data.attempts.some((a) => !a.is_correct) && (
          <p className="muted">Belum ada jawaban salah yang perlu ditinjau.</p>
        )}
      </Card>
      <EstimateNote />
    </>
  );
}
