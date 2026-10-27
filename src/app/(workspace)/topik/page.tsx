import { pageData } from "@/lib/server/page-data";
import { PageTitle } from "@/components/ui";
import { TopicManager } from "@/components/teacher-forms";
export default async function Topics() {
  const data = await pageData("teacher");
  return (
    <>
      <PageTitle
        eyebrow="TOPIK & MATERI"
        title="Topik & materi"
        description="Hubungkan topik dengan prasyarat dan materi pilihan guru. Relasi melingkar ditolak."
      />
      <TopicManager topics={data.topics} prerequisites={data.prerequisites} />
    </>
  );
}
