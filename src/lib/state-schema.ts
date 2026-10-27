import { z } from "zod";
import { id, questionInput, topicInput } from "./validation";
import type { State } from "./types";
const timestamp = z.iso.datetime({ offset: true });
const probability = z.number().min(0).max(1);
const option = z.enum(["A", "B", "C", "D"]);
// Data yang datang dari disk/RPC tetap diperiksa saat runtime, bukan hanya di-cast.
export const stateSchema: z.ZodType<State> = z.object({
  profiles: z.array(
    z.object({
      id,
      full_name: z.string().min(1).max(100),
      role: z.enum(["student", "teacher"]),
      created_at: timestamp,
    }),
  ),
  classes: z.array(
    z.object({
      id,
      name: z.string().min(1).max(100),
      class_code: z.string().min(6).max(20),
      teacher_id: id,
      created_at: timestamp,
    }),
  ),
  class_members: z.array(
    z.object({ class_id: id, student_id: id, joined_at: timestamp }),
  ),
  topics: z.array(
    topicInput
      .omit({ prerequisites: true })
      .extend({ id, sort_order: z.number().int(), created_at: timestamp }),
  ),
  topic_prerequisites: z.array(
    z.object({ topic_id: id, prerequisite_topic_id: id }),
  ),
  questions: z.array(
    questionInput.extend({
      id,
      created_by: id.nullable(),
      fingerprint: z.string().length(64),
      created_at: timestamp,
      updated_at: timestamp,
    }),
  ),
  attempts: z.array(
    z.object({
      id,
      student_id: id,
      question_id: id,
      session_id: id,
      topic_id: id,
      is_correct: z.boolean(),
      selected_option: option,
      correct_option: option,
      question_text: z.string(),
      explanation: z.string(),
      p_before: probability,
      p_after: probability,
      answered_at: timestamp,
    }),
  ),
  mastery: z.array(
    z.object({
      student_id: id,
      topic_id: id,
      p_l: probability,
      updated_at: timestamp,
    }),
  ),
  quiz_sessions: z.array(
    z.object({
      id,
      student_id: id,
      topic_id: id,
      current_question_id: id.nullable(),
      status: z.enum(["active", "completed"]),
      end_reason: z.string().nullable(),
      started_at: timestamp,
      completed_at: timestamp.nullable(),
      summary: z.string().max(3000).nullable(),
      summary_source: z.enum(["template", "groq"]).nullable(),
      summary_claimed: z.boolean(),
    }),
  ),
});
export const snapshotSchema = z.object({
  revision: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  state: stateSchema,
});
