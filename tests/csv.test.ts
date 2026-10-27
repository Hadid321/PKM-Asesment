import { describe, it, expect } from "vitest";
import { CSV_COLUMNS, csvCell, parseCsv, validateCsv } from "@/lib/domain/csv";
import { seedContent } from "@/lib/demo/seed";
const seed = seedContent();
const header = CSV_COLUMNS.join(",");
const row =
  'limit-fungsi,"Berapa nilai fungsi, jika x=2?",1,2,3,4,A,mudah,"Substitusi, lalu hitung."';
describe("Impor CSV", () => {
  it("menerima BOM, koma dalam kutip, dan UTF-8", () => {
    const r = validateCsv("\uFEFF" + header + "\r\n" + row, seed.topics, []);
    expect(r.errors).toEqual([]);
    expect(r.valid).toHaveLength(1);
  });
  it("mendukung newline dan kutip ganda di dalam field", () =>
    expect(parseCsv('a,"b\n""c"""')[0].cells[1]).toBe('b\n"c"'));
  it("melaporkan nomor baris dan topik yang tidak dikenal", () => {
    const r = validateCsv(
      header + "\n" + row.replace("limit-fungsi", "tidak-ada"),
      seed.topics,
      [],
    );
    expect(r.errors[0].line).toBe(2);
    expect(r.valid).toHaveLength(0);
  });
  it("menolak kunci/difficulty/pilihan invalid", () => {
    expect(
      validateCsv(
        header + "\n" + row.replace(",A,mudah,", ",Z,acak,"),
        seed.topics,
        [],
      ).errors.length,
    ).toBe(1);
  });
  it("melaporkan duplikat di file", () => {
    const r = validateCsv(header + "\n" + row + "\n" + row, seed.topics, []);
    expect(r.duplicates).toBe(1);
    expect(r.valid).toHaveLength(1);
  });
  it("menolak header rusak dan kutip terbuka", () => {
    expect(validateCsv("topik,nama\na,b", seed.topics, []).errors.length).toBe(
      1,
    );
    expect(() => parseCsv('a,"b')).toThrow();
  });
  it("menetralkan formula pada ekspor spreadsheet", () =>
    expect(csvCell("=HYPERLINK(1)")).toContain("'=HYPERLINK"));
});
