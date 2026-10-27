import { requireActor } from "@/lib/server/auth";
import { repository } from "@/lib/server/repository";
import { dashboard } from "@/lib/server/assessment";
import { apiError, json } from "@/lib/server/http";
export async function GET() {
  try {
    return json(await dashboard(repository(), await requireActor()));
  } catch (error) {
    return apiError(error);
  }
}
