import { requireActor } from "@/lib/server/auth";
import { json, apiError, rateLimit, readJson } from "@/lib/server/http";
import { briefInput } from "@/lib/assessment-support";
import { learningBrief } from "@/lib/server/assessment-brief";
import { cbtEnabled } from "@/lib/server/config";
import { ensure } from "@/lib/domain/errors";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    ensure(cbtEnabled(), "Asesmen sedang disiapkan.", 503);
    rateLimit("brief:" + actor.id, 10);
    const input = briefInput.parse(await readJson(request));
    const result = await learningBrief(actor, input.target_id);
    return json(result, result.pending ? 202 : 200);
  } catch (e) {
    return apiError(e);
  }
}
