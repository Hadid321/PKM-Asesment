import { redirect, notFound } from "next/navigation";
import { Quiz } from "@/components/quiz";
import { pageActor } from "@/lib/server/page-data";
import { repository } from "@/lib/server/repository";
import { quizView } from "@/lib/server/assessment";
import { AppError } from "@/lib/domain/errors";
export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  if (actor.role !== "student") redirect("/akses");
  const { id } = await params;
  let data;
  try {
    data = await quizView(repository(), actor, id);
  } catch (e) {
    if (
      (e instanceof AppError && e.status === 404) ||
      !/^[a-f0-9-]{36}$/i.test(id)
    )
      notFound();
    throw e;
  }
  if (data.session.status === "completed") redirect(`/hasil/${id}`);
  return <Quiz initial={data} />;
}
