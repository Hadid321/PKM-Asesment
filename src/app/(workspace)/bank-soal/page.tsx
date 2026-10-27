import Link from "next/link";
import { Upload } from "lucide-react";
import { pageData, pageState } from "@/lib/server/page-data";
import { PageTitle } from "@/components/ui";
import { QuestionManager } from "@/components/teacher-forms";
export default async function Bank() {
  const data = await pageData("teacher");
  const state = await pageState();
  return (
    <>
      <PageTitle
        eyebrow="BANK SOAL"
        title="Bank soal"
        description="Soal yang Anda buat atau unggah. Hanya siswa di kelas Anda yang dapat mengerjakannya."
        action={
          <Link className="btn secondary" href="/impor">
            <Upload size={17} />
            Impor CSV
          </Link>
        }
      />
      <p className="muted">
        <Link className="text-link" href="/paket-soal">
          Tinjau paket latihan kelas XII untuk tiga mapel wajib →
        </Link>
      </p>
      <QuestionManager
        questions={state.questions}
        topics={data.topics}
        actorId={data.actor.id}
      />
    </>
  );
}
