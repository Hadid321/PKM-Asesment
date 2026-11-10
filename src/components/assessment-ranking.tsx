import type { RankRow } from "@/lib/server/cbt/ranking";
export function AssessmentRanking({
  rows,
  teacher = false,
}: {
  rows: RankRow[] | null;
  teacher?: boolean;
}) {
  if (!rows?.length) return null;
  return (
    <section className="assessment-ranking" aria-label="Peringkat asesmen">
      <h3>Peringkat asesmen</h3>
      <p className="muted">
        {teacher
          ? "Peserta yang sudah mengumpulkan, diurutkan berdasarkan jawaban benar."
          : "Hanya untuk asesmen ini. Identitas peserta lain disamarkan."}{" "}
        Nilai sama mendapat peringkat yang sama; waktu pengerjaan tidak
        menentukan peringkat.
      </p>
      <div className="table-wrap">
        <table>
          <caption className="sr-only">
            Peringkat berdasarkan jumlah jawaban benar
          </caption>
          <thead>
            <tr>
              <th scope="col">Peringkat</th>
              <th scope="col">Peserta</th>
              <th scope="col">Benar</th>
              <th scope="col">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.is_you ? "ranking-self" : undefined}>
                <th scope="row">{r.rank}</th>
                <td>{r.label}</td>
                <td>
                  {r.correct}/{r.total}
                </td>
                <td>{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
