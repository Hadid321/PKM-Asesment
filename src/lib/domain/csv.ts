import { createHash } from "node:crypto";
import { questionInput } from "../validation";
import type { Question, Topic } from "../types";
export const CSV_COLUMNS = [
  "topik",
  "pertanyaan",
  "opsi_a",
  "opsi_b",
  "opsi_c",
  "opsi_d",
  "kunci",
  "kesulitan",
  "pembahasan",
];
export type QuestionDraft = Omit<
  Question,
  "id" | "created_by" | "created_at" | "updated_at" | "fingerprint"
>;
export function fingerprint(q: QuestionDraft): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        q.topic_id,
        q.question_text.trim().toLowerCase(),
        q.options,
      ]),
    )
    .digest("hex");
}
export function parseCsv(input: string): { line: number; cells: string[] }[] {
  const source = input.replace(/^\uFEFF/, "");
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [],
    cell = "",
    quoted = false,
    closed = false,
    line = 1,
    start = 1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else {
        cell += c;
        if (c === "\n") line++;
      }
    } else if (c === '"') {
      if (cell || closed)
        throw new Error(`Baris ${line}: tanda kutip tidak valid.`);
      quoted = true;
    } else if (c === ",") {
      cells.push(cell.trim());
      cell = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      cells.push(cell.trim());
      if (cells.some(Boolean)) rows.push({ line: start, cells });
      cells = [];
      cell = "";
      closed = false;
      line++;
      start = line;
    } else {
      if (closed && c.trim())
        throw new Error(`Baris ${line}: karakter setelah kutip penutup.`);
      if (!closed) cell += c;
    }
  }
  if (quoted) throw new Error(`Baris ${start}: tanda kutip belum ditutup.`);
  cells.push(cell.trim());
  if (cells.some(Boolean)) rows.push({ line: start, cells });
  return rows;
}
export interface CsvReport {
  valid: QuestionDraft[];
  errors: { line: number; message: string }[];
  duplicates: number;
  total: number;
}
export function validateCsv(
  input: string,
  topics: Topic[],
  existing: Question[],
): CsvReport {
  const report: CsvReport = { valid: [], errors: [], duplicates: 0, total: 0 };
  if (Buffer.byteLength(input, "utf8") > 500000)
    return {
      ...report,
      errors: [{ line: 1, message: "Ukuran CSV maksimal 500 KB." }],
    };
  let rows: ReturnType<typeof parseCsv>;
  try {
    rows = parseCsv(input);
  } catch (e) {
    return { ...report, errors: [{ line: 1, message: (e as Error).message }] };
  }
  if (!rows.length || rows[0].cells.join(",") !== CSV_COLUMNS.join(","))
    return {
      ...report,
      errors: [{ line: 1, message: `Header harus: ${CSV_COLUMNS.join(",")}` }],
    };
  report.total = rows.length - 1;
  if (report.total > 200)
    return {
      ...report,
      errors: [{ line: 1, message: "Maksimal 200 soal per impor." }],
    };
  const seen = new Set(existing.map(fingerprint));
  for (const row of rows.slice(1)) {
    if (row.cells.length !== 9) {
      report.errors.push({
        line: row.line,
        message: "Harus ada tepat 9 kolom.",
      });
      continue;
    }
    const [
      topicName,
      question_text,
      A,
      B,
      C,
      D,
      correct_option,
      level,
      explanation,
    ] = row.cells;
    const topic = topics.find(
      (t) =>
        t.slug === topicName ||
        t.name.toLowerCase() === topicName.toLowerCase(),
    );
    if (!topic) {
      report.errors.push({
        line: row.line,
        message: `Topik '${topicName}' belum terdaftar.`,
      });
      continue;
    }
    const difficulty =
      (
        { mudah: "easy", sedang: "medium", sulit: "hard" } as Record<
          string,
          string
        >
      )[level] ?? level;
    const parsed = questionInput.safeParse({
      topic_id: topic.id,
      question_text,
      options: { A, B, C, D },
      correct_option,
      difficulty,
      explanation,
    });
    if (!parsed.success) {
      report.errors.push({
        line: row.line,
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      continue;
    }
    const draft = parsed.data;
    const key = fingerprint(draft);
    if (seen.has(key)) {
      report.duplicates++;
      continue;
    }
    seen.add(key);
    report.valid.push(draft);
  }
  return report;
}
export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // Cegah formula spreadsheet saat laporan dibuka di Excel/Sheets.
  if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
