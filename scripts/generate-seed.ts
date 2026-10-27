import { mkdir, writeFile } from "node:fs/promises";
import { seedContent } from "../src/lib/demo/seed";
import { CSV_COLUMNS, csvCell } from "../src/lib/domain/csv";
const seed = seedContent();
const literal = (value: unknown) =>
  `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
const sql = [
  "-- Materi dan bank soal contoh pengembangan. Tidak membuat akun atau hasil siswa.",
];
for (const table of ["topics", "questions", "topic_prerequisites"] as const)
  sql.push(
    `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, ${literal(seed[table])}) on conflict do nothing;`,
  );
await mkdir("public/csv", { recursive: true });
await writeFile("supabase/seed.sql", sql.join("\n\n") + "\n", "utf8");
await writeFile(
  "public/csv/template-soal.csv",
  "\uFEFF" + CSV_COLUMNS.join(",") + "\r\n",
  "utf8",
);
const examples = [
  [
    "limit-fungsi",
    "Nilai lim x→3 (4x + 2) adalah …",
    "10",
    "12",
    "14",
    "16",
    "C",
    "mudah",
    "Substitusikan x = 3 sehingga 4(3) + 2 = 14.",
  ],
  [
    "turunan-fungsi",
    "Jika f(x) = x² + 5x, nilai f′(2) adalah …",
    "7",
    "9",
    "11",
    "13",
    "B",
    "sedang",
    "Turunannya f′(x) = 2x + 5. Pada x = 2, nilainya 9.",
  ],
  [
    "integral-dasar",
    "Nilai ∫ dari 0 sampai 1 untuk 12x² dx adalah …",
    "2",
    "3",
    "4",
    "6",
    "C",
    "sedang",
    "Antiturunan 12x² adalah 4x³. Maka [4x³]₀¹ = 4.",
  ],
  [
    "peluang-kejadian",
    "Satu dadu adil dilempar. Peluang muncul angka genap adalah …",
    "1/6",
    "1/3",
    "1/2",
    "2/3",
    "C",
    "mudah",
    "Angka genap adalah 2, 4, 6. Ada 3 dari 6 hasil yang sama mungkin, maka peluangnya 1/2.",
  ],
];
await writeFile(
  "public/csv/contoh-soal.csv",
  "\uFEFF" +
    [
      CSV_COLUMNS.join(","),
      ...examples.map((r) => r.map(csvCell).join(",")),
    ].join("\r\n") +
    "\r\n",
  "utf8",
);
console.log(
  `Seed: ${seed.topics.length} topik, ${seed.questions.length} soal. CSV template dan 4 soal contoh dibuat.`,
);
