import Link from "next/link";
import { redirect } from "next/navigation";
import { pageActor } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
import { accessDb, isSchoolAdmin } from "@/lib/server/teacher-access";
import { Card, PageTitle } from "@/components/ui";
import { TeacherAccessForm } from "@/components/teacher-access-form";

export const dynamic = "force-dynamic";
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
  return <>
    <PageTitle eyebrow="ADMINISTRASI SEKOLAH" title="Akun guru" description="Kelola undangan registrasi guru tanpa membuka database." />
    <Card className="narrow-card"><h2>Undang guru</h2><p className="muted">Kode terikat pada satu alamat email, berlaku tujuh hari dan hanya bisa digunakan sekali.</p><TeacherAccessForm action="issue" /></Card>
    <Card><h2>Undangan terakhir</h2><div className="stack">
      {invites.data?.length === 0 && <p className="muted">Belum ada undangan.</p>}
      {invites.data?.map((i) => {
        const status = i.redeemed_at ? "Digunakan" : i.revoked_at ? "Dicabut" : Date.parse(i.expires_at) <= Date.now() ? "Kedaluwarsa" : "Aktif";
        return <div key={i.id} className="notice"><strong>{i.email}</strong><p>{status} · Berlaku sampai {new Date(i.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</p>{status === "Aktif" && <TeacherAccessForm action="revoke" id={i.id} />}</div>;
      })}
    </div></Card>
    <Card><h2>Daftar guru</h2><p className="muted">Menampilkan hingga 200 akun.</p><ul>{teachers.data?.map((t) => <li key={t.id}>{t.full_name}</li>)}</ul></Card>
    <Card><h2>Aktivitas undangan</h2><ul>{logs.data?.map((l) => <li key={l.id}>{l.action === "issue" ? "Dibuat" : l.action === "revoke" ? "Dicabut" : "Digunakan"} · {new Date(l.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB · {l.invitation_id.slice(0, 8)}</li>)}</ul></Card>
    <Link href="/dashboard">Kembali ke dashboard</Link>
  </>;
}
