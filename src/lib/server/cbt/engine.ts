import "server-only";
import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { ensure } from "../../domain/errors";
import { BKT, updateBkt } from "../../domain/bkt";
import {
  cbtInput,
  keys,
  type CbtRepository,
  type CbtState,
  type Exam,
  type Sitting,
} from "../../cbt/model";
import type { Profile, State } from "../../types";
import { examItems } from "./content";
import { prepareExamItems, questionFingerprint } from "./bank";
function shuffle<T>(values: readonly T[]): T[] {
  const a = [...values];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function grade(exam: Exam, sitting: Sitting) {
  const mastery = { ...sitting.priors };
  let correct = 0;
  const review = sitting.order.map((id) => {
    const item = exam.items.find((q) => q.id === id)!;
    const selected = sitting.answers[id]?.option ?? null;
    const order = sitting.option_orders[id];
    const original = selected ? order[keys.indexOf(selected)] : null;
    const right = original === item.correct_option;
    if (right) correct++;
    if (original)
      mastery[item.topic_id] = updateBkt(
        mastery[item.topic_id] ?? BKT.initial,
        right,
      );
    return {
      id,
      question_text: item.question_text,
      options: Object.fromEntries(
        keys.map((k, i) => [k, item.options[order[i]]]),
      ),
      selected_option: selected,
      correct_option: keys[order.indexOf(item.correct_option)],
      is_correct: right,
      explanation: item.explanation,
    };
  });
  const topics = [
    ...new Map(
      exam.items.map((q) => [
        q.topic_id,
        {
          id: q.topic_id,
          name: q.topic_name,
          p_l: mastery[q.topic_id] ?? BKT.initial,
        },
      ]),
    ).values(),
  ].sort((a, b) => a.p_l - b.p_l);
  return {
    correct,
    total: exam.items.length,
    score: Math.round((correct / exam.items.length) * 100),
    topics,
    review,
  };
}
function isMember(context: State, actor: Profile, classId: string) {
  return context.class_members.some(
    (m) => m.class_id === classId && m.student_id === actor.id,
  );
}
function visible(exam: Exam, context: State, actor: Profile) {
  return actor.role === "teacher"
    ? exam.teacher_id === actor.id &&
        context.classes.some(
          (c) => c.id === exam.class_id && c.teacher_id === actor.id,
        )
    : isMember(context, actor, exam.class_id);
}
function expire(state: CbtState, clock: number) {
  for (const sitting of state.sittings) {
    if (sitting.status !== "active") continue;
    const exam = state.exams.find((e) => e.id === sitting.exam_id);
    if (!exam) continue;
    const closed = exam.status === "closed";
    if (closed || clock >= Date.parse(sitting.deadline_at)) {
      sitting.status = "submitted";
      sitting.submitted_at = new Date(
        Math.min(clock, Date.parse(sitting.deadline_at)),
      ).toISOString();
      sitting.end_reason =
        closed &&
        (!exam.closed_at ||
          Date.parse(exam.closed_at) < Date.parse(sitting.deadline_at))
          ? "teacher"
          : "time";
      sitting.version++;
    }
  }
}
function own(state: CbtState, context: State, actor: Profile, id: string) {
  ensure(actor.role === "student", "Halaman pengerjaan khusus siswa.", 403);
  const sitting = state.sittings.find(
    (s) => s.id === id && s.student_id === actor.id,
  );
  ensure(sitting, "Pengerjaan tidak ditemukan.", 404);
  const exam = state.exams.find((e) => e.id === sitting.exam_id);
  ensure(
    exam && visible(exam, context, actor),
    "Ujian tidak tersedia untuk kelas Anda.",
    403,
  );
  return { sitting, exam };
}
function studentView(exam: Exam, s: Sitting, clock: number) {
  return {
    id: s.id,
    exam_id: exam.id,
    title: exam.title,
    subject: exam.subject,
    status: s.status,
    end_reason: s.end_reason,
    deadline_at: s.deadline_at,
    server_time: new Date(clock).toISOString(),
    version: s.version,
    released: exam.released,
    answered: Object.values(s.answers).filter((a) => a.option !== null).length,
    total: 24,
    questions:
      s.status === "active"
        ? s.order.map((id) => {
            const q = exam.items.find((q) => q.id === id)!;
            const order = s.option_orders[id];
            return {
              id,
              question_text: q.question_text,
              options: Object.fromEntries(
                keys.map((k, i) => [k, q.options[order[i]]]),
              ),
              selected: s.answers[id]?.option ?? null,
              flagged: s.answers[id]?.flagged ?? false,
            };
          })
        : [],
    result: s.status === "submitted" && exam.released ? grade(exam, s) : null,
  };
}
export function createCbtService(
  repo: CbtRepository,
  context: State,
  actor: Profile,
  clock = () => Date.now(),
) {
  return {
    preview: (subject: import("../../subjects").Subject) => {
      ensure(actor.role === "teacher", "Pratinjau soal hanya untuk guru.", 403);
      return examItems(subject, context.topics);
    },
    list: () =>
      repo.transact((state) => {
        const now = clock();
        expire(state, now);
        return {
          role: actor.role,
          classes:
            actor.role === "teacher"
              ? context.classes
                  .filter((c) => c.teacher_id === actor.id)
                  .map((c) => ({ id: c.id, name: c.name }))
              : [],
          exams: state.exams
            .filter((e) => visible(e, context, actor))
            .map((e) => {
              const sittings = state.sittings.filter((s) => s.exam_id === e.id);
              const mine = sittings.find((s) => s.student_id === actor.id);
              return {
                id: e.id,
                title: e.title,
                subject: e.subject,
                class_name:
                  context.classes.find((c) => c.id === e.class_id)?.name ??
                  "Kelas ujian",
                duration_minutes: e.duration_minutes,
                count: 24,
                status: e.status,
                released: e.released,
                access_code:
                  actor.role === "teacher" ? e.access_code : undefined,
                sitting: mine ? { id: mine.id, status: mine.status } : null,
                participants:
                  actor.role === "teacher"
                    ? sittings.map((s) => ({
                        id: s.id,
                        name:
                          context.profiles.find((p) => p.id === s.student_id)
                            ?.full_name ?? "Peserta",
                        status: s.status,
                        answered: Object.values(s.answers).filter(
                          (a) => a.option !== null,
                        ).length,
                        score:
                          s.status === "submitted" ? grade(e, s).score : null,
                      }))
                    : undefined,
              };
            }),
        };
      }),
    view: (id: string) =>
      repo.transact((state) => {
        const now = clock();
        expire(state, now);
        const { exam, sitting } = own(state, context, actor, id);
        return studentView(exam, sitting, now);
      }),
    execute: (raw: unknown) =>
      repo.transact((state) => {
        const input = cbtInput.parse(raw);
        const now = clock();
        expire(state, now);
        if (input.action === "preview") {
          ensure(
            actor.role === "teacher",
            "Pratinjau soal hanya untuk guru.",
            403,
          );
          return {
            items: prepareExamItems(input.subject, context, input.custom_csv),
          };
        }
        if (input.action === "publish") {
          ensure(
            actor.role === "teacher",
            "Hanya guru yang dapat membuka ujian.",
            403,
          );
          ensure(
            context.classes.some(
              (c) => c.id === input.class_id && c.teacher_id === actor.id,
            ),
            "Kelas tidak ditemukan.",
            404,
          );
          ensure(
            state.exams.filter(
              (e) => e.teacher_id === actor.id && e.status === "open",
            ).length < 12,
            "Akhiri ujian lama sebelum membuat ujian berikutnya.",
            409,
          );
          const items = prepareExamItems(
            input.subject,
            context,
            input.custom_csv,
          );
          const fingerprints = items.map(questionFingerprint);
          ensure(
            !state.exams.some(
              (e) =>
                e.released &&
                e.fingerprints.some((f) => fingerprints.includes(f)),
            ),
            "Sebagian soal sudah pernah dirilis. Unggah 24 soal baru untuk gelombang berikutnya.",
            409,
          );
          const exam: Exam = {
            id: randomUUID(),
            teacher_id: actor.id,
            class_id: input.class_id,
            subject: input.subject,
            title: input.title,
            duration_minutes: input.duration_minutes,
            access_code: randomBytes(4).toString("hex").toUpperCase(),
            status: "open",
            released: false,
            created_at: new Date(now).toISOString(),
            closed_at: null,
            items,
            fingerprints,
          };
          state.exams.push(exam);
          return {
            exam_id: exam.id,
            message: "Ujian dibuka. Bagikan kode hanya saat peserta siap.",
          };
        }
        if (input.action === "start") {
          ensure(
            actor.role === "student",
            "Pengerjaan ujian khusus siswa.",
            403,
          );
          const exam = state.exams.find((e) => e.id === input.exam_id);
          ensure(
            exam && visible(exam, context, actor),
            "Ujian tidak ditemukan.",
            404,
          );
          const previous = state.sittings.find(
            (s) => s.exam_id === exam.id && s.student_id === actor.id,
          );
          if (previous) return { sitting_id: previous.id };
          ensure(exam.status === "open", "Ujian sudah ditutup oleh guru.", 409);
          ensure(
            input.code === exam.access_code,
            "Kode ujian belum sesuai. Mintalah kode dari guru.",
            403,
          );
          ensure(
            !state.sittings.some(
              (s) => s.student_id === actor.id && s.status === "active",
            ),
            "Selesaikan ujian yang sedang berlangsung terlebih dahulu.",
            409,
          );
          const sitting: Sitting = {
            id: randomUUID(),
            exam_id: exam.id,
            student_id: actor.id,
            started_at: new Date(now).toISOString(),
            deadline_at: new Date(
              now + exam.duration_minutes * 60000,
            ).toISOString(),
            submitted_at: null,
            status: "active",
            end_reason: null,
            version: 0,
            order: shuffle(exam.items.map((q) => q.id)),
            option_orders: Object.fromEntries(
              exam.items.map((q) => [q.id, shuffle(keys)]),
            ),
            answers: {},
            priors: Object.fromEntries(
              exam.items.map((q) => [
                q.topic_id,
                context.mastery.find(
                  (m) => m.student_id === actor.id && m.topic_id === q.topic_id,
                )?.p_l ?? BKT.initial,
              ]),
            ),
          };
          state.sittings.push(sitting);
          return { sitting_id: sitting.id };
        }
        if (input.action === "save" || input.action === "submit") {
          const { exam, sitting } = own(
            state,
            context,
            actor,
            input.sitting_id,
          );
          // Expiration is persisted even when an autosave arrives too late.
          if (sitting.status !== "active")
            return {
              view: studentView(exam, sitting, now),
              message: "Pengerjaan sudah dikumpulkan.",
            };
          ensure(
            sitting.version === input.expected_version,
            "Jawaban diperbarui dari tab lain. Muat ulang sebelum melanjutkan.",
            409,
          );
          if (input.action === "save") {
            ensure(
              exam.items.some((q) => q.id === input.item_id),
              "Nomor soal tidak sesuai dengan ujian.",
              400,
            );
            sitting.answers[input.item_id] = {
              option: input.option,
              flagged: input.flagged,
            };
          } else {
            sitting.status = "submitted";
            sitting.submitted_at = new Date(now).toISOString();
            sitting.end_reason = "manual";
          }
          sitting.version++;
          return {
            view: studentView(exam, sitting, now),
            message:
              input.action === "save"
                ? "Jawaban tersimpan."
                : "Ujian berhasil dikumpulkan.",
          };
        }
        ensure(
          actor.role === "teacher",
          "Hanya guru yang dapat mengelola ujian.",
          403,
        );
        const exam = state.exams.find(
          (e) => e.id === input.exam_id && visible(e, context, actor),
        );
        ensure(exam, "Ujian tidak ditemukan.", 404);
        if (input.action === "close") {
          exam.status = "closed";
          exam.closed_at ??= new Date(now).toISOString();
          expire(state, now);
          return {
            message: "Ujian ditutup. Peserta tidak dapat mengubah jawaban.",
          };
        }
        ensure(
          exam.status === "closed",
          "Akhiri ujian sebelum merilis hasil agar kunci tidak dibagikan saat peserta lain mengerjakan.",
          409,
        );
        ensure(
          !state.exams.some(
            (e) =>
              e.id !== exam.id &&
              e.status === "open" &&
              e.fingerprints.some((f) => exam.fingerprints.includes(f)),
          ),
          "Masih ada ujian lain yang memakai soal sama. Tutup seluruh ujian tersebut sebelum merilis kunci.",
          409,
        );
        exam.released = true;
        return { message: "Hasil dan pembahasan kini dapat dibuka peserta." };
      }),
  };
}
export type CbtView = ReturnType<typeof studentView>;
export type CbtList = Awaited<
  ReturnType<ReturnType<typeof createCbtService>["list"]>
>;
