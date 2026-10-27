"use client";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { TextSizeToggle } from "@/components/text-size-toggle";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="status-page">
      <div className="reading-controls">
        <TextSizeToggle />
        <ThemeToggle />
      </div>
      <span className="status-symbol">!</span>
      <h1>Halaman belum dapat dimuat</h1>
      <p>
        Data belajar belum dapat ditampilkan. Coba muat ulang beberapa saat
        lagi. Jika masih terjadi, hubungi pengelola sekolah untuk memeriksa
        layanan.
      </p>
      <button className="btn primary" onClick={reset}>
        Coba lagi
      </button>
      <Link className="text-link" href="/login">
        Kembali ke halaman masuk
      </Link>
    </div>
  );
}
