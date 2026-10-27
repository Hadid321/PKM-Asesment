import { z } from "zod";
import { SUBJECTS } from "./subjects";
z.config(z.locales.id());
const text = (max: number) => z.string().trim().min(1, "Wajib diisi").max(max);
export const id = z.uuid();
export const questionInput = z
  .object({
    id: id.optional(),
    topic_id: id,
    question_text: text(3000),
    options: z
      .object({ A: text(600), B: text(600), C: text(600), D: text(600) })
      .strict()
      .refine(
        (o) => new Set(Object.values(o).map((v) => v.toLowerCase())).size === 4,
        "Keempat pilihan harus berbeda",
      ),
    correct_option: z.enum(["A", "B", "C", "D"]),
    difficulty: z.enum(["easy", "medium", "hard"]),
    explanation: text(3000),
  })
  .strict();
export const topicInput = z
  .object({
    subject: z.enum(SUBJECTS).default("matematika"),
    curriculum_track: z.enum(["wajib", "pengayaan"]).default("wajib"),
    id: id.optional(),
    name: text(100),
    slug: text(100).regex(/^[a-z0-9-]+$/),
    description: text(1000),
    material_title: z.string().trim().max(160),
    material_url: z
      .string()
      .trim()
      .max(1200)
      .refine((v) => {
        if (!v) return true;
        if (
          [
            "limit-fungsi",
            "turunan-fungsi",
            "integral-dasar",
            "peluang-kejadian",
          ].some((slug) => v === `/materi/${slug}`)
        )
          return true;
        try {
          const url = new URL(v);
          return (
            url.protocol === "https:" &&
            Boolean(url.hostname) &&
            !url.username &&
            !url.password
          );
        } catch {
          return false;
        }
      }, "Gunakan URL HTTPS valid atau salah satu materi lokal yang tersedia"),
    prerequisites: z.array(id).max(20),
  })
  .strict();
export const operationInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("import-curriculum"),
      subject: z.enum(SUBJECTS),
      reviewed: z.literal(true),
    })
    .strict(),
  z.object({ action: z.literal("start"), topic_id: id }).strict(),
  z
    .object({
      action: z.literal("answer"),
      session_id: id,
      question_id: id,
      selected_option: z.enum(["A", "B", "C", "D"]),
    })
    .strict(),
  z.object({ action: z.literal("create-class"), name: text(100) }).strict(),
  z
    .object({
      action: z.literal("join-class"),
      code: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z0-9-]{6,20}$/, "Kode kelas tidak valid"),
    })
    .strict(),
  z
    .object({ action: z.literal("save-question"), question: questionInput })
    .strict(),
  z.object({ action: z.literal("save-topic"), topic: topicInput }).strict(),
  z
    .object({
      action: z.literal("import"),
      csv: text(500000),
      preview: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("profile"), full_name: text(100) }).strict(),
]);
export const loginInput = z
  .object({
    email: z
      .string()
      .trim()
      .pipe(
        z
          .email("Periksa penulisan alamat email.")
          .max(254, "Alamat email terlalu panjang."),
      ),
    password: z
      .string()
      .min(8, "Gunakan kata sandi minimal 8 karakter.")
      .max(128, "Kata sandi maksimal 128 karakter."),
  })
  .strict();
export const registerInput = loginInput
  .extend({ full_name: text(100) })
  .strict();
