import { CbtHome } from "@/components/cbt-home";
import { Card, PageTitle } from "@/components/ui";
import { pageActor } from "@/lib/server/page-data";
import { cbtEnabled, cbtService } from "@/lib/server/cbt/repository";
export default async function Exams() {
  const actor = await pageActor();
  if (!cbtEnabled())
    return (
      <>
        <PageTitle
          title="Ujian CBT"
          description="Ujian sedang disiapkan oleh panitia."
        />
        <Card>Guru akan memberi tahu saat ujian dapat dibuka.</Card>
      </>
    );
  return <CbtHome initial={await (await cbtService(actor)).list()} />;
}
