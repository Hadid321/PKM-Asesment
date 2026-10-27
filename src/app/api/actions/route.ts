import { requireActor } from "@/lib/server/auth";
import { repository } from "@/lib/server/repository";
import { execute } from "@/lib/server/assessment";
import { summarize } from "@/lib/server/explanation";
import { apiError, json, rateLimit, readJson } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    rateLimit(`actions:${actor.id}`, 90);
    const input = await readJson(request);
    const repo = repository();
    const result = await execute(repo, actor, input);
    if ("completed" in result && result.completed && "session_id" in result) {
      // Jawaban sudah tersimpan. Kegagalan penjelasan tidak boleh membatalkan penilaian.
      await summarize(repo, actor, result.session_id).catch(() => undefined);
    }
    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
