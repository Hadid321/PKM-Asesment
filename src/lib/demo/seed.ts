import type { Question, State, Topic } from "../types";
import { updateBkt, BKT } from "../domain/bkt";
import { fingerprint } from "../domain/csv";
import { LEGACY_ENRICHMENT } from "../subjects";
export const DEMO_STUDENT = "10000000-0000-4000-8000-000000000001";
export const DEMO_TEACHER = "10000000-0000-4000-8000-000000000002";
export const OTHER_STUDENT = "10000000-0000-4000-8000-000000000003";
export const OTHER_TEACHER = "10000000-0000-4000-8000-000000000004";
const iso = "2026-10-20T01:00:00.000Z";
export function topicId(n: number) {
  return `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}
export function seedContent(): Pick<
  State,
  "topics" | "topic_prerequisites" | "questions"
> {
  const names = [
    [
      "Limit fungsi",
      "limit-fungsi",
      "Memahami nilai pendekatan dan limit fungsi aljabar.",
    ],
    [
      "Turunan fungsi",
      "turunan-fungsi",
      "Mengenali laju perubahan dan turunan fungsi polinomial.",
    ],
    [
      "Integral dasar",
      "integral-dasar",
      "Menemukan antiturunan dan menghitung integral tentu.",
    ],
    [
      "Peluang kejadian",
      "peluang-kejadian",
      "Menentukan peluang dari ruang sampel yang sederhana.",
    ],
  ];
  const topics: Topic[] = names.map(([name, slug, description], i) => ({
    subject: "matematika",
    curriculum_track: LEGACY_ENRICHMENT.has(slug) ? "pengayaan" : "wajib",
    id: topicId(i + 1),
    name,
    slug,
    description,
    sort_order: i + 1,
    material_title: `Catatan pengantar ${name.toLowerCase()}`,
    material_url: `/materi/${slug}`,
    created_at: iso,
  }));
  const questions: Question[] = [];
  for (let topicIndex = 0; topicIndex < 4; topicIndex++) {
    for (let n = 1; n <= 12; n++) {
      const difficulty: Question["difficulty"] =
        n <= 4 ? "easy" : n <= 8 ? "medium" : "hard";
      const k = n + 1;
      let question_text: string, explanation: string, answer: number;
      if (topicIndex === 0) {
        if (difficulty === "easy") {
          question_text = `Nilai lim x→${k} (2x + 1) adalah …`;
          answer = 2 * k + 1;
          explanation = `Fungsi kontinu, sehingga substitusi langsung menghasilkan 2 × ${k} + 1 = ${answer}.`;
        } else if (difficulty === "medium") {
          question_text = `Nilai lim x→${k} (x² − ${k * k}) / (x − ${k}) adalah …`;
          answer = 2 * k;
          explanation = `Faktorkan pembilang menjadi (x − ${k})(x + ${k}), sederhanakan lalu substitusi x = ${k}, hasilnya ${answer}.`;
        } else {
          question_text = `Nilai lim x→${k} (x³ − ${k ** 3}) / (x − ${k}) adalah …`;
          answer = 3 * k * k;
          explanation = `Gunakan selisih kubus: setelah disederhanakan menjadi x² + ${k}x + ${k * k}. Substitusi memberikan ${answer}.`;
        }
      } else if (topicIndex === 1) {
        const power =
          difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
        question_text = `Jika f(x) = ${k}x${["", "", "²", "³", "⁴"][power]}, nilai f′(1) adalah …`;
        answer = k * power;
        explanation = `Aturan pangkat: turunan axⁿ adalah anxⁿ⁻¹. Pada x = 1, nilainya ${k} × ${power} = ${answer}.`;
      } else if (topicIndex === 2) {
        const upper =
          difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
        question_text =
          `Nilai integral tentu ∫ dari 0 sampai ${upper} untuk fungsi 2${k}x dx adalah …`.replace(
            `2${k}x`,
            `${2 * k}x`,
          );
        answer = k * upper * upper;
        explanation = `Antiturunan ${2 * k}x adalah ${k}x². Nilai batas atas dikurangi batas bawah = ${k} × ${upper}² − 0 = ${answer}.`;
      } else {
        const total = k * 4;
        question_text = `Sebuah kotak berisi ${k} bola merah dan ${total - k} bola biru. Jika diambil satu bola secara acak, peluang terambil bola merah dalam persen adalah …`;
        answer = 25;
        explanation = `Peluang = jumlah bola merah / seluruh bola = ${k}/${total} = 1/4 = 25%.`;
        if (difficulty === "medium") {
          question_text = `Dua koin adil dilempar bersama sebanyak satu kali. Peluang keduanya menunjukkan gambar dalam persen adalah … (latihan ${n})`;
          explanation =
            "Ruang sampel: AA, AG, GA, GG. Hanya GG yang sesuai, maka peluang 1/4 = 25%.";
        }
        if (difficulty === "hard") {
          question_text = `Kejadian A dan B independen. P(A) = 50% dan P(B) = 50%. Peluang A dan B terjadi bersamaan dalam persen adalah … (latihan ${n})`;
          explanation =
            "Untuk kejadian independen, P(A ∩ B) = P(A) × P(B) = 0,5 × 0,5 = 0,25 = 25%.";
        }
      }
      const values = [answer, answer + 2, answer - 1, answer + 4];
      const rotate = n % 4;
      const options = Object.fromEntries(
        ["A", "B", "C", "D"].map((key, j) => [
          key,
          String(values[(j + rotate) % 4]),
        ]),
      ) as Question["options"];
      const correct_option = (["A", "B", "C", "D"] as const)[(4 - rotate) % 4];
      const draft = {
        topic_id: topics[topicIndex].id,
        question_text,
        options,
        difficulty,
        correct_option,
        explanation,
      };
      questions.push({
        ...draft,
        id: `30000000-0000-4000-8000-${String(topicIndex * 100 + n).padStart(12, "0")}`,
        created_by: null,
        created_at: iso,
        updated_at: iso,
        fingerprint: fingerprint(draft),
      });
    }
  }
  return {
    topics,
    questions,
    topic_prerequisites: [
      { topic_id: topics[1].id, prerequisite_topic_id: topics[0].id },
      { topic_id: topics[2].id, prerequisite_topic_id: topics[1].id },
    ],
  };
}
export function demoState(): State {
  const content = seedContent();
  content.questions = content.questions.map((q) => ({
    ...q,
    created_by: DEMO_TEACHER,
  }));
  const state: State = {
    ...content,
    profiles: [
      {
        id: DEMO_STUDENT,
        full_name: "Rani Putri",
        role: "student",
        created_at: iso,
      },
      {
        id: DEMO_TEACHER,
        full_name: "Maya Pramesti",
        role: "teacher",
        created_at: iso,
      },
      {
        id: OTHER_STUDENT,
        full_name: "Bagas Pratama",
        role: "student",
        created_at: iso,
      },
      {
        id: OTHER_TEACHER,
        full_name: "Guru Simulasi Lain",
        role: "teacher",
        created_at: iso,
      },
    ],
    classes: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        name: "XII MIPA 1",
        class_code: "DEMO-XII",
        teacher_id: DEMO_TEACHER,
        created_at: iso,
      },
    ],
    class_members: [],
    mastery: [],
    attempts: [],
    quiz_sessions: [],
  };
  for (const student_id of [DEMO_STUDENT, OTHER_STUDENT])
    state.class_members.push({
      class_id: state.classes[0].id,
      student_id,
      joined_at: iso,
    });
  // Semua statistik fixture dihitung dari percobaan simulasi, menggunakan rumus yang sama.
  for (let i = 0; i < 3; i++) {
    const session_id = `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const student_id = i === 2 ? OTHER_STUDENT : DEMO_STUDENT;
    const topic_id = topicId(i === 0 ? 1 : i === 1 ? 4 : 2);
    let p = BKT.initial;
    const time = `2026-10-${String(20 + i).padStart(2, "0")}T02:00:00.000Z`;
    const qs = content.questions
      .filter((q) => q.topic_id === topic_id)
      .slice(0, 5);
    qs.forEach((q, n) => {
      const is_correct = i === 0 ? n !== 0 : i === 1 ? n % 2 === 0 : n > 2;
      const p_before = p;
      p = updateBkt(p, is_correct);
      state.attempts.push({
        id: `60000000-0000-4000-8000-${String(i * 100 + n + 1).padStart(12, "0")}`,
        student_id,
        question_id: q.id,
        session_id,
        topic_id,
        is_correct,
        selected_option: is_correct
          ? q.correct_option
          : q.correct_option === "A"
            ? "B"
            : "A",
        correct_option: q.correct_option,
        question_text: q.question_text,
        explanation: q.explanation,
        p_before,
        p_after: p,
        answered_at: time,
      });
    });
    state.mastery.push({ student_id, topic_id, p_l: p, updated_at: time });
    state.quiz_sessions.push({
      id: session_id,
      student_id,
      topic_id,
      current_question_id: null,
      status: "completed",
      end_reason: "Contoh sesi simulasi",
      started_at: time,
      completed_at: time,
      summary:
        "Ini adalah hasil simulasi pengembangan. Gunakan latihan berikutnya untuk melihat pembaruan BKT dari jawaban Anda sendiri.",
      summary_source: "template",
      summary_claimed: true,
    });
  }
  return state;
}
