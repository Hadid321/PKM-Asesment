import type { Subject } from "./subjects";
export type Role = "student" | "teacher";
export type Difficulty = "easy" | "medium" | "hard";
export type Option = "A" | "B" | "C" | "D";
export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
}
export interface ClassRoom {
  id: string;
  name: string;
  class_code: string;
  teacher_id: string;
  created_at: string;
}
export interface Member {
  class_id: string;
  student_id: string;
  joined_at: string;
}
export interface Topic {
  subject: Subject;
  curriculum_track: "wajib" | "pengayaan";
  id: string;
  name: string;
  slug: string;
  description: string;
  sort_order: number;
  material_title: string;
  material_url: string;
  created_at: string;
}
export interface Prerequisite {
  topic_id: string;
  prerequisite_topic_id: string;
}
export interface Question {
  id: string;
  topic_id: string;
  question_text: string;
  options: Record<Option, string>;
  correct_option: Option;
  difficulty: Difficulty;
  explanation: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  fingerprint: string;
}
export type PublicQuestion = Pick<
  Question,
  "id" | "topic_id" | "question_text" | "options" | "difficulty"
>;
export interface Attempt {
  id: string;
  student_id: string;
  question_id: string;
  session_id: string;
  topic_id: string;
  is_correct: boolean;
  selected_option: Option;
  correct_option: Option;
  question_text: string;
  explanation: string;
  p_before: number;
  p_after: number;
  answered_at: string;
}
export interface Mastery {
  student_id: string;
  topic_id: string;
  p_l: number;
  updated_at: string;
}
export interface QuizSession {
  id: string;
  student_id: string;
  topic_id: string;
  current_question_id: string | null;
  status: "active" | "completed";
  end_reason: string | null;
  started_at: string;
  completed_at: string | null;
  summary: string | null;
  summary_source: "template" | "groq" | null;
  summary_claimed: boolean;
}
export interface State {
  profiles: Profile[];
  classes: ClassRoom[];
  class_members: Member[];
  topics: Topic[];
  topic_prerequisites: Prerequisite[];
  questions: Question[];
  attempts: Attempt[];
  mastery: Mastery[];
  quiz_sessions: QuizSession[];
}
export const TABLES = [
  "profiles",
  "classes",
  "class_members",
  "topics",
  "topic_prerequisites",
  "questions",
  "attempts",
  "mastery",
  "quiz_sessions",
] as const;
export type TableName = (typeof TABLES)[number];
export interface Recommendation {
  topic_id: string;
  name: string;
  p_l: number;
  reason: string;
  prerequisite_for?: string;
}
