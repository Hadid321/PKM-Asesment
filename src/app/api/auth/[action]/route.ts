import { z } from "zod";
import { enterDemo, signOut } from "@/lib/server/auth";
import { mode } from "@/lib/server/config";
import { apiError, json, rateLimit, readJson } from "@/lib/server/http";
import { createSupabaseServer } from "@/lib/supabase/server";
import { loginInput, registerInput } from "@/lib/validation";
import { ensure } from "@/lib/domain/errors";
import {
  authFailure,
  isExistingRegistration,
  registrationMessage,
} from "@/lib/server/auth-errors";
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
    if (action === "login") {
      const data = loginInput.parse(input);
      const supabase = await createSupabaseServer();
      const { error } = await supabase.auth.signInWithPassword(data);
      if (error) {
        const { status, ...body } = authFailure(error, "login");
        return json(body, status);
      }
      return json({ redirect: "/dashboard" });
    }
    if (action === "register") {
      const { full_name, email, password } = registerInput.parse(input);
      const supabase = await createSupabaseServer();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
      if (error && !isExistingRegistration(error)) {
        const { status, ...body } = authFailure(error, "register");
        // Hanya kode/status untuk diagnosis. Jangan catat isian formulir atau pesan provider.
        console.warn("auth_registration_failed", {
          code: body.code,
          providerStatus: error.status,
        });
        return json(body, status);
      }
      if (!error && data.session) return json({ redirect: "/dashboard" });
      return json({ message: registrationMessage });
    }
    return json({ error: "Endpoint tidak ditemukan." }, 404);
  } catch (error) {
    return apiError(error);
  }
}
