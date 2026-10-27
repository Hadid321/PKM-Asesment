import { pageData } from "@/lib/server/page-data";
import { Badge, Card, date, Empty, PageTitle } from "@/components/ui";
import { CopyCode, SimpleForm } from "@/components/actions";
export default async function Classes() {
  const data = await pageData();
  const teacher = data.actor.role === "teacher";
  return (
    <>
      <PageTitle
        eyebrow={teacher ? "KELOLA KELAS" : "KELAS SAYA"}
        title={teacher ? "Kelola kelas" : "Kelas saya"}
        description={
          teacher
            ? "Buat kelas dan bagikan kodenya kepada siswa yang menjadi tanggung jawab Anda."
            : "Bergabung menggunakan kode yang dibagikan guru."
        }
      />
      <div className="dashboard-columns">
        <div className="stack">
          {data.classes.map((c) => (
            <Card key={c.id}>
              <div className="section-head">
                <div>
                  <Badge tone="green">
                    {teacher ? "Kelas Anda" : "Sudah tergabung"}
                  </Badge>
                  <h2 className="mt">{c.name}</h2>
                </div>
                {teacher && <CopyCode code={c.class_code} />}
              </div>
              {teacher ? (
                <>
                  <p className="muted">
                    {data.members.filter((m) => m.class_id === c.id).length}{" "}
                    siswa tergabung
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Nama siswa</th>
                          <th>Bergabung</th>
                          <th>Aktivitas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.members
                          .filter((m) => m.class_id === c.id)
                          .map((m) => (
                            <tr key={m.student_id}>
                              <td>
                                {
                                  data.students.find(
                                    (s) => s.id === m.student_id,
                                  )?.full_name
                                }
                              </td>
                              <td>{date(m.joined_at)}</td>
                              <td>
                                {
                                  data.attempts.filter(
                                    (a) => a.student_id === m.student_id,
                                  ).length
                                }{" "}
                                jawaban
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="muted">
                  Latihan kelas ini menggunakan soal yang dibuat atau diunggah
                  oleh gurumu.
                </p>
              )}
            </Card>
          ))}
          {!data.classes.length && (
            <Card>
              <Empty>
                Belum ada kelas.{" "}
                {teacher
                  ? "Buat kelas pertama Anda."
                  : "Masukkan kode dari guru untuk bergabung."}
              </Empty>
            </Card>
          )}
        </div>
        <Card>
          <h2>{teacher ? "Buat kelas baru" : "Bergabung ke kelas"}</h2>
          <p className="muted">
            {teacher
              ? "Kode unik dibuat secara otomatis. Bagikan hanya kepada siswa kelas Anda."
              : "Kode kelas peka terhadap karakter. Huruf kecil akan diubah menjadi kapital."}
          </p>
          <SimpleForm
            action={teacher ? "create-class" : "join-class"}
            field={teacher ? "name" : "code"}
            label={teacher ? "Nama kelas" : "Kode kelas"}
            placeholder={teacher ? "Contoh: XII MIPA 2" : "Masukkan kode kelas"}
            button={teacher ? "Buat kelas" : "Gabung kelas"}
          />
        </Card>
      </div>
    </>
  );
}
