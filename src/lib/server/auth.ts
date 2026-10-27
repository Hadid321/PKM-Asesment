import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { DEMO_STUDENT, DEMO_TEACHER } from "../demo/seed";
import { demoRepository, runtime } from "./repository";
import { mode } from "./config";
import { createSupabaseServer } from "../supabase/server";
import { AppError, ensure } from "../domain/errors";
import type { Profile, Role } from "../types";
export const DEMO_COOKIE = "adaptiva_demo";
const sign = (s: string) =>
  createHmac("sha256", runtime.secret).update(s).digest("hex");
export async function enterDemo(role: Role) {
  ensure(mode() === "demo", "Login demo tidak tersedia.", 403);
  const payload = `${role === "student" ? DEMO_STUDENT : DEMO_TEACHER}.${Date.now() + 8 * 3600000}`;
  (await cookies()).set(DEMO_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 8 * 3600,
  });
}
export async function currentActor(): Promise<Profile | null> {
  if (mode() === "demo") {
    const raw = (await cookies()).get(DEMO_COOKIE)?.value;
    if (!raw) return null;
    const [id, expiry, signature] = raw.split(".");
    if (
      !id ||
      !expiry ||
      !signature ||
      !/^\d+$/.test(expiry) ||
      Number(expiry) < Date.now()
    )
      return null;
    const expected = sign(`${id}.${expiry}`);
    if (
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
    const role: Role = id === DEMO_STUDENT ? "student" : "teacher";
    const state = await demoRepository.read({
      id,
      role,
      full_name: "",
      created_at: "",
    });
    return state.profiles.find((p) => p.id === id) ?? null;
  }
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name,role,created_at")
    .eq("id", user.id)
    .single();
  if (profileError || !data || !["student", "teacher"].includes(data.role))
    throw new AppError(
      "Profil belum tersedia. Minta administrator memeriksa migration.",
      503,
    );
  return data as Profile;
}
export async function requireActor(role?: Role): Promise<Profile> {
  const actor = await currentActor();
  ensure(actor, "Sesi telah berakhir. Silakan masuk kembali.", 401);
  if (role)
    ensure(
      actor.role === role,
      "Anda tidak memiliki akses ke halaman ini.",
      403,
    );
  return actor;
}
export async function signOut() {
  if (mode() === "supabase") {
    const { error } = await (await createSupabaseServer()).auth.signOut();
    if (error) throw new AppError("Belum dapat keluar. Coba lagi.", 503);
  }
  (await cookies()).delete(DEMO_COOKIE);
}
