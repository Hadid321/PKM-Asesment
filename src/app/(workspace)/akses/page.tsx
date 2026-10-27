import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
export default function Access() {
  return (
    <>
      <PageTitle
        title="Halaman ini memiliki akses terbatas"
        description="Peran akun Anda tidak memiliki akses ke fitur ini."
      />
      <Card>
        <p>
          Gunakan navigasi yang sesuai dengan peran Anda. Perubahan peran hanya
          melalui administrator.
        </p>
        <Link className="btn primary" href="/dashboard">
          Kembali ke dashboard
        </Link>
      </Card>
    </>
  );
}
