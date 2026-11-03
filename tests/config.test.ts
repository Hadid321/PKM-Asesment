import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applicationOrigin,
  mode,
  supabaseConfig,
  supabaseServerConfig,
} from "@/lib/server/config";
import { AppError } from "@/lib/domain/errors";
import { stateSchema } from "@/lib/state-schema";
import { demoState } from "@/lib/demo/seed";
afterEach(() => vi.unstubAllEnvs());
describe("Mode eksplisit dan konfigurasi", () => {
  it.each(["", "ISI_SECRET_KEY_SUPABASE_DI_SINI", "sb_publishable_local_test"])(
    "menolak key administratif kosong, placeholder, atau publishable: %s",
    (key) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
      vi.stubEnv(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
        "sb_publishable_local_test",
      );
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", key);
      expect(() => supabaseServerConfig()).toThrow(AppError);
    },
  );
  it("mengenali bentuk secret modern dan legacy service_role tanpa memverifikasi kredensial", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_publishable_local_test",
    );
    const legacy = (role: string) =>
      `local.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.test`;
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", legacy("anon"));
    expect(() => supabaseServerConfig()).toThrow(AppError);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", legacy("service_role"));
    expect(supabaseServerConfig().key).toBe(legacy("service_role"));
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_local_test");
    expect(supabaseServerConfig().key).toBe("sb_secret_local_test");
  });
  it("URL callback berasal dari APP_URL dan menolak skema selain HTTP(S)", () => {
    vi.stubEnv("APP_URL", "https://sekolah.example.org/");
    expect(applicationOrigin()).toBe("https://sekolah.example.org");
    vi.stubEnv("APP_URL", "javascript:alert(1)");
    expect(() => applicationOrigin()).toThrow(AppError);
  });
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
    expect(() => supabaseConfig()).toThrow(AppError);
  });
  it("menolak mode yang salah", () => {
    vi.stubEnv("APP_MODE", "salah");
    expect(() => mode()).toThrow(AppError);
  });
  it("menolak filesystem demo pada Vercel", () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("VERCEL", "1");
    expect(() => mode()).toThrow(AppError);
  });
});
