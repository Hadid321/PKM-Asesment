import Link from "next/link";
export default function NotFound() {
  return (
    <div className="status-page">
      <h1>Halaman tidak ditemukan</h1>
      <p>Alamat ini tidak tersedia.</p>
      <Link className="btn primary" href="/dashboard">
        Ke dashboard
      </Link>
    </div>
  );
}
