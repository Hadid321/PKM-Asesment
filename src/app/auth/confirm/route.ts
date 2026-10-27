import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  if (
    hash &&
    hash.length < 2048 &&
    request.nextUrl.searchParams.get("type") === "email"
  ) {
    try {
      const { error } = await (
        await createSupabaseServer()
      ).auth.verifyOtp({ token_hash: hash, type: "email" });
      if (!error)
        return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch {
      /* Pesan netral tanpa token atau error provider. */
    }
  }
  return NextResponse.redirect(
    new URL("/login?status=confirmation-error", request.url),
  );
}
