import Link from "next/link";
import { redirect } from "next/navigation";
import { pageActor } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
import { accessDb, isSchoolAdmin } from "@/lib/server/teacher-access";
import { Badge, Card, PageTitle } from "@/components/ui";
import { TeacherAccessForm } from "@/components/teacher-access-form";

export const dynamic = "force-dynamic";

function dateTime(value: string) {
  return new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
}

export default async function AdminPage() {
  const actor = await pageActor();
  if (mode() !== "supabase" || !(await isSchoolAdmin(actor.id))) redirect("/akses");
  const db = accessDb();
  const [invites, teachers, logs] = await Promise.all([
    db.from("teacher_invitations").select("id,email,created_at,expires_at,revoked_at,redeemed_at").order("created_at", { ascending: false }).limit(100),
    db.from("profiles").select("id,full_name,created_at").eq("role", "teacher").order("full_name").limit(200),
    db.from("teacher_access_logs").select("id,action,created_at,invitation_id").order("created_at", { ascending: false }).limit(30),
  ]);
  if (invites.error || teachers.error || logs.error) throw new Error("Data administrasi belum dapat dimuat.");
  return (
    <>
      <PageTitle eyebrow="ADMINISTRASI SEKOLAH" title="Akun guru" description="Kelola undangan registrasi guru tanpa membuka database." />
      <div className="teacher-access-page">
        <Card className="teacher-access-card">
          <div className="teacher-access-heading">
            <h2>Undang guru</h2>
            <p>Kode terikat pada satu alamat email, berlaku tujuh hari dan hanya bisa digunakan sekali.</p>
          </div>
          <TeacherAccessForm action="issue" />
        </Card>

        <Card className="teacher-access-card">
          <div className="teacher-access-heading">
            <h2>Undangan terakhir</h2>
          </div>
          {!invites.data?.length ? (
            <p className="teacher-access-empty">Belum ada undangan.</p>
          ) : (
            <ul className="teacher-access-list">
              {invites.data.map((i) => {
                const status = i.redeemed_at ? "Digunakan" : i.revoked_at ? "Dicabut" : Date.parse(i.expires_at) <= Date.now() ? "Kedaluwarsa" : "Aktif";
                return (
                  <li key={i.id} className="teacher-access-row">
                    <div className="teacher-access-row-main">
                      <div className="teacher-access-row-title">
                        <strong>{i.email}</strong>
                        <Badge tone={status === "Aktif" ? "green" : status === "Kedaluwarsa" ? "amber" : "neutral"}>{status}</Badge>
                      </div>
                      <p>Berlaku sampai {dateTime(i.expires_at)}</p>
                    </div>
                    {status === "Aktif" && <TeacherAccessForm action="revoke" id={i.id} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="teacher-access-card">
          <div className="teacher-access-heading">
            <h2>Daftar guru</h2>
            <p>Menampilkan hingga 200 akun.</p>
          </div>
          {!teachers.data?.length ? (
            <p className="teacher-access-empty">Belum ada akun guru.</p>
          ) : (
            <ul className="teacher-access-list">
              {teachers.data.map((t) => (
                <li key={t.id} className="teacher-access-row">
                  <strong>{t.full_name}</strong>
                  <Badge tone="green">Guru</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="teacher-access-card">
          <div className="teacher-access-heading">
            <h2>Aktivitas undangan</h2>
          </div>
          {!logs.data?.length ? (
            <p className="teacher-access-empty">Belum ada aktivitas undangan.</p>
          ) : (
            <ul className="teacher-access-list">
              {logs.data.map((l) => (
                <li key={l.id} className="teacher-access-row">
                  <div className="teacher-access-row-main">
                    <strong>Undangan {l.action === "issue" ? "dibuat" : l.action === "revoke" ? "dicabut" : "digunakan"}</strong>
                    <p>{dateTime(l.created_at)}</p>
                  </div>
                  <span className="muted small tabular">{l.invitation_id.slice(0, 8)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="teacher-access-footer">
          <Link className="btn secondary" href="/dashboard">Kembali ke dashboard</Link>
        </div>
      </div>
    </>
  );
}
