import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { AuthForm } from "./auth-form";
import { PublicHeader } from "./public-header";
import { mode } from "@/lib/server/config";
import styles from "./public.module.css";
import { SCHOOL_NAME } from "@/lib/site";

export function AuthPage({
  register = false,
  status,
}: {
  register?: boolean;
  status?: string;
}) {
  let currentMode: "demo" | "supabase";
  try {
    currentMode = mode();
  } catch {
    return (
      <div className="status-page">
        <h1>Ruang belajar sedang disiapkan</h1>
        <p>
          Konfigurasi layanan perlu diperiksa oleh pengelola sekolah. Silakan
          coba kembali nanti.
        </p>
        <Link href="/">Kembali ke beranda</Link>
      </div>
    );
  }
  return (
    <div className={styles.publicPage}>
      <a className="skip-link" href="#auth-main">
        Langsung ke formulir
      </a>
      <PublicHeader auth />
      <main className={styles.authContent} id="auth-main">
        <aside className={styles.authIntro}>
          <p className={styles.eyebrow}>Adaptiva · {SCHOOL_NAME}</p>
          <h1>
            Ada ruang <br />
            untuk <em>belajar lagi.</em>
          </h1>
          <p>
            Pahami kemajuanmu, pelajari hal yang masih sulit, dan lanjutkan
            bersama guru.
          </p>
          <div className={styles.authLesson}>
            <BookOpen size={24} strokeWidth={1.4} />
            <div>
              <strong>Belajar dengan arah yang jelas</strong>
              <p>
                Latihan per topik, pembahasan jawaban, dan saran belajar untuk
                langkah berikutnya.
              </p>
            </div>
          </div>
          <div className={styles.authSubjects}>
            <span>Matematika</span>
            <span>Bahasa Indonesia</span>
            <span>Bahasa Inggris</span>
          </div>
        </aside>
        <section className={styles.authPanel} aria-labelledby="auth-title">
          <p className={styles.eyebrow}>
            {currentMode === "demo"
              ? "Pratinjau lokal"
              : register
                ? "Akun siswa"
                : "Selamat datang kembali"}
          </p>
          <h2 id="auth-title">
            {register
              ? "Mulai perjalanan belajarmu."
              : "Masuk ke ruang belajar."}
          </h2>
          <p className={styles.authDescription}>
            {currentMode === "demo"
              ? "Coba alur belajar dan pendampingan dengan data simulasi."
              : register
                ? "Gunakan email aktif untuk menerima tautan konfirmasi akun."
                : "Sudah pernah mendaftar? Gunakan email dan kata sandi yang sama; tidak perlu membuat akun baru."}
          </p>
          {status === "expired" && (
            <p className="notice">
              Silakan masuk untuk membuka kelas dan melanjutkan latihanmu.
            </p>
          )}
          {status === "confirmation-error" && (
            <p className="form-error" role="alert">
              Tautan konfirmasi tidak dapat digunakan atau sudah kedaluwarsa.
              Periksa apakah ada email konfirmasi yang lebih baru. Jika perlu,
              hubungi pengelola sekolah.
            </p>
          )}
          <AuthForm mode={currentMode} register={register} />
          <div className={styles.authHelp}>
            {currentMode === "demo" ? (
              <p>Pratinjau menggunakan data simulasi di komputer ini.</p>
            ) : (
              <p>
                <strong>Untuk guru</strong>Akun disiapkan oleh pengelola
                sekolah. Gunakan halaman masuk setelah menerima akun.
              </p>
            )}
          </div>
        </section>
      </main>
      <footer className={styles.authFooter}>
        <span>Setiap hasil latihan adalah bahan untuk belajar kembali.</span>
        <Link href="/">
          Tentang Adaptiva <ArrowUpRight size={14} />
        </Link>
      </footer>
    </div>
  );
}
