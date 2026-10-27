import { Shell } from "@/components/shell";
import { pageActor } from "@/lib/server/page-data";
import { mode } from "@/lib/server/config";
export const dynamic = "force-dynamic";
export default async function Workspace({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await pageActor();
  return (
    <Shell actor={actor} mode={mode()}>
      {children}
    </Shell>
  );
}
