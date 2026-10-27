import { afterEach, describe, expect, it, vi } from "vitest";
import { mode, supabaseConfig } from "@/lib/server/config";
import { stateSchema } from "@/lib/state-schema";
import { demoState } from "@/lib/demo/seed";
afterEach(() => vi.unstubAllEnvs());
describe("Mode eksplisit dan konfigurasi", () => {
  it("memeriksa data eksternal dan menolak probabilitas rusak", () => {
    const state = demoState();
    expect(stateSchema.safeParse(state).success).toBe(true);
    state.mastery[0].p_l = 2;
    expect(stateSchema.safeParse(state).success).toBe(false);
  });
  it("tidak mengganti Supabase ke demo saat konfigurasi kosong", () => {
    vi.stubEnv("APP_MODE", "supabase");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect(mode()).toBe("supabase");
    expect(() => supabaseConfig()).toThrow("Konfigurasi Supabase");
  });
  it("menolak mode yang salah", () => {
    vi.stubEnv("APP_MODE", "salah");
    expect(() => mode()).toThrow("APP_MODE");
  });
  it("menolak filesystem demo pada Vercel", () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("VERCEL", "1");
    expect(() => mode()).toThrow("Mode demo");
  });
});
