"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { curriculumPackage } from "@/lib/server/curriculum-content";
import type { Subject } from "@/lib/subjects";
import {
  CURRICULUM_COVERAGE,
  CURRICULUM_SOURCES,
} from "@/lib/curriculum/catalog";
import { selectedSubject, SUBJECT_NAMES } from "@/lib/subjects";
import { SubjectNav } from "@/components/subject-nav";
import { CurriculumImport } from "@/components/curriculum-import";
import { Badge, Card, PageTitle } from "@/components/ui";
type Package = ReturnType<typeof curriculumPackage>;
export function CurriculumView({ packs }: { packs: Record<Subject, Package> }) {
  const params = useSearchParams();
  const subject = selectedSubject(params.get("mapel"));
  const pack = packs[subject];
  return (
    <>
      <PageTitle
        eyebrow="BAHAN TINJAUAN GURU"
        title="Paket latihan kelas XII"
        description="72 soal orisinal untuk tiga mapel wajib. Tinjau paket per mapel sebelum menambahkannya ke bank soal Anda."
      />
      <SubjectNav subject={subject} base="/paket-soal" instant />
      <p className="sr-only" role="status">
        {SUBJECT_NAMES[subject]} ditampilkan.
      </p>
      <div key={subject} className="subject-content">
        <Card className="notice">
          <h2>
            {SUBJECT_NAMES[subject]} · {pack.questions.length} soal
          </h2>
          <p>
            Acuan CP Fase F dan kisi-kisi TKA, ditelaah 30 Oktober 2026. Ini
            latihan orisinal, bukan soal resmi atau simulasi lengkap TKA.
            Cakupan Fase F meliputi XI–XII; sesuaikan dengan ATP sekolah.
            Kesulitan mudah/sedang/sulit masih perkiraan awal.
          </p>
          <details className="review-detail">
            <summary>Cakupan K-13 dan Kurikulum Merdeka</summary>
            <p>{CURRICULUM_COVERAGE[subject].focus}</p>
            <p>{CURRICULUM_COVERAGE[subject].k13}</p>
            <p>
              Untuk Kurikulum Merdeka, Fase F mencakup XI–XII; urutan dan
              indikator kelas XII mengikuti ATP sekolah.
            </p>
            <p>{CURRICULUM_COVERAGE[subject].needs}</p>
          </details>
          <p>
            Paket menggunakan pilihan ganda satu jawaban. Keterampilan menyimak,
            berbicara, menulis produktif, dan seluruh cakupan TKA belum diukur.
            Setelah diimpor, siswa kelas Anda dapat mengerjakannya.
          </p>
          <CurriculumImport
            key={subject}
            subject={subject}
            count={pack.questions.length}
          />
          <p className="small mt">
            <Link
              className="text-link"
              href={`/api/paket-soal?mapel=${subject}`}
              download
            >
              Unduh CSV untuk ditinjau secara luring
            </Link>{" "}
            ·{" "}
            <Link className="text-link" href="/bank-soal">
              Buka bank soal
            </Link>
          </p>
        </Card>
        <div className="stack mt">
          {pack.topics.map((topic) => (
            <Card key={topic.slug}>
              <h2>{topic.name}</h2>
              <p>{topic.objective}</p>
              <div className="source-links">
                {CURRICULUM_SOURCES.filter((s) =>
                  topic.source_ids.includes(s.id),
                ).map((source) => (
                  <a
                    key={source.id}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title} ↗
                  </a>
                ))}
              </div>
              {pack.questions
                .filter((q) => q.topic_slug === topic.slug)
                .map((q) => (
                  <details className="review-detail" key={q.code}>
                    <summary>
                      {q.code} · {q.competency} ·{" "}
                      {
                        { easy: "Mudah", medium: "Sedang", hard: "Sulit" }[
                          q.difficulty
                        ]
                      }
                    </summary>
                    <p className="question-stimulus">{q.question_text}</p>
                    <ol type="A">
                      {Object.entries(q.options).map(([key, value]) => (
                        <li key={key}>{value}</li>
                      ))}
                    </ol>
                    <Badge>Kunci tinjauan guru: {q.correct_option}</Badge>
                    <p>{q.explanation}</p>
                  </details>
                ))}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
