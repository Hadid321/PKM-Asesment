import { requireActor } from "@/lib/server/auth";
import { repository } from "@/lib/server/repository";
import { quizView } from "@/lib/server/assessment";
import { apiError, json } from "@/lib/server/http";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    return json(
      await quizView(
        repository(),
        await requireActor("student"),
        (await context.params).id,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
