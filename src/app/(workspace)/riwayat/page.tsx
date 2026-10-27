import { BKT } from "@/lib/domain/bkt";
import Link from "next/link";
import { pageData } from "@/lib/server/page-data";
import {
  Badge,
  Card,
  date,
  Empty,
  EstimateNote,
  PageTitle,
  percent,
} from "@/components/ui";
export default async function History() {
  const data = await pageData("student");
  return (
    <>
      <PageTitle
        eyebrow="JEJAK BELAJAR"
        title="Riwayat latihan"
        description="Tinjau jawaban, pembahasan, dan perubahan estimasi pada setiap sesi."
      />
      <Card>
        {data.sessions.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Topik / tanggal</th>
                  <th>Status</th>
                  <th>Jawaban benar</th>
                  <th>BKT akhir sesi</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {[...data.sessions]
                  .sort((a, b) => b.started_at.localeCompare(a.started_at))
                  .map((s) => {
                    const a = data.attempts.filter(
                      (a) => a.session_id === s.id,
                    );
                    return (
                      <tr key={s.id}>
                        <td>
                          <strong>
                            {data.topics.find((t) => t.id === s.topic_id)?.name}
                          </strong>
                          <small>{date(s.started_at)}</small>
                        </td>
                        <td>
                          <Badge
                            tone={s.status === "completed" ? "green" : "amber"}
                          >
                            {s.status === "completed"
                              ? "Selesai"
                              : "Berlangsung"}
                          </Badge>
                        </td>
                        <td>
                          {a.filter((a) => a.is_correct).length} / {a.length}
                        </td>
                        <td>{percent(a.at(-1)?.p_after ?? BKT.initial)}</td>
                        <td>
                          <Link
                            className="text-link"
                            href={
                              s.status === "completed"
                                ? `/hasil/${s.id}`
                                : `/kuis/${s.id}`
                            }
                          >
                            {s.status === "completed"
                              ? "Lihat hasil"
                              : "Lanjutkan"}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>Belum ada riwayat latihan.</Empty>
        )}
      </Card>
      <EstimateNote />
    </>
  );
}
