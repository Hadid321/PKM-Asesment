import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { applicationOrigin } from "@/lib/server/config";
function redirect(path: string) {
  const response = NextResponse.redirect(new URL(path, applicationOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const code = request.nextUrl.searchParams.get("code");
  if (
    hash &&
    hash.length < 2048 &&
    request.nextUrl.searchParams.get("type") === "email"
  ) {
    try {
      const { error } = await (
        await createSupabaseServer()
      ).auth.verifyOtp({ token_hash: hash, type: "email" });
      if (!error) return redirect("/dashboard");
    } catch {
      /* Pesan netral tanpa token atau error provider. */
    }
  }
  // Mendukung template bawaan Supabase dengan alur PKCE pada browser pendaftaran.
  if (!hash && code && code.length < 2048) {
    try {
      const { error } = await (
        await createSupabaseServer()
      ).auth.exchangeCodeForSession(code);
      if (!error) return redirect("/dashboard");
    } catch {
      // Tautan salah/kedaluwarsa tidak pernah diteruskan ke URL bebas.
    }
  }
  return redirect("/login?status=confirmation-error");
}
