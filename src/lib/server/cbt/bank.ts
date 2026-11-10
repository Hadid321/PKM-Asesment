import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { ensure } from "../../domain/errors";
import { validateCsv } from "../../domain/csv";
import type { ExamItem } from "../../cbt/model";
import type { Subject } from "../../subjects";
import type { State } from "../../types";
import { examItems } from "./content";
const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
export function questionFingerprint(
  q: Pick<ExamItem, "question_text" | "options">,
) {
  return createHash("sha256")
    .update(
      JSON.stringify([
        normalize(q.question_text),
        Object.values(q.options).map(normalize).sort(),
      ]),
    )
    .digest("hex");
}
export function prepareExamItems(
  subject: Subject,
  context: State,
  csv?: string,
) {
  let items: ExamItem[];
  if (csv) {
    const report = validateCsv(csv, context.topics, []);
    ensure(
      !report.errors.length && report.valid.length === 24 && !report.duplicates,
      "CSV ujian harus berisi tepat 24 soal valid tanpa duplikat. Gunakan format CSV soal yang sama dengan bank latihan.",
      400,
    );
    items = report.valid.map((q, i) => {
      const t = context.topics.find((t) => t.id === q.topic_id);
      ensure(
        t && t.subject === subject,
        "Semua soal CSV harus berasal dari mapel ujian yang dipilih.",
        400,
      );
      return {
        ...q,
        id: randomUUID(),
        code: "CBT-UP-" + (i + 1),
        topic_name: t.name,
      };
    });
  } else items = examItems(subject, context.topics);
  const known = new Set(context.questions.map(questionFingerprint));
  ensure(
    items.every((q) => !known.has(questionFingerprint(q))),
    "Soal ujian harus berbeda dari soal latihan yang sudah dapat dibaca peserta.",
    409,
  );
  ensure(
    new Set(items.map(questionFingerprint)).size === 24,
    "Paket ujian memuat soal yang sama lebih dari sekali.",
    400,
  );
  return items;
}
