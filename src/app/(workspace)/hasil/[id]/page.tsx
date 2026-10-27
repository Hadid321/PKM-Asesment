import { BKT } from "@/lib/domain/bkt";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { pageActor } from "@/lib/server/page-data";
import { repository } from "@/lib/server/repository";
import { dashboard, quizView } from "@/lib/server/assessment";
import { AppError } from "@/lib/domain/errors";
import {
  Badge,
  Card,
  date,
  EstimateNote,
  MaterialLink,
  PageTitle,
  percent,
} from "@/components/ui";
import { StartButton } from "@/components/actions";
export default async function Result({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  if (actor.role !== "student") redirect("/akses");
  const { id } = await params;
  let data;
  try {
    data = await quizView(repository(), actor, id);
  } catch (e) {
    if (
      (e instanceof AppError && e.status === 404) ||
      !/^[a-f0-9-]{36}$/i.test(id)
    )
      notFound();
    throw e;
  }
  if (data.session.status !== "completed") redirect(`/kuis/${id}`);
  const summary = await dashboard(repository(), actor);
  const next = summary.recommendations[0];
  const correct = data.attempts.filter((a) => a.is_correct).length;
  return (
    <>
      <PageTitle
        eyebrow="RINGKASAN SESI"
        title="Hasil latihan"
        description={`${data.topic.name} · ${date(data.session.started_at)} · ${data.session.end_reason}`}
      />
      <Card className="result-summary">
        <span className="result-check">
          <CheckCircle2 size={31} />
        </span>
        <h2>Hasil sesi tersimpan.</h2>
        <p className="muted">
          Lihat hasilmu, pahami pembahasan, lalu lanjutkan dengan arah yang
          lebih jelas.
        </p>
        <div className="result-metrics">
          <div>
            <strong>
              {correct}/{data.attempts.length}
            </strong>
            <span>Jawaban benar</span>
          </div>
          <div>
            <strong>
              {data.attempts.length
                ? percent(correct / data.attempts.length)
                : "—"}
            </strong>
            <span>Persentase jawaban benar</span>
          </div>
          <div>
            <strong>
              {percent(data.attempts.at(-1)?.p_after ?? BKT.initial)}
            </strong>
            <span>Estimasi BKT akhir sesi</span>
          </div>
        </div>
      </Card>
      <Card className="mt">
        <Badge tone="green">
          {data.session.summary_source === "groq"
            ? "Penjelasan tambahan oleh Groq"
            : "Ringkasan otomatis berbasis hasil asesmen"}
        </Badge>
        <p className="summary-text">{data.session.summary}</p>
        {data.topic.material_url && (
          <MaterialLink href={data.topic.material_url}>
            {data.topic.material_title || "Buka materi guru"}
          </MaterialLink>
        )}
      </Card>
      {next && (
        <Card className="mt recommendation-row">
          <div className="grow">
            <Badge tone="amber">Prioritas berikutnya dari sistem</Badge>
            <h2>{next.name}</h2>
            <p>{next.reason}</p>
          </div>
          <StartButton topicId={next.topic_id} />
        </Card>
      )}
      <Card className="mt">
        <div className="section-head">
          <div>
            <h2>Pembahasan jawaban</h2>
            <p>Pembahasan sesuai bank soal pada saat jawaban dinilai</p>
          </div>
        </div>
        {data.attempts.map((a, i) => (
          <details key={a.id} className="review-detail" open={!a.is_correct}>
            <summary>
              <Badge tone={a.is_correct ? "green" : "amber"}>
                {a.is_correct ? "Benar" : "Perlu ditinjau"}
              </Badge>
              <span>
                {i + 1}. {a.question_text}
              </span>
            </summary>
            <p>{a.explanation}</p>
            <small>
              Jawabanmu: {a.selected_option} · Jawaban tepat: {a.correct_option}{" "}
              · BKT: {percent(a.p_before)} → {percent(a.p_after)}
            </small>
          </details>
        ))}
      </Card>
      <EstimateNote />
      <Link className="text-link" href="/dashboard">
        Kembali ke ringkasan belajar
      </Link>
    </>
  );
}
