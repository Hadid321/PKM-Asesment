import { Card, PageTitle } from "@/components/ui";
export default function Guide() {
  return (
    <>
      <PageTitle
        eyebrow="PANDUAN"
        title="Panduan penggunaan"
        description="Panduan singkat untuk prototipe asesmen Matematika kelas XII."
      />
      <div className="topic-grid">
        <Card className="prose">
          <h2>Untuk siswa</h2>
          <ol>
            <li>Masuk dan bergabung ke kelas melalui kode guru.</li>
            <li>Buka Latihan adaptif atau ikuti Rekomendasi.</li>
            <li>
              Pilih jawaban lalu kirim. Pembahasan muncul setelah jawaban
              tersimpan.
            </li>
            <li>
              Tekan Lanjutkan. Sesi berakhir setelah maksimal 10 soal, soal
              habis, atau ambang BKT tercapai.
            </li>
            <li>
              Tinjau hasil, baca materi guru, lalu mulai latihan berikutnya.
            </li>
          </ol>
        </Card>
        <Card className="prose">
          <h2>Untuk guru</h2>
          <ol>
            <li>Buat kelas, salin kode, lalu bagikan kepada siswa.</li>
            <li>Kelola topik, prasyarat, dan tautan materi.</li>
            <li>Tambahkan soal sendiri atau validasi dan impor CSV.</li>
            <li>Pantau rekap siswa dan estimasi tiap topik.</li>
            <li>
              Ekspor CSV untuk analisis uji coba yang sudah memperoleh
              persetujuan.
            </li>
          </ol>
        </Card>
        <Card className="prose">
          <h2>Memahami ukuran hasil</h2>
          <p>
            Persentase jawaban benar adalah jumlah jawaban benar dibagi jumlah
            jawaban. BKT memperkirakan penguasaan topik dari urutan jawaban,
            dengan asumsi peluang menebak, terpeleset, dan belajar.
          </p>
          <p>
            Topik baru dimulai dari 30%. Ambang 95% adalah penanda prototipe,
            bukan sertifikasi. Parameter belum dikalibrasi secara ilmiah.
          </p>
        </Card>
        <Card className="prose">
          <h2>Demo dan data sekolah</h2>
          <p>
            Mode demo memakai tokoh simulasi dan berkas lokal. Hasilnya diberi
            label dan harus dipisahkan dari penelitian. Akun demo dibagikan
            untuk presentasi lokal, sehingga tidak sesuai untuk data sungguhan.
          </p>
          <p>
            Mode Supabase memakai akun dan database eksternal. Ringkasan
            template selalu tersedia. Groq hanya opsional dan sumber penjelasan
            ditampilkan.
          </p>
        </Card>
      </div>
    </>
  );
}
