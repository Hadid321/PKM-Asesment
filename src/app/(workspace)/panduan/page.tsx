import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { pageActor } from "@/lib/server/page-data";
import { SCHOOL_NAME } from "@/lib/site";

export default async function Guide() {
  const actor = await pageActor();
  const student = actor.role === "student";
  return (
    <>
      <PageTitle
        eyebrow={`PANDUAN / ${SCHOOL_NAME}`}
        title={
          student
            ? "Mulai belajar dalam 3 langkah"
            : "Siapkan kelas dalam 3 langkah"
        }
        description="Panduan kegiatan PKM. Pilih menu sesuai kebutuhan; tidak perlu memahami istilah teknis untuk mulai menggunakan Adaptiva."
      />
      <div className="topic-grid">
        {student ? (
          <>
            <Card className="prose">
              <h2>1. Bergabung ke kelas</h2>
              <p>
                Minta kode kelas kepada guru atau panitia. Buka Kelas saya,
                masukkan kode, lalu tekan Gabung kelas. Cukup dilakukan sekali.
              </p>
              <Link className="btn secondary" href="/kelas">
                Buka Kelas saya
              </Link>
            </Card>
            <Card className="prose">
              <h2>2. Pilih mapel dan kerjakan</h2>
              <p>
                Buka Latihan, pilih Matematika, Bahasa Inggris, atau Bahasa
                Indonesia. Tekan Mulai latihan pada topik yang ingin dipelajari.
              </p>
              <p>
                Pilih satu jawaban, tekan Kirim jawaban, baca pembahasannya,
                lalu tekan Lanjutkan. Satu sesi maksimal 10 soal dan tidak
                memakai hitung mundur.
              </p>
              <Link className="btn secondary" href="/latihan">
                Pilih latihan
              </Link>
            </Card>
            <Card className="prose">
              <h2>3. Pelajari hasilnya</h2>
              <p>
                Setelah sesi selesai, lihat jawaban dan pembahasan pada Hasil
                latihan. Buka materi pendamping atau ikuti topik berikutnya pada
                Rencana belajar.
              </p>
              <Link className="btn secondary" href="/rekomendasi">
                Lihat rencana belajar
              </Link>
            </Card>
          </>
        ) : (
          <>
            <Card className="prose">
              <h2>1. Buat kelas dan bagikan kode</h2>
              <p>
                Buka Kelas &amp; siswa, isi nama kelas, lalu tekan Buat kelas.
                Bagikan kode hanya kepada peserta kegiatan. Siswa menggunakan
                akun masing-masing untuk bergabung.
              </p>
              <Link className="btn secondary" href="/kelas">
                Kelola kelas
              </Link>
            </Card>
            <Card className="prose">
              <h2>2. Siapkan soal tiga mapel</h2>
              <p>
                Buka Paket kelas XII. Pilih setiap mapel, tinjau soal dan
                kuncinya, centang peninjauan, lalu impor ke bank Anda. Siswa
                yang bergabung ke kelas Anda dapat langsung berlatih.
              </p>
              <p>
                Anda juga dapat menambah soal lewat Bank soal atau Unggah soal.
                Mengimpor ulang paket yang sama tidak menggandakan soal.
              </p>
              <Link className="btn secondary" href="/paket-soal">
                Buka paket kelas XII
              </Link>
            </Card>
            <Card className="prose">
              <h2>3. Dampingi dan pantau hasil</h2>
              <p>
                Minta siswa memilih mapel dan mencoba satu sesi. Buka Hasil
                asesmen untuk melihat jawaban dan perkiraan pemahaman tiap
                topik. Tentukan tindak lanjut bersama siswa.
              </p>
              <Link className="btn secondary" href="/rekap">
                Lihat hasil asesmen
              </Link>
            </Card>
          </>
        )}
        <Card className="prose">
          <h2>Memahami hasil belajar</h2>
          <p>
            Persentase jawaban benar menunjukkan berapa soal yang dijawab dengan
            tepat. Estimasi BKT adalah perkiraan pemahaman berdasarkan urutan
            jawaban; keduanya merupakan ukuran berbeda.
          </p>
          <p>
            Topik baru memakai perkiraan awal 30%. Angka ini bukan nilai rapor.
            Ambang 95% membantu memilih latihan berikutnya, bukan jaminan bahwa
            semua materi sudah dikuasai.
          </p>
        </Card>
        <Card className="prose">
          <h2>Jika membutuhkan bantuan</h2>
          <ul>
            <li>
              Soal belum muncul: periksa apakah sudah bergabung ke kelas dan
              guru sudah menyiapkan soal.
            </li>
            <li>
              Tautan email tidak dapat dibuka: gunakan email konfirmasi terbaru,
              lalu masuk kembali.
            </li>
            <li>
              Halaman terhenti: muat ulang. Jawaban yang sudah mendapat
              pembahasan telah tersimpan.
            </li>
            <li>
              Teks terlalu kecil: tekan tombol Aa. Tombol tema mengganti
              tampilan terang atau gelap.
            </li>
          </ul>
          <p>
            Jika masih terkendala, tunjukkan pesan pada layar kepada guru atau
            panitia PKM. Jangan membagikan kata sandi.
          </p>
        </Card>
      </div>
    </>
  );
}
