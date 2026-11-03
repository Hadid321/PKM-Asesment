import { afterEach, describe, expect, it, vi } from "vitest";
import { readJson, apiError } from "@/lib/server/http";
import { applicationOrigin } from "@/lib/server/config";
import { AppError } from "@/lib/domain/errors";
import { SCHOOL_ORIGIN } from "@/lib/site";
afterEach(() => vi.unstubAllEnvs());
function request(origin: string | null, headers: Record<string, string> = {}) {
  return new Request("https://internal-host.invalid/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    body: JSON.stringify({ example: "no credentials" }),
  });
}
describe("Perpindahan domain sekolah tetap menjaga perlindungan permintaan", () => {
  it("menerima domain sekolah persis tanpa bergantung pada host internal atau proxy", async () => {
    vi.stubEnv("APP_URL", SCHOOL_ORIGIN);
    expect(applicationOrigin()).toBe(SCHOOL_ORIGIN);
    await expect(readJson(request(SCHOOL_ORIGIN))).resolves.toEqual({
      example: "no credentials",
    });
  });
  it.each([
    "https://pkm-aja.vercel.app",
    "https://adaptiva-sman1pp.my.id",
    "https://www.adaptiva-sman1pp.my.id.evil.test",
    null,
  ])("menolak origin yang tidak disetel: %s", async (origin) => {
    vi.stubEnv("APP_URL", SCHOOL_ORIGIN);
    await expect(
      readJson(
        request(origin, { "x-forwarded-host": "www.adaptiva-sman1pp.my.id" }),
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("hosting tidak diam-diam memakai alamat lokal ketika alamat aplikasi kosong", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("APP_URL", "");
    expect(() => applicationOrigin()).toThrow("Alamat ruang belajar");
  });
  it("pesan kegagalan layanan tidak memperlihatkan nama database atau detail server", async () => {
    const r = apiError(
      new AppError("Supabase service_role database secret detail", 503),
    );
    expect(r.status).toBe(503);
    const body = await r.json();
    expect(body.error).toContain("panitia PKM");
    expect(body.error).not.toMatch(/Supabase|service_role|database|secret/i);
  });
});
