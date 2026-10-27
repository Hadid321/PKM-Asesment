import { pageData } from "@/lib/server/page-data";
import { StudentDashboard, TeacherDashboard } from "@/components/dashboard";
import { SubjectNav } from "@/components/subject-nav";
import { selectedSubject } from "@/lib/subjects";
export default async function Dashboard({
  searchParams,
}: PageProps<"/dashboard">) {
  const subject = selectedSubject((await searchParams).mapel);
  const data = await pageData(undefined, subject);
  return (
    <>
      <SubjectNav subject={subject} base="/dashboard" />
      {data.actor.role === "student" ? (
        <StudentDashboard data={data} />
      ) : (
        <TeacherDashboard data={data} />
      )}
    </>
  );
}
