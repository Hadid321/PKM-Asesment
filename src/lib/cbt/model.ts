import { z } from "zod";
import { SUBJECTS } from "../subjects";
const id = z.uuid();
export const option = z.enum(["A", "B", "C", "D"]);
export const keys = ["A", "B", "C", "D"] as const;
export const itemSchema = z.object({
  id,
  code: z.string(),
  topic_id: id,
  topic_name: z.string(),
  question_text: z.string().min(1).max(4000),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  correct_option: option,
  explanation: z.string(),
});
export const examSchema = z.object({
  id,
  teacher_id: id,
  class_id: id,
  subject: z.enum(SUBJECTS),
  title: z.string().min(1).max(120),
  duration_minutes: z.number().int().min(5).max(180),
  access_code: z.string().min(6).max(20),
  status: z.enum(["open", "closed"]),
  released: z.boolean(),
  created_at: z.iso.datetime(),
  closed_at: z.iso.datetime().nullable(),
  items: z.array(itemSchema).length(24),
  fingerprints: z.array(z.string().regex(/^[a-f0-9]{64}$/)).length(24),
});
export const sittingSchema = z.object({
  id,
  exam_id: id,
  student_id: id,
  started_at: z.iso.datetime(),
  deadline_at: z.iso.datetime(),
  submitted_at: z.iso.datetime().nullable(),
  status: z.enum(["active", "submitted"]),
  end_reason: z.enum(["manual", "time", "teacher"]).nullable(),
  version: z.number().int().nonnegative(),
  order: z.array(id).length(24),
  option_orders: z.record(id, z.array(option).length(4)),
  answers: z.record(
    id,
    z.object({ option: option.nullable(), flagged: z.boolean() }),
  ),
  priors: z.record(id, z.number().min(0).max(1)),
});
export const cbtStateSchema = z.object({
  exams: z.array(examSchema),
  sittings: z.array(sittingSchema),
});
export type ExamItem = z.infer<typeof itemSchema>;
export type Exam = z.infer<typeof examSchema>;
export type Sitting = z.infer<typeof sittingSchema>;
export type CbtState = z.infer<typeof cbtStateSchema>;
export interface CbtRepository {
  transact<T>(fn: (state: CbtState) => T): Promise<T>;
}
export const cbtInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("preview"),
      subject: z.enum(SUBJECTS),
      custom_csv: z.string().max(500000).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      reviewed: z.literal(true),
      custom_csv: z.string().max(500000).optional(),
      class_id: id,
      subject: z.enum(SUBJECTS),
      title: z.string().trim().min(4).max(120),
      duration_minutes: z.number().int().min(5).max(180).default(45),
    })
    .strict(),
  z
    .object({
      action: z.literal("start"),
      exam_id: id,
      code: z.string().trim().toUpperCase().min(6).max(20),
    })
    .strict(),
  z
    .object({
      action: z.literal("save"),
      sitting_id: id,
      item_id: id,
      option: option.nullable(),
      flagged: z.boolean(),
      expected_version: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      action: z.literal("submit"),
      sitting_id: id,
      expected_version: z.number().int().nonnegative(),
    })
    .strict(),
  z.object({ action: z.enum(["close", "release"]), exam_id: id }).strict(),
]);
