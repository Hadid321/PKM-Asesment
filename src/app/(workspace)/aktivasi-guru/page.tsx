import Link from "next/link";
import { redirect } from "next/navigation";
import { pageActor } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
import { Card, PageTitle } from "@/components/ui";
import { TeacherAccessForm } from "@/components/teacher-access-form";
export const dynamic = "force-dynamic";
export default async function ActivateTeacher() {
  const actor = await pageActor();
  if (mode() !== "supabase") redirect("/dashboard");
  return <>
    <PageTitle eyebrow="AKUN SEKOLAH" title="Aktivasi akun guru" description="Gunakan kode undangan yang diberikan administrator sekolah." />
    <Card className="narrow-card teacher-access-card">
      {actor.role === "teacher" ? <><p>Akun Anda sudah aktif sebagai guru.</p><Link className="btn secondary" href="/dashboard">Buka dashboard</Link></> :
        <><p className="muted">Pastikan email akun telah dikonfirmasi dan sesuai dengan email tujuan undangan.</p><TeacherAccessForm action="redeem" /></>}
    </Card>
  </>;
}
