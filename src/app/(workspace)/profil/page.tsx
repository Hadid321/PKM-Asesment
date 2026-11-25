import Link from "next/link";
import { isSchoolAdmin } from "@/lib/server/teacher-access";
import { pageData } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
import { Badge, Card, PageTitle } from "@/components/ui";
import { SimpleForm } from "@/components/actions";
export default async function Profile() {
  const data = await pageData();
  const admin = await isSchoolAdmin(data.actor.id);
  return (
    <>
      <PageTitle
        eyebrow="PENGATURAN"
        title="Profil Anda"
        description="Perbarui nama yang ditampilkan. Hubungi panitia PKM jika peran akun perlu diperiksa."
      />
      <div className="teacher-access-page teacher-access-narrow">
      <Card className="teacher-access-card">
        <div className="teacher-access-row-title">
        <Badge tone="green">
          {data.actor.role === "student" ? "Siswa" : "Guru"} ·{" "}
          {mode() === "demo" ? "Data simulasi" : "Akun sekolah"}
        </Badge>
        {admin && <Badge tone="blue">Administrator</Badge>}
        </div>
        <div>
          <SimpleForm
            action="profile"
            field="full_name"
            label="Nama lengkap"
            initial={data.actor.full_name}
            button="Simpan profil"
          />
        </div>
        <p className="muted small">
          Sesi kedaluwarsa akan meminta Anda masuk kembali. Hubungi pengelola
          untuk penghapusan atau koreksi data uji coba.
        </p>
      </Card>
      {mode() === "supabase" && data.actor.role === "student" && <Card className="teacher-access-card"><div className="teacher-access-heading"><h2>Akun guru</h2><p>Memiliki kode undangan sekolah?</p></div><Link className="btn secondary" href="/aktivasi-guru">Aktifkan akun guru</Link></Card>}
      {admin && <Card className="teacher-access-card"><div className="teacher-access-heading"><h2>Administrasi sekolah</h2><p>Kelola pendaftaran guru melalui undangan.</p></div><Link className="btn secondary" href="/admin">Kelola undangan guru</Link></Card>}
      </div>
    </>
  );
}
