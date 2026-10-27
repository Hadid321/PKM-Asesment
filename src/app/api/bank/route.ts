import { requireActor } from "@/lib/server/auth";
import { repository } from "@/lib/server/repository";
import { apiError, json } from "@/lib/server/http";
export async function GET() {
  try {
    return json(
      (await repository().read(await requireActor("teacher"))).questions,
    );
  } catch (error) {
    return apiError(error);
  }
}
