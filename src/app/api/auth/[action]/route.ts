import { z } from "zod";
import { enterDemo, signOut } from "@/lib/server/auth";
import { mode } from "@/lib/server/config";
import { apiError, json, rateLimit, readJson } from "@/lib/server/http";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loginInput, registerInput } from "@/lib/validation";
import { ensure } from "@/lib/domain/errors";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    const input = await readJson(request);
    const { action } = await context.params;
    rateLimit(
      `auth:${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"}`,
      25,
    );
    if (action === "logout") {
      await signOut();
      return json({ redirect: "/login" });
    }
    if (action === "demo") {
      const { role } = z
        .object({ role: z.enum(["student", "teacher"]) })
        .strict()
        .parse(input);
      await enterDemo(role);
      return json({ redirect: "/dashboard" });
    }
    ensure(
      mode() === "supabase",
      "Gunakan tombol masuk demo. Akun sungguhan hanya tersedia dalam mode Supabase.",
      400,
    );
    const supabase = await createSupabaseServer();
    if (action === "login") {
      const data = loginInput.parse(input);
      const { error } = await supabase.auth.signInWithPassword(data);
      ensure(
        !error,
        "Email atau kata sandi tidak sesuai, atau email belum dikonfirmasi.",
        401,
      );
      return json({ redirect: "/dashboard" });
    }
    if (action === "register") {
      const { full_name, email, password } = registerInput.parse(input);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
      ensure(
        !error,
        "Pendaftaran belum dapat diproses. Periksa isian atau coba lagi nanti.",
      );
      return json({
        message:
          "Pendaftaran diproses. Periksa email konfirmasi sebelum masuk. Jika email sudah terdaftar, gunakan halaman masuk.",
      });
    }
    return json({ error: "Endpoint tidak ditemukan." }, 404);
  } catch (error) {
    return apiError(error);
  }
}
