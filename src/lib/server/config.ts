import "server-only";
import { AppError } from "../domain/errors";
export function mode(): "demo" | "supabase" {
  const value = process.env.APP_MODE ?? "demo";
  if (value !== "demo" && value !== "supabase")
    throw new AppError("APP_MODE harus demo atau supabase.", 503);
  if (value === "demo" && process.env.VERCEL)
    throw new AppError(
      "Mode demo menggunakan berkas lokal. Pilih APP_MODE=supabase untuk hosting Vercel.",
      503,
    );
  return value;
}
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url))
    throw new AppError(
      "Konfigurasi Supabase belum lengkap. Isi URL, publishable key, dan service role key sesuai README.",
      503,
    );
  return { url, key };
}
