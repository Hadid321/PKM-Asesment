import "server-only";
import { AppError } from "../domain/errors";
export function mode(): "demo" | "supabase" {
  const value = process.env.APP_MODE ?? "demo";
  if (value !== "demo" && value !== "supabase")
    throw new AppError(
      "Ruang belajar sedang disiapkan. Hubungi panitia PKM.",
      503,
    );
  if (value === "demo" && process.env.VERCEL)
    throw new AppError(
      "Ruang belajar sedang disiapkan. Hubungi panitia PKM.",
      503,
    );
  return value;
}
export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !/^https:\/\//.test(url))
    throw new AppError(
      "Layanan akun belum siap. Coba lagi nanti atau hubungi panitia PKM.",
      503,
    );
  return { url, key };
}

// Pemeriksaan bentuk konfigurasi; validitas key tetap diperiksa oleh Supabase.
export function supabaseServerConfig() {
  const { url } = supabaseConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let legacyRole: unknown;
  try {
    legacyRole = JSON.parse(
      Buffer.from(key?.split(".")[1] ?? "", "base64url").toString("utf8"),
    ).role;
  } catch {
    // Secret key modern tidak berbentuk JWT.
  }
  if (
    !key ||
    /ISI_|YOUR_|PLACEHOLDER|CHANGEME/i.test(key) ||
    (!/^sb_secret_[A-Za-z0-9_-]+$/.test(key) && legacyRole !== "service_role")
  )
    throw new AppError(
      "Data belajar belum dapat diakses. Hubungi panitia PKM.",
      503,
    );
  return { url, key };
}

export function applicationOrigin() {
  try {
    if (process.env.VERCEL && !process.env.APP_URL?.trim())
      throw new Error("Missing application origin");
    const url = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      (process.env.VERCEL && url.protocol !== "https:")
    )
      throw new Error("Invalid origin");
    return url.origin;
  } catch {
    throw new AppError(
      "Alamat ruang belajar belum siap. Hubungi panitia PKM.",
      503,
    );
  }
}
