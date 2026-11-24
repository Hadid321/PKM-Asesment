import { z } from "zod";
import { apiError, json, rateLimit, readJson } from "@/lib/server/http";
import { accessDb, hashCode, newCode, requireSchoolAdmin, verifiedUser } from "@/lib/server/teacher-access";
import { AppError, ensure } from "@/lib/domain/errors";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("issue"), email: z.string().trim().email().max(254) }).strict(),
  z.object({ action: z.literal("revoke"), id: z.string().uuid() }).strict(),
  z.object({ action: z.literal("redeem"), code: z.string().trim().regex(/^[A-Za-z0-9_-]{32}$/) }).strict(),
]);
export async function POST(request: Request) {
  try {
    const input = inputSchema.parse(await readJson(request));
    const user = input.action === "redeem" ? await verifiedUser() : await requireSchoolAdmin();
    rateLimit(`teacher-access:${user.id}`, 10);
    const db = accessDb();
    if (input.action === "issue") {
      const code = newCode();
      const { error } = await db.rpc("issue_teacher_invitation", {
        p_actor: user.id, p_email: input.email.toLowerCase(), p_hash: hashCode(code),
      });
      if (error) throw new AppError("Undangan belum dapat dibuat.", error.code === "42501" ? 403 : 503);
      return json({ code, message: "Undangan berlaku 7 hari dan hanya dapat digunakan sekali." });
    }
    if (input.action === "revoke") {
      const { data, error } = await db.rpc("revoke_teacher_invitation", { p_actor: user.id, p_id: input.id });
      if (error) throw new AppError("Undangan belum dapat dicabut.", error.code === "42501" ? 403 : 503);
      ensure(data === true, "Undangan sudah digunakan atau dicabut.", 409);
      return json({ message: "Undangan dicabut." });
    }
    const { data, error } = await db.rpc("redeem_teacher_invitation", {
      p_actor: user.id, p_email: user.email, p_hash: hashCode(input.code),
    });
    if (error) throw new AppError("Aktivasi belum dapat diproses.", 503);
    ensure(data === true, "Undangan tidak valid, kedaluwarsa, sudah digunakan, atau tidak cocok dengan akun ini.", 400);
    return json({ redirect: "/dashboard" });
  } catch (error) {
    return apiError(error);
  }
}
