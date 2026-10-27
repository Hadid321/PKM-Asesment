import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  createClient: vi.fn(),
  enterDemo: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: mocks.createClient,
}));
vi.mock("@/lib/server/auth", () => ({
  enterDemo: mocks.enterDemo,
  signOut: mocks.signOut,
}));
import { POST } from "@/app/api/auth/[action]/route";

const student = {
  full_name: "Siswa Uji",
  email: "siswa@example.org",
  password: "Test-only_92!",
};
function call(
  action: string,
  body: unknown,
  origin = "https://sekolah.example.org",
  ip = crypto.randomUUID(),
) {
  return POST(
    new Request(`https://sekolah.example.org/api/auth/${action}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ action }) },
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_MODE", "supabase");
  vi.stubEnv("APP_URL", "https://sekolah.example.org");
  mocks.createClient.mockResolvedValue({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("Registrasi dan masuk Supabase", () => {
  it("menolak email rusak sebelum menghubungi Supabase", async () => {
    const response = await call("register", {
      ...student,
      email: "alamat-rusak",
    });
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("meneruskan email yang telah dirapikan, tanpa menerima role dari pengguna", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    expect(
      (await call("register", { ...student, email: "  siswa@example.org  " }))
        .status,
    ).toBe(200);
    expect(mocks.signUp).toHaveBeenCalledWith({
      email: student.email,
      password: student.password,
      options: {
        data: { full_name: student.full_name },
        emailRedirectTo: "https://sekolah.example.org/auth/confirm",
      },
    });
    const response = await call("register", { ...student, role: "teacher" });
    expect(response.status).toBe(400);
    expect(mocks.signUp).toHaveBeenCalledTimes(1);
  });
  it("30 pendaftaran dari jaringan sekolah tidak ditolak limiter aplikasi", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const ip = crypto.randomUUID();
    for (let i = 0; i < 30; i++) {
      const response = await call(
        "register",
        { ...student, email: `siswa${i}@example.org` },
        "https://sekolah.example.org",
        ip,
      );
      expect(response.status).toBe(200);
    }
    expect(mocks.signUp).toHaveBeenCalledTimes(30);
  });
  it("menjelaskan penolakan alamat email tanpa mengekspos pesan provider", async () => {
    mocks.signUp.mockResolvedValue({
      data: null,
      error: {
        code: "email_address_invalid",
        status: 400,
        message: 'Email "private@example.org" is invalid',
      },
    });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await call("register", student);
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.field).toBe("email");
    expect(body.error).toContain("email aktif");
    expect(JSON.stringify(body)).not.toContain("private@example.org");
    expect(JSON.stringify(warning.mock.calls)).not.toContain(student.email);
    expect(JSON.stringify(warning.mock.calls)).not.toContain(student.password);
    warning.mockRestore();
  });
  it.each([
    ["email_address_not_authorized", 503, "layanan email"],
    ["over_email_send_rate_limit", 429, "dibatasi"],
    ["weak_password", 422, "Kata sandi"],
    ["unexpected_failure", 503, "Pendaftaran"],
  ])(
    "membedakan %s dari kesalahan isian biasa",
    async (code, status, message) => {
      mocks.signUp.mockResolvedValue({
        data: null,
        error: { code, status: 400 },
      });
      const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
      const response = await call("register", student);
      expect(response.status).toBe(status);
      expect((await response.json()).error.toLowerCase()).toContain(
        message.toLowerCase(),
      );
      warning.mockRestore();
    },
  );
  it("memberikan pesan netral yang sama untuk email terdaftar dan pendaftaran baru", async () => {
    mocks.signUp
      .mockResolvedValueOnce({ data: { session: null }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { code: "user_already_exists", status: 422 },
      });
    const fresh = await call("register", student);
    const existing = await call("register", student);
    expect(existing.status).toBe(fresh.status);
    expect(await existing.json()).toEqual(await fresh.json());
  });
  it("mengarahkan ke ruang belajar hanya jika Supabase benar-benar memberi sesi", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "fake-local-test-session" } },
      error: null,
    });
    expect(await (await call("register", student)).json()).toEqual({
      redirect: "/dashboard",
    });
  });
  it("memberi arahan konfirmasi email saat login", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "email_not_confirmed", status: 400 },
    });
    const response = await call("login", {
      email: student.email,
      password: student.password,
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toContain("Email belum dikonfirmasi");
  });
  it("tetap menolak registrasi lintas origin", async () => {
    expect(
      (await call("register", student, "https://asing.example.org")).status,
    ).toBe(403);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
