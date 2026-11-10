import { z } from "zod";
import { requireActor } from "@/lib/server/auth";
import { apiError, json, rateLimit, readJson } from "@/lib/server/http";
import { cbtService } from "@/lib/server/cbt/repository";
import { SUBJECTS } from "@/lib/subjects";
export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const service = await cbtService(actor);
    const sitting = new URL(request.url).searchParams.get("sitting");
    const preview = new URL(request.url).searchParams.get("preview");
    if (preview)
      return json({ items: service.preview(z.enum(SUBJECTS).parse(preview)) });
    return json(
      sitting
        ? await service.view(z.uuid().parse(sitting))
        : await service.list(),
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    rateLimit("cbt:" + actor.id, 120);
    const input = await readJson(request);
    return json(await (await cbtService(actor)).execute(input));
  } catch (e) {
    return apiError(e);
  }
}
