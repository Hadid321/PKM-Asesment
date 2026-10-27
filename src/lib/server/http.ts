import "server-only";
import { ZodError } from "zod";
import { AppError, ensure } from "../domain/errors";
import { applicationOrigin } from "./config";
const buckets = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit = 60) {
  const now = Date.now();
  if (buckets.size > 10000)
    for (const [k, v] of buckets) if (v.until < now) buckets.delete(k);
  let item = buckets.get(key);
  if (!item || item.until < now) {
    item = { count: 0, until: now + 60000 };
    buckets.set(key, item);
  }
  item.count++;
  ensure(
    item.count <= limit,
    "Terlalu banyak permintaan. Tunggu satu menit lalu coba lagi.",
    429,
  );
}
export async function readJson(request: Request) {
  const origin = request.headers.get("origin");
  // Next dapat memakai host internal berbeda pada Request.url; gunakan origin konfigurasi tetap.
  const expectedOrigin = applicationOrigin();
  ensure(origin === expectedOrigin, "Asal permintaan tidak diizinkan.", 403);
  ensure(
    request.headers.get("content-type")?.includes("application/json"),
    "Gunakan JSON.",
    415,
  );
  const reader = request.body?.getReader();
  ensure(reader, "Permintaan kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 600000) {
      await reader.cancel();
      throw new AppError("Permintaan maksimal 600 KB.", 413);
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new AppError("JSON tidak valid.");
  }
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function apiError(error: unknown) {
  if (error instanceof ZodError)
    return json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      400,
    );
  if (error instanceof AppError)
    return json({ error: error.message }, error.status);
  return json(
    {
      error:
        "Permintaan belum dapat diproses. Coba lagi atau hubungi pengelola.",
    },
    500,
  );
}
