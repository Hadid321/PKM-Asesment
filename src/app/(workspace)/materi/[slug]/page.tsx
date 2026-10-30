import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, PageTitle, Badge } from "@/components/ui";
import { LEARNING_MATERIALS } from "@/lib/learning-materials";
import { subjectHref } from "@/lib/subjects";
const content: Record<
  string,
  { title: string; paragraphs: string[]; example: string }
> = {
  "limit-fungsi": {
    title: "Limit fungsi",
    paragraphs: [
      "Limit menggambarkan nilai yang didekati suatu fungsi ketika x mendekati nilai tertentu. Untuk polinomial yang kontinu, gunakan substitusi langsung.",
      "Jika substitusi pada bentuk pecahan memberikan 0/0, coba faktorkan pembilang dan penyebut, sederhanakan faktor yang sama, lalu hitung limitnya.",
    ],
    example:
      "lim x→2 (x² − 4)/(x − 2) = lim x→2 (x + 2) = 4. Penyederhanaan dilakukan untuk x ≠ 2; limit melihat nilai pendekatan.",
  },
  "turunan-fungsi": {
    title: "Turunan fungsi",
    paragraphs: [
      "Turunan menyatakan laju perubahan sesaat suatu fungsi. Dasarnya berkaitan dengan limit hasil bagi perubahan.",
      "Aturan pangkat: jika f(x) = axⁿ maka f′(x) = anxⁿ⁻¹ untuk kasus polinomial di latihan ini. Turunan konstanta adalah nol.",
    ],
    example:
      "f(x) = 3x² + 2x + 1, sehingga f′(x) = 6x + 2. Pada x = 1, laju perubahan f′(1) = 8.",
  },
  "integral-dasar": {
    title: "Integral dasar",
    paragraphs: [
      "Integral tak tentu mencari keluarga antiturunan. Untuk n ≠ −1, ∫ axⁿ dx = a xⁿ⁺¹/(n + 1) + C.",
      "Untuk integral tentu polinomial dari a sampai b, tentukan antiturunan F lalu hitung F(b) − F(a). Jangan menambahkan C pada hasil akhir integral tentu.",
    ],
    example: "∫ dari 0 sampai 2 untuk 6x dx = [3x²]₀² = 3(2²) − 3(0²) = 12.",
  },
  "peluang-kejadian": {
    title: "Peluang kejadian",
    paragraphs: [
      "Untuk hasil yang sama mungkin, peluang suatu kejadian adalah banyak hasil yang memenuhi kejadian dibagi banyak hasil di ruang sampel.",
      "Untuk dua kejadian independen, P(A ∩ B) = P(A) × P(B). Pastikan asumsi independensi berlaku sebelum memakai aturan ini.",
    ],
    example:
      "Dua koin adil menghasilkan AA, AG, GA, GG dengan peluang sama. Peluang keduanya gambar adalah 1/4 = 25%.",
  },
};
export default async function Material({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lesson = Object.hasOwn(LEARNING_MATERIALS, slug)
    ? LEARNING_MATERIALS[slug]
    : undefined;
  const article =
    lesson ?? (Object.hasOwn(content, slug) ? content[slug] : undefined);
  if (!article) notFound();
  return (
    <>
      <PageTitle
        eyebrow="CATATAN BELAJAR"
        title={article.title}
        description={
          lesson
            ? "Baca langkahnya, coba contoh, lalu periksa alasan jawabanmu bersama guru."
            : "Materi lokal contoh untuk pengembangan. Bukan materi resmi sekolah atau klaim verifikasi kurikulum."
        }
      />
      <Card className="prose narrow-card">
        <Badge>
          {lesson ? "Bahan pendamping belajar" : "Contoh materi prototipe"}
        </Badge>
        {article.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <h2>Contoh</h2>
        <div className="notice">{article.example}</div>
        {lesson && (
          <>
            <h2>Latihan mandiri</h2>
            <p>{lesson.exercise.prompt}</p>
            <details className="review-detail">
              <summary>Lihat pembahasan latihan mandiri</summary>
              <p>{lesson.exercise.explanation}</p>
            </details>
          </>
        )}
        <p>
          Coba kerjakan satu soal serupa, periksa langkahmu, lalu baca
          pembahasan untuk memahami kesalahan.
        </p>
        <Link
          className="btn primary"
          href={subjectHref("/latihan", lesson?.subject ?? "matematika")}
        >
          Kembali ke latihan
        </Link>
      </Card>
    </>
  );
}
