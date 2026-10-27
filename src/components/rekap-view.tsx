"use client";
import type { DashboardData } from "@/lib/server/assessment";
import { BKT } from "@/lib/domain/bkt";
import { Download } from "lucide-react";
import { questionSummary } from "@/lib/question-summary";
import {
  Badge,
  Card,
  date,
  Empty,
  EstimateNote,
  PageTitle,
  percent,
} from "@/components/ui";
export function ReportsView({ data }: { data: DashboardData }) {
  return (
    <>
      <PageTitle
        eyebrow="REKAP ASESMEN"
        title="Hasil asesmen kelas"
        description="Hanya siswa yang tergabung dalam kelas Anda. Nilai tanpa riwayat memakai prior model."
        action={
          <a className="btn secondary" href="/api/report" download>
            <Download size={17} />
            Ekspor percobaan CSV
          </a>
        }
      />
      <Card>
        {data.students.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Soal / benar</th>
                  {data.topics.map((t) => (
                    <th key={t.id}>
                      {t.name}
                      <small>BKT</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((s) => {
                  const attempts = data.attempts.filter(
                    (a) => a.student_id === s.id,
                  );
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.full_name}</strong>
                        <small>
                          {data.classes
                            .filter((c) =>
                              data.members.some(
                                (m) =>
                                  m.class_id === c.id && m.student_id === s.id,
                              ),
                            )
                            .map((c) => c.name)
                            .join(", ")}
                        </small>
                      </td>
                      <td>
                        {attempts.length} soal
                        <small>
                          {attempts.length
                            ? percent(
                                attempts.filter((a) => a.is_correct).length /
                                  attempts.length,
                              )
                            : "—"}{" "}
                          benar
                        </small>
                      </td>
                      {data.topics.map((t) => {
                        const m = data.mastery.find(
                          (m) => m.student_id === s.id && m.topic_id === t.id,
                        );
                        return (
                          <td key={t.id}>
                            <Badge
                              tone={
                                m && m.p_l > 0.6
                                  ? "green"
                                  : m
                                    ? "amber"
                                    : "neutral"
                              }
                            >
                              {percent(m?.p_l ?? BKT.initial)}
                            </Badge>
                            {!m && <small>Belum berlatih</small>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Belum ada siswa dalam kelas Anda.</Empty>
        )}
      </Card>
      <div className="mt stack">
        {data.students.map((s) => (
          <Card key={s.id}>
            <details>
              <summary className="student-detail-summary">
                Detail asesmen · {s.full_name}
              </summary>
              <div className="table-wrap mt">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Topik / soal</th>
                      <th>Jawaban</th>
                      <th>BKT sesudah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.attempts
                      .filter((a) => a.student_id === s.id)
                      .slice(-100)
                      .reverse()
                      .map((a) => (
                        <tr key={a.id}>
                          <td>{date(a.answered_at)}</td>
                          <td>
                            <small>
                              {
                                data.topics.find((t) => t.id === a.topic_id)
                                  ?.name
                              }
                            </small>
                            <details className="report-question">
                              <summary>
                                {questionSummary(a.question_text)}
                              </summary>
                              <p className="question-stimulus">
                                {a.question_text}
                              </p>
                            </details>
                          </td>
                          <td>
                            <Badge tone={a.is_correct ? "green" : "amber"}>
                              {a.selected_option} ·{" "}
                              {a.is_correct ? "Benar" : "Salah"}
                            </Badge>
                          </td>
                          <td>{percent(a.p_after)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
          </Card>
        ))}
      </div>
      <EstimateNote />
      <p className="small muted">
        CSV memakai UUID sebagai pseudonim, tanpa nama dan email. UUID masih
        dapat dihubungkan kembali oleh administrator, sehingga bukan anonimisasi
        penuh. Tampilan detail dibatasi 100 jawaban terbaru per siswa; ekspor
        memuat seluruh percobaan yang diizinkan.
      </p>
    </>
  );
}
