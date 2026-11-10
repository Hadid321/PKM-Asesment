import { notFound, redirect } from "next/navigation";
import { CbtPlayer } from "@/components/cbt-player";
import { pageActor } from "@/lib/server/page-data";
import { cbtService } from "@/lib/server/cbt/repository";
import { AppError } from "@/lib/domain/errors";
export default async function ExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await pageActor();
  if (actor.role !== "student") redirect("/akses");
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  let initial;
  try {
    initial = await (await cbtService(actor)).view(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  return <CbtPlayer initial={initial} />;
}
