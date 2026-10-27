import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: async () => ({ auth: mocks }),
}));
import { GET } from "@/app/auth/confirm/route";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_URL", "https://pkm-aja.vercel.app");
});
afterEach(() => vi.unstubAllEnvs());
function call(query: string) {
  // Reverse proxy boleh memakai origin internal; tujuan harus tetap APP_URL.
  return GET(new NextRequest(`http://localhost:3000/auth/confirm?${query}`));
}
describe("Konfirmasi email SSR", () => {
  it("menukar token hash menjadi cookie sesi melalui client server, lalu menghapus query token", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    const response = await call(
      "token_hash=local-test&type=email&next=https://evil.example",
    );
    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "local-test",
      type: "email",
    });
    expect(response.headers.get("location")).toBe(
      "https://pkm-aja.vercel.app/dashboard",
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("mendukung kode PKCE template bawaan Supabase", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await call("code=local-code");
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("local-code");
    expect(response.headers.get("location")).toBe(
      "https://pkm-aja.vercel.app/dashboard",
    );
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });
  it.each([
    "",
    "token_hash=local-test&type=recovery",
    "token_hash=" + "a".repeat(2048) + "&type=email",
  ])("menolak parameter konfirmasi yang tidak sesuai", async (query) => {
    expect((await call(query)).headers.get("location")).toBe(
      "https://pkm-aja.vercel.app/login?status=confirmation-error",
    );
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("kode gagal atau token kedaluwarsa kembali ke masuk dengan pesan netral", async () => {
    mocks.verifyOtp.mockResolvedValue({
      error: { message: "private provider error" },
    });
    expect(
      (await call("token_hash=expired&type=email")).headers.get("location"),
    ).toBe("https://pkm-aja.vercel.app/login?status=confirmation-error");
    mocks.exchangeCodeForSession.mockRejectedValue(new Error("private error"));
    expect((await call("code=expired")).headers.get("location")).toBe(
      "https://pkm-aja.vercel.app/login?status=confirmation-error",
    );
  });
});
