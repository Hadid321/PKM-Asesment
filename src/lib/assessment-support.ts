import { z } from "zod";
export const activityKinds = [
  "opened",
  "hidden",
  "visible",
  "blur",
  "focus",
  "offline",
  "online",
  "fullscreen_exit",
  "left_assessment",
] as const;
export const activityLabels: Record<(typeof activityKinds)[number], string> = {
  left_assessment: "Meninggalkan halaman asesmen",
  opened: "Halaman asesmen dibuka",
  hidden: "Tab atau aplikasi ditinggalkan",
  visible: "Kembali ke halaman asesmen",
  blur: "Jendela kehilangan fokus",
  focus: "Jendela kembali fokus",
  offline: "Perangkat melaporkan koneksi putus",
  online: "Perangkat kembali terhubung",
  fullscreen_exit: "Keluar dari layar penuh",
};
export const presenceSchema = z
  .object({
    visible: z.boolean(),
    focused: z.boolean(),
    online: z.boolean(),
    fullscreen: z.boolean(),
  })
  .strict();
export const activityInput = z
  .object({
    sitting_id: z.uuid(),
    events: z
      .array(z.object({ id: z.uuid(), kind: z.enum(activityKinds) }).strict())
      .max(20),
    presence: presenceSchema,
  })
  .strict();
export type ActivityInput = z.infer<typeof activityInput>;
export type Monitor = z.infer<typeof presenceSchema> & {
  sitting_id: string;
  last_seen: string;
  hidden_count: number;
  left_count: number;
  blur_count: number;
  fullscreen_exits: number;
  offline_count: number;
  recent: { kind: (typeof activityKinds)[number]; received_at: string }[];
};
export const briefInput = z.object({ target_id: z.uuid() }).strict();
export const briefSchema = z
  .object({
    overview: z.string().trim().min(20).max(700),
    actions: z
      .array(
        z
          .object({
            topic_key: z.string().max(100),
            explanation: z.string().trim().min(10).max(400),
            steps: z.array(z.string().trim().min(8).max(220)).min(2).max(3),
          })
          .strict(),
      )
      .min(1)
      .max(3),
    reflection: z.string().trim().min(10).max(300),
  })
  .strict();
export type LearningBrief = z.infer<typeof briefSchema>;
export type BriefRecord = {
  status: "pending" | "ready";
  claim_id: string;
  claimed_at: string;
  owner_id: string;
  brief?: LearningBrief;
  source?: "groq" | "template";
};
