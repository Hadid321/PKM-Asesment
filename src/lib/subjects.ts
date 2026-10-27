export const SUBJECTS = [
  "matematika",
  "bahasa-inggris",
  "bahasa-indonesia",
] as const;
export type Subject = (typeof SUBJECTS)[number];
export const SUBJECT_NAMES: Record<Subject, string> = {
  matematika: "Matematika",
  "bahasa-inggris": "Bahasa Inggris",
  "bahasa-indonesia": "Bahasa Indonesia",
};
export function selectedSubject(value: unknown): Subject {
  return SUBJECTS.includes(value as Subject)
    ? (value as Subject)
    : "matematika";
}
const SUBJECT_ROUTES = new Set([
  "/dashboard",
  "/latihan",
  "/rekomendasi",
  "/rekap",
  "/paket-soal",
]);
export function subjectHref(path: string, subject: Subject) {
  return SUBJECT_ROUTES.has(path) ? `${path}?mapel=${subject}` : path;
}
export const LEGACY_ENRICHMENT = new Set([
  "limit-fungsi",
  "turunan-fungsi",
  "integral-dasar",
]);
