import type { Subject } from "../subjects";
import type { Topic } from "../types";

export const CURRICULUM_VERSION = "kelas12-2026-10-27";
export const CURRICULUM_SOURCES = [
  {
    id: "cp-2025",
    title: "Capaian Pembelajaran 2025 — Keputusan Kepala BSKAP 046/H/KR/2025",
    url: "https://kurikulum.kemendikdasmen.go.id/file/1753929861_manage_file.pdf",
    note: "Fase F mencakup kelas XI–XII; urutan kelas disesuaikan ATP sekolah.",
  },
  {
    id: "panduan-mapel",
    title: "Panduan Mata Pelajaran — Pusat Kurikulum dan Pembelajaran",
    url: "https://kurikulum.kemendikdasmen.go.id/panduan-mapel",
    note: "Rujukan penerjemahan CP menjadi pembelajaran dan asesmen.",
  },
  {
    id: "tka-2026",
    title:
      "Kisi-kisi resmi TKA SMA — Rumah Pendidikan, diperbarui 15 Oktober 2026",
    url: "https://pusatinformasi.rumahpendidikan.kemendikdasmen.go.id/hc/id/articles/52474934733209-Belajar-Lebih-Terarah-dengan-Kisi-Kisi-Resmi-TKA-untuk-Jenjang-SMA-MA-Sederajat-dan-SMK-MAK-dari-Pusmendik",
    note: "Acuan kompetensi membaca, penalaran, dan pemecahan masalah; bukan sumber salinan soal.",
  },
] as const;
export interface CurriculumTopic {
  slug: string;
  subject: Subject;
  name: string;
  description: string;
  objective: string;
  source_ids: string[];
}
export const CURRICULUM_TOPICS: CurriculumTopic[] = [
  {
    slug: "mtk-transformasi-fungsi",
    subject: "matematika",
    name: "Transformasi fungsi",
    description:
      "Menganalisis translasi, refleksi, dilatasi, dan komposisi transformasi grafik fungsi.",
    objective:
      "Menentukan dan menafsirkan perubahan grafik fungsi dalam konteks.",
    source_ids: ["cp-2025", "panduan-mapel"],
  },
  {
    slug: "mtk-busur-juring",
    subject: "matematika",
    name: "Busur dan juring lingkaran",
    description:
      "Menghubungkan sudut pusat, panjang busur, luas juring, dan persoalan lingkaran.",
    objective:
      "Memodelkan pengukuran lingkaran dan memilih solusi yang konsisten satuannya.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "mtk-kaidah-pencacahan",
    subject: "matematika",
    name: "Kaidah pencacahan",
    description:
      "Membedakan aturan perkalian, permutasi, dan kombinasi dalam situasi sehari-hari.",
    objective:
      "Memilih strategi menghitung berdasarkan urutan dan pembatasan pilihan.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "mtk-peluang-data",
    subject: "matematika",
    name: "Peluang dan penalaran data",
    description:
      "Menalar kejadian majemuk, peluang bersyarat, dan hubungan pada data.",
    objective:
      "Menghitung peluang serta membedakan asosiasi dari hubungan sebab-akibat.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "ing-informational-reading",
    subject: "bahasa-inggris",
    name: "Informational reading",
    description:
      "Memahami tujuan, detail, dan implikasi teks informasi berbahasa Inggris.",
    objective:
      "Menemukan informasi eksplisit, menyimpulkan, dan mengevaluasi bukti pada bacaan A2–B1.",
    source_ids: ["panduan-mapel", "tka-2026"],
  },
  {
    slug: "ing-narrative-reading",
    subject: "bahasa-inggris",
    name: "Narrative reading",
    description:
      "Menafsirkan alur, motivasi tokoh, dan nilai dalam narasi berbahasa Inggris.",
    objective:
      "Menghubungkan tindakan tokoh dengan konflik, perubahan sikap, dan pesan cerita.",
    source_ids: ["panduan-mapel", "tka-2026"],
  },
  {
    slug: "ing-argument-evaluation",
    subject: "bahasa-inggris",
    name: "Argument and evidence",
    description:
      "Membaca pendapat, hubungan logis, batas klaim, dan bukti pendukung.",
    objective: "Membedakan saran, alasan, dan kesimpulan yang didukung bacaan.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "ing-procedure-reading",
    subject: "bahasa-inggris",
    name: "Procedures and practical texts",
    description:
      "Menggunakan instruksi, pengumuman, dan teks praktis dalam situasi sekolah.",
    objective:
      "Menentukan urutan tindakan serta respons yang sesuai dengan syarat tertulis.",
    source_ids: ["panduan-mapel", "tka-2026"],
  },
  {
    slug: "indo-informasi-teks",
    subject: "bahasa-indonesia",
    name: "Informasi dan struktur teks",
    description:
      "Menemukan informasi, gagasan utama, dan hubungan antarbagian teks informasi.",
    objective:
      "Menyajikan kembali isi teks secara akurat tanpa mengubah batas informasinya.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "indo-inferensi-argumen",
    subject: "bahasa-indonesia",
    name: "Inferensi dan argumentasi",
    description:
      "Menafsirkan informasi tersirat, simpulan, dan hubungan alasan dalam argumen.",
    objective:
      "Memilih simpulan yang ditopang teks dan menghindari generalisasi berlebihan.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "indo-evaluasi-klaim",
    subject: "bahasa-indonesia",
    name: "Evaluasi klaim dan kebahasaan",
    description:
      "Menilai kekuatan bukti, keandalan informasi, dan ketepatan bahasa.",
    objective:
      "Mengkritisi klaim dengan bukti relevan serta memperbaiki kalimat yang tidak efektif.",
    source_ids: ["cp-2025", "tka-2026"],
  },
  {
    slug: "indo-apresiasi-sastra",
    subject: "bahasa-indonesia",
    name: "Apresiasi teks sastra",
    description:
      "Mengapresiasi tokoh, konflik, citraan, dan makna kias dalam teks sastra.",
    objective:
      "Menafsirkan makna dan nilai dengan merujuk detail teks, bukan dugaan di luar bacaan.",
    source_ids: ["cp-2025", "tka-2026"],
  },
];
export function curriculumTopics(): Topic[] {
  return CURRICULUM_TOPICS.map((t, i) => ({
    id: `21000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name: t.name,
    slug: t.slug,
    description: t.description,
    subject: t.subject,
    curriculum_track: "wajib",
    sort_order: 100 + i,
    material_title: "Rujukan kompetensi dan kisi-kisi",
    material_url: CURRICULUM_SOURCES[2].url,
    created_at: "2026-10-27T00:00:00.000Z",
  }));
}
