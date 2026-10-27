import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { currentActor } from "./auth";
import { dashboard } from "./assessment";
import { repository } from "./repository";
import type { Role } from "../types";
import type { Subject } from "../subjects";
export const pageActor = cache(async () => {
  const actor = await currentActor();
  if (!actor) redirect("/login?status=expired");
  return actor;
});
export async function pageData(role?: Role, subject?: Subject) {
  const actor = await pageActor();
  if (role && actor.role !== role) redirect("/akses");
  return dashboard(repository(), actor, subject);
}
