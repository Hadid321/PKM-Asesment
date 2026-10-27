"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="status-page">
      <span className="status-symbol">!</span>
      <h1>Halaman belum dapat dimuat</h1>
      <p>
        Periksa koneksi atau konfigurasi Supabase di server. Mode yang dipilih
        tidak diganti secara otomatis.
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
