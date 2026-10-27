import { pageData } from "@/lib/server/page-data";
import { PageTitle } from "@/components/ui";
import { CsvImport } from "@/components/teacher-forms";
export default async function Import() {
  await pageData("teacher");
  return (
    <>
      <PageTitle
        eyebrow="IMPOR CSV"
        title="Unggah soal"
        description="Validasi seluruh file terlebih dahulu. Soal duplikat dilaporkan dan dilewati."
      />
      <CsvImport />
    </>
  );
}
