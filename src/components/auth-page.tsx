import { ArrowUpRight, BookOpen, ClipboardList, Users } from "lucide-react";
import { AuthForm } from "./auth-form";
import { Brand } from "./shell";
import { ThemeToggle } from "./theme-toggle";
import { mode } from "@/lib/server/config";
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
  } catch (error) {
    return (
      <div className="status-page">
        <h1>Konfigurasi perlu dilengkapi</h1>
        <p>{(error as Error).message}</p>
      </div>
    );
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand href="/login" />
        <div className="auth-story-content">
          <div className="auth-kicker">
            <span />
            PROGRAM PENGABDIAN MASYARAKAT
          </div>
          <h1>
            Asesmen yang jelas.
            <br />
            <span>
              Pendampingan <br />
              yang terarah.
            </span>
          </h1>
          <p>
            Ruang kerja bersama guru dan siswa SMA untuk melihat pemahaman,
            menyusun latihan, dan menentukan tindak lanjut belajar.
          </p>
          <div className="auth-workflow">
            <div>
              <span>01</span>
              <BookOpen size={20} />
              <strong>Latihan dari guru</strong>
              <p>Soal dikelola oleh guru kelas.</p>
            </div>
            <div>
              <span>02</span>
              <ClipboardList size={20} />
              <strong>Hasil per topik</strong>
              <p>Jawaban dan estimasi tersimpan.</p>
            </div>
            <div>
              <span>03</span>
              <Users size={20} />
              <strong>Pendampingan kelas</strong>
              <p>Guru melihat kebutuhan siswanya.</p>
            </div>
          </div>
        </div>
        <div className="auth-story-footer">
          <span>ADAPTIVA / MITRA SEKOLAH SMA</span>
          <ArrowUpRight size={17} />
        </div>
      </aside>
      <main className="auth-main">
        <div className="auth-topline">
          <span>
            {currentMode === "demo"
              ? "LINGKUNGAN DEMONSTRASI"
              : "AKSES SEKOLAH"}
          </span>
          <ThemeToggle />
        </div>
        <div className="auth-card">
          <span className="auth-step">
            {register ? "AKUN SISWA" : "SELAMAT DATANG"}
          </span>
          <h2>{register ? "Buat akun siswa." : "Masuk ke Adaptiva."}</h2>
          <p>
            {register
              ? "Daftarkan akun, lalu bergabung ke kelas menggunakan kode dari guru."
              : currentMode === "demo"
                ? "Pilih peran untuk mencoba alur siswa atau guru dengan data simulasi."
                : "Gunakan akun Anda untuk mengakses kelas dan hasil belajar."}
          </p>
          {status === "expired" && (
            <p className="notice">
              Sesi belum tersedia atau sudah berakhir. Silakan masuk kembali.
            </p>
          )}
          {status === "confirmation-error" && (
            <p className="form-error">
              Tautan konfirmasi tidak valid atau kedaluwarsa. Hubungi pengelola
              sekolah jika Anda membutuhkan bantuan.
            </p>
          )}
          <AuthForm mode={currentMode} register={register} />
          <div className="auth-privacy">
            <span className="program-dot" />
            <p>
              {currentMode === "demo"
                ? "Data demo disimpan di komputer ini. Gunakan akun sekolah pada mode Supabase untuk kegiatan pendampingan sebenarnya."
                : "Akun guru disiapkan oleh pengelola. Pendaftaran mandiri hanya tersedia untuk siswa."}
            </p>
          </div>
        </div>
        <div className="auth-bottomline">
          Asesmen formatif. Hasil model membantu pendampingan guru.
        </div>
      </main>
    </div>
  );
}
