import { pageData } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
import { Badge, Card, PageTitle } from "@/components/ui";
import { SimpleForm } from "@/components/actions";
export default async function Profile() {
  const data = await pageData();
  return (
    <>
      <PageTitle
        eyebrow="PENGATURAN"
        title="Profil Anda"
        description="Perbarui nama yang ditampilkan. Hubungi panitia PKM jika peran akun perlu diperiksa."
      />
      <Card className="narrow-card">
        <Badge tone="green">
          {data.actor.role === "student" ? "Siswa" : "Guru"} ·{" "}
          {mode() === "demo" ? "Data simulasi" : "Akun sekolah"}
        </Badge>
        <div className="mt">
          <SimpleForm
            action="profile"
            field="full_name"
            label="Nama lengkap"
            initial={data.actor.full_name}
            button="Simpan profil"
          />
        </div>
        <p className="muted small mt">
          Sesi kedaluwarsa akan meminta Anda masuk kembali. Hubungi pengelola
          untuk penghapusan atau koreksi data uji coba.
        </p>
      </Card>
    </>
  );
}
