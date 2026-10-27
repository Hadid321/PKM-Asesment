import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  BKT,
  MAX_QUESTIONS,
  MASTERY_THRESHOLD,
  updateBkt,
} from "../domain/bkt";
import {
  assertAcyclic,
  nextQuestion,
  publicQuestion,
  recommend,
} from "../domain/adaptive";
import { fingerprint, validateCsv } from "../domain/csv";
import { ensure } from "../domain/errors";
import { operationInput } from "../validation";
import type { Profile, QuizSession, State } from "../types";
import { scopeState, type Repository } from "./repository";
import type { Subject } from "../subjects";
import { curriculumPackage } from "./curriculum-content";
const now = () => new Date().toISOString();
function student(actor: Profile) {
  ensure(actor.role === "student", "Fitur ini hanya untuk siswa.", 403);
}
function teacher(actor: Profile) {
  ensure(actor.role === "teacher", "Fitur ini hanya untuk guru.", 403);
}
function ownSession(state: State, actor: Profile, id: string) {
  student(actor);
  const session = state.quiz_sessions.find(
    (s) => s.id === id && s.student_id === actor.id,
  );
  ensure(session, "Sesi tidak ditemukan.", 404);
  return session;
}
function closeUnavailableSession(session: QuizSession) {
  session.status = "completed";
  session.current_question_id = null;
  session.completed_at = now();
  session.end_reason = "Bank soal sesi sebelumnya tidak lagi tersedia";
  session.summary =
    "Sesi ditutup karena soal tidak lagi tersedia untuk kelas Anda. Jawaban yang sudah tersimpan tetap berada dalam riwayat. Pilih latihan dari bank soal guru kelas Anda.";
  session.summary_source = "template";
  session.summary_claimed = true;
}
function advance(state: State, actor: Profile, session: QuizSession) {
  if (session.status === "completed") return;
  const attempts = state.attempts.filter((a) => a.session_id === session.id);
  const p =
    state.mastery.find(
      (m) => m.student_id === actor.id && m.topic_id === session.topic_id,
    )?.p_l ?? BKT.initial;
  const questions = scopeState(state, actor).questions.filter(
    (q) => q.topic_id === session.topic_id,
  );
  const next = nextQuestion(
    questions,
    attempts.map((a) => a.question_id),
    p,
  );
  if (
    attempts.length >= MAX_QUESTIONS ||
    (attempts.length > 0 && p >= MASTERY_THRESHOLD) ||
    !next
  ) {
    session.status = "completed";
    session.completed_at = now();
    session.current_question_id = null;
    session.end_reason =
      attempts.length >= MAX_QUESTIONS
        ? "Batas 10 soal tercapai"
        : p >= MASTERY_THRESHOLD
          ? "Ambang estimasi model tercapai"
          : "Soal yang tersedia telah selesai";
    const topic = state.topics.find((t) => t.id === session.topic_id)!;
    const recommendations = recommend(
      state.topics,
      state.topic_prerequisites,
      state.mastery.filter((m) => m.student_id === actor.id),
    );
    session.summary = `${topic.name}: ${attempts.filter((a) => a.is_correct).length} dari ${attempts.length} jawaban benar. Estimasi penguasaan BKT ${Math.round(p * 100)}%. Prioritas berikutnya: ${recommendations[0]?.name ?? topic.name}. Pelajari pembahasan kesalahan, baca materi guru, lalu coba latihan lanjutan. Estimasi model bukan sertifikasi kompetensi.`;
    session.summary_source = "template";
  } else session.current_question_id = next.id;
}
export async function execute(repo: Repository, actor: Profile, raw: unknown) {
  const input = operationInput.parse(raw);
  if (input.action === "join-class") {
    student(actor);
    await repo.joinClass(actor, input.code);
    return { message: "Berhasil bergabung ke kelas." };
  }
  return repo.transact(actor, (state) => {
    switch (input.action) {
      case "start": {
        student(actor);
        ensure(
          state.topics.some((t) => t.id === input.topic_id),
          "Topik tidak ditemukan.",
          404,
        );
        const existing = state.quiz_sessions.find(
          (s) => s.student_id === actor.id && s.status === "active",
        );
        if (
          existing &&
          scopeState(state, actor).questions.some(
            (q) => q.id === existing.current_question_id,
          )
        )
          return {
            session_id: existing.id,
            message: "Latihan sebelumnya dilanjutkan.",
          };
        if (existing) closeUnavailableSession(existing);
        ensure(
          state.quiz_sessions.filter(
            (s) =>
              s.student_id === actor.id &&
              Date.parse(s.started_at) > Date.now() - 3600000,
          ).length < 12,
          "Maksimal 12 sesi per jam. Coba lagi nanti.",
          429,
        );
        ensure(
          scopeState(state, actor).questions.some(
            (q) => q.topic_id === input.topic_id,
          ),
          "Belum ada soal untuk topik ini. Hubungi guru.",
          409,
        );
        const session: QuizSession = {
          id: randomUUID(),
          student_id: actor.id,
          topic_id: input.topic_id,
          current_question_id: null,
          status: "active",
          end_reason: null,
          started_at: now(),
          completed_at: null,
          summary: null,
          summary_source: null,
          summary_claimed: false,
        };
        state.quiz_sessions.push(session);
        advance(state, actor, session);
        return { session_id: session.id };
      }
      case "answer": {
        const session = ownSession(state, actor, input.session_id);
        // Idempotensi berdasarkan pasangan sesi–soal. Balasan kedua tidak menghitung ulang BKT.
        const previous = state.attempts.find(
          (a) =>
            a.session_id === session.id && a.question_id === input.question_id,
        );
        if (previous)
          return {
            session_id: session.id,
            duplicate: true,
            completed: session.status === "completed",
            feedback: previous,
          };
        ensure(session.status === "active", "Sesi sudah selesai.", 409);
        ensure(
          session.current_question_id === input.question_id,
          "Soal tidak sesuai dengan sesi yang sedang dikerjakan.",
          409,
        );
        const q = scopeState(state, actor).questions.find(
          (q) => q.id === input.question_id && q.topic_id === session.topic_id,
        );
        ensure(q, "Soal tidak tersedia.", 404);
        const current = state.mastery.find(
          (m) => m.student_id === actor.id && m.topic_id === q.topic_id,
        );
        const before = current?.p_l ?? BKT.initial;
        const correct = q.correct_option === input.selected_option;
        const after = updateBkt(before, correct);
        const time = now();
        const attempt = {
          id: randomUUID(),
          student_id: actor.id,
          session_id: session.id,
          question_id: q.id,
          topic_id: q.topic_id,
          is_correct: correct,
          selected_option: input.selected_option,
          correct_option: q.correct_option,
          question_text: q.question_text,
          explanation: q.explanation,
          p_before: before,
          p_after: after,
          answered_at: time,
        };
        state.attempts.push(attempt);
        if (current) {
          current.p_l = after;
          current.updated_at = time;
        } else
          state.mastery.push({
            student_id: actor.id,
            topic_id: q.topic_id,
            p_l: after,
            updated_at: time,
          });
        advance(state, actor, session);
        return {
          session_id: session.id,
          duplicate: false,
          completed: session.completed_at !== null,
          feedback: attempt,
        };
      }
      case "create-class": {
        teacher(actor);
        const room = {
          id: randomUUID(),
          name: input.name,
          class_code: randomBytes(6).toString("hex").toUpperCase(),
          teacher_id: actor.id,
          created_at: now(),
        };
        state.classes.push(room);
        return { message: "Kelas berhasil dibuat.", class_id: room.id };
      }
      case "save-question": {
        teacher(actor);
        const q = input.question;
        ensure(
          state.topics.some((t) => t.id === q.topic_id),
          "Topik tidak ditemukan.",
        );
        const existing = q.id
          ? state.questions.find((x) => x.id === q.id)
          : undefined;
        if (q.id)
          ensure(
            existing?.created_by === actor.id,
            "Anda hanya dapat mengedit soal yang Anda buat atau unggah sendiri.",
            403,
          );
        if (existing) {
          ensure(
            !state.quiz_sessions.some(
              (s) =>
                s.status === "active" && s.current_question_id === existing.id,
            ),
            "Soal sedang dikerjakan siswa. Edit setelah jawaban tersimpan.",
            409,
          );
          ensure(
            existing.topic_id === q.topic_id ||
              !state.attempts.some((a) => a.question_id === existing.id),
            "Topik soal yang sudah memiliki riwayat tidak dapat dipindah. Buat soal baru.",
            409,
          );
        }
        const key = fingerprint(q);
        ensure(
          !state.questions.some(
            (x) =>
              x.id !== q.id &&
              x.fingerprint === key &&
              x.created_by === actor.id,
          ),
          "Soal yang sama sudah tersedia.",
          409,
        );
        const time = now();
        if (existing)
          Object.assign(existing, q, { fingerprint: key, updated_at: time });
        else
          state.questions.push({
            ...q,
            id: randomUUID(),
            fingerprint: key,
            created_by: actor.id,
            created_at: time,
            updated_at: time,
          });
        return {
          message:
            "Soal berhasil disimpan. Riwayat jawaban terdahulu tetap memakai pembahasan saat penilaian.",
        };
      }
      case "save-topic": {
        teacher(actor);
        const { prerequisites, ...data } = input.topic;
        const existing = data.id
          ? state.topics.find((t) => t.id === data.id)
          : undefined;
        if (data.id) ensure(existing, "Topik tidak ditemukan.", 404);
        if (existing)
          ensure(
            existing.subject === data.subject &&
              existing.curriculum_track === data.curriculum_track,
            "Mapel dan kategori topik tidak dapat dipindah. Buat topik baru.",
            409,
          );
        ensure(
          prerequisites.every((id) =>
            state.topics.some((t) => t.id === id && t.subject === data.subject),
          ),
          "Prasyarat harus berasal dari mata pelajaran yang sama.",
        );
        ensure(
          !state.topics.some((t) => t.slug === data.slug && t.id !== data.id),
          "Slug topik sudah digunakan.",
          409,
        );
        const topic_id = existing?.id ?? randomUUID();
        if (existing) Object.assign(existing, data);
        else
          state.topics.push({
            ...data,
            id: topic_id,
            sort_order: state.topics.length + 1,
            created_at: now(),
          });
        state.topic_prerequisites = [
          ...state.topic_prerequisites.filter((e) => e.topic_id !== topic_id),
          ...[...new Set(prerequisites)].map((id) => ({
            topic_id,
            prerequisite_topic_id: id,
          })),
        ];
        assertAcyclic(state.topics, state.topic_prerequisites);
        return { message: "Topik, materi, dan prasyarat disimpan." };
      }
      case "import-curriculum": {
        teacher(actor);
        const pack = curriculumPackage(input.subject);
        const time = now();
        let added = 0,
          duplicates = 0;
        for (const definition of pack.topics) {
          let topic = state.topics.find((t) => t.slug === definition.slug);
          if (topic)
            ensure(
              topic.subject === input.subject &&
                topic.curriculum_track === "wajib",
              "Slug paket sudah dipakai topik dengan mapel atau kategori berbeda.",
              409,
            );
          else {
            topic = {
              id: randomUUID(),
              name: definition.name,
              slug: definition.slug,
              description: definition.description,
              subject: input.subject,
              curriculum_track: "wajib",
              sort_order: state.topics.length + 1,
              material_title: "",
              material_url: "",
              created_at: time,
            };
            state.topics.push(topic);
          }
          for (const source of pack.questions.filter(
            (q) => q.topic_slug === definition.slug,
          )) {
            const draft = {
              topic_id: topic.id,
              question_text: source.question_text,
              options: source.options,
              correct_option: source.correct_option,
              difficulty: source.difficulty,
              explanation: `${source.explanation}\n\nLatihan orisinal ${pack.version} / ${source.code}. Acuan kompetensi CP Fase F dan kisi-kisi TKA; diimpor setelah peninjauan akun guru.`,
            };
            const key = fingerprint(draft);
            if (
              state.questions.some(
                (q) => q.created_by === actor.id && q.fingerprint === key,
              )
            ) {
              duplicates++;
              continue;
            }
            state.questions.push({
              ...draft,
              id: randomUUID(),
              fingerprint: key,
              created_by: actor.id,
              created_at: time,
              updated_at: time,
            });
            added++;
          }
        }
        return {
          message: `${added} soal ditambahkan ke bank Anda. ${duplicates} duplikat dilewati.`,
        };
      }
      case "import": {
        teacher(actor);
        const report = validateCsv(
          input.csv,
          state.topics,
          scopeState(state, actor).questions,
        );
        if (input.preview)
          return {
            report: {
              ...report,
              valid: undefined,
              valid_count: report.valid.length,
            },
            message: "Pratinjau selesai. Belum ada soal yang ditambahkan.",
          };
        ensure(
          report.errors.length === 0,
          "Impor dibatalkan: perbaiki seluruh baris yang tidak valid terlebih dahulu.",
        );
        const time = now();
        for (const q of report.valid)
          state.questions.push({
            ...q,
            id: randomUUID(),
            fingerprint: fingerprint(q),
            created_by: actor.id,
            created_at: time,
            updated_at: time,
          });
        return {
          message: `${report.valid.length} soal diimpor. ${report.duplicates} duplikat dilewati.`,
          report: {
            total: report.total,
            valid_count: report.valid.length,
            duplicates: report.duplicates,
            errors: [],
          },
        };
      }
      case "profile": {
        const profile = state.profiles.find((p) => p.id === actor.id);
        ensure(profile, "Profil tidak ditemukan.", 404);
        profile.full_name = input.full_name;
        return { message: "Nama berhasil diperbarui." };
      }
    }
  });
}
export async function quizView(
  repo: Repository,
  actor: Profile,
  sessionId: string,
) {
  const state = scopeState(await repo.read(actor), actor);
  const session = ownSession(state, actor, z.uuid().parse(sessionId));
  const q = state.questions.find((q) => q.id === session.current_question_id);
  if (session.status === "active" && !q) {
    await repo.transact(actor, (draft) => {
      const current = ownSession(draft, actor, sessionId);
      if (
        current.status === "active" &&
        !scopeState(draft, actor).questions.some(
          (question) => question.id === current.current_question_id,
        )
      )
        closeUnavailableSession(current);
    });
    return quizView(repo, actor, sessionId);
  }
  return {
    session,
    question: q ? publicQuestion(q) : null,
    topic: state.topics.find((t) => t.id === session.topic_id)!,
    attempts: state.attempts.filter((a) => a.session_id === session.id),
    max: MAX_QUESTIONS,
  };
}
export async function dashboard(
  repo: Repository,
  actor: Profile,
  subject?: Subject,
) {
  const state = scopeState(await repo.read(actor), actor);
  const activeSession =
    state.quiz_sessions.find(
      (s) => s.student_id === actor.id && s.status === "active",
    ) ?? null;
  const activeTopic =
    state.topics.find((t) => t.id === activeSession?.topic_id) ?? null;
  if (subject) {
    state.topics = state.topics.filter(
      (t) => t.subject === subject && t.curriculum_track === "wajib",
    );
    const ids = new Set(state.topics.map((t) => t.id));
    state.mastery = state.mastery.filter((m) => ids.has(m.topic_id));
    state.attempts = state.attempts.filter((a) => ids.has(a.topic_id));
    state.quiz_sessions = state.quiz_sessions.filter((s) =>
      ids.has(s.topic_id),
    );
    state.topic_prerequisites = state.topic_prerequisites.filter(
      (p) => ids.has(p.topic_id) && ids.has(p.prerequisite_topic_id),
    );
  }
  const students =
    actor.role === "student"
      ? [actor]
      : state.profiles.filter((p) => p.role === "student");
  const recommendations = recommend(
    state.topics,
    state.topic_prerequisites,
    state.mastery.filter((m) => m.student_id === actor.id),
  );
  return {
    subject: subject ?? null,
    activeSession,
    activeTopic,
    actor,
    topics: state.topics,
    prerequisites: state.topic_prerequisites,
    classes: state.classes,
    members: state.class_members,
    students,
    mastery: state.mastery,
    attempts: state.attempts,
    sessions: state.quiz_sessions,
    recommendations,
    questionCounts: state.topics.map((t) => ({
      topic_id: t.id,
      count: state.questions.filter((q) => q.topic_id === t.id).length,
    })),
  };
}
export type DashboardData = Awaited<ReturnType<typeof dashboard>>;
export type QuizData = Awaited<ReturnType<typeof quizView>>;
