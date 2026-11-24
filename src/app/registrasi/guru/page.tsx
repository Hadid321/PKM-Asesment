import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import styles from "@/components/public.module.css";
export const dynamic = "force-dynamic";
export default function RegisterTeacher() {
  return <div className={styles.publicPage}><PublicHeader auth />
    <main className={styles.authContent}>
      <aside className={styles.authIntro}><p className={styles.eyebrow}>Adaptiva · Akun sekolah</p><h1>Ruang untuk <em>mengajar.</em></h1><p>Kelola kelas, bank soal, dan asesmen siswa dengan akun guru terverifikasi.</p></aside>
      <section className={styles.authPanel}><h2>Daftar sebagai guru</h2><p className={styles.authDescription}>Minta undangan dari administrator sekolah. Akun baru belum memiliki akses guru sampai undangan berhasil diaktifkan.</p>
      <ol className="stack"><li>Buat akun menggunakan email yang dituju undangan.</li><li>Konfirmasi email, lalu masuk ke Adaptiva.</li><li>Aktifkan akun dengan kode undangan.</li></ol>
      <div className="stack"><Link className="btn primary full" href="/registrasi">Buat akun baru</Link><Link className="btn secondary full" href="/aktivasi-guru">Saya sudah punya akun — aktivasi</Link><Link href="/login">Kembali ke halaman masuk</Link></div>
      </section>
    </main></div>;
}
