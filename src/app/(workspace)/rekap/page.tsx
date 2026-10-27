import { pageData } from "@/lib/server/page-data";
import { SubjectWorkspace } from "@/components/subject-workspace";

export default async function Page() {
  const data = await pageData("teacher");
  return <SubjectWorkspace initial={data} view="reports" />;
}
