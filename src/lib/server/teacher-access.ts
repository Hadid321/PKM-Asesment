import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "node:crypto";
import { mode, supabaseServerConfig } from "./config";
import { createSupabaseServer } from "../supabase/server";
import { ensure, AppError } from "../domain/errors";

export function accessDb() {
  const { url, key } = supabaseServerConfig();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
export async function verifiedUser() {
  ensure(mode() === "supabase", "Fitur ini hanya tersedia pada akun sekolah.", 403);
  const { data: { user }, error } = await (await createSupabaseServer()).auth.getUser();
  ensure(!error && user, "Silakan masuk terlebih dahulu.", 401);
  ensure(user.email && user.email_confirmed_at, "Konfirmasi email terlebih dahulu.", 403);
  return { id: user.id, email: user.email.trim().toLowerCase() };
}
export async function isSchoolAdmin(id: string) {
  if (mode() !== "supabase") return false;
  const { data, error } = await accessDb().from("school_admins").select("user_id").eq("user_id", id).maybeSingle();
  // A rollout without the SQL migration must not break existing pages.
  if (error?.code === "42P01" || error?.code === "PGRST205") return false;
  if (error) throw new AppError("Pemeriksaan administrator gagal.", 503);
  return !!data;
}
export async function requireSchoolAdmin() {
  const user = await verifiedUser();
  ensure(await isSchoolAdmin(user.id), "Hanya administrator sekolah.", 403);
  return user;
}
export function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}
export function newCode() {
  return randomBytes(24).toString("base64url");
}
