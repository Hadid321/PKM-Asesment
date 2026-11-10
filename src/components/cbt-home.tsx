"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, PageTitle } from "./ui";
import { post } from "./actions";
import { SUBJECT_NAMES, SUBJECTS, type Subject } from "@/lib/subjects";
import type { ExamItem } from "@/lib/cbt/model";
import type { CbtList } from "@/lib/server/cbt/engine";
export function CbtHome({ initial }: { initial: CbtList }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const teacher = initial.role === "teacher";
  const [subject, setSubject] = useState<Subject>("matematika");
  const [preview, setPreview] = useState<ExamItem[] | null>(null);
  const [customCsv, setCustomCsv] = useState("");
  async function showPreview() {
    setBusy(true);
    setError("");
    try {
      const r = customCsv
        ? await fetch("/api/cbt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "preview",
              subject,
              custom_csv: customCsv,
            }),
          })
        : await fetch("/api/cbt?preview=" + subject, { cache: "no-store" });
      const body = await r.json();
      if (!r.ok) throw Error(body.error);
      setPreview(body.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function run(body: unknown) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await post<{ sitting_id?: string; message?: string }>(
        "/api/cbt",
        body,
      );
      if (r.sitting_id) router.push("/ujian/" + r.sitting_id);
      else {
        setMessage(r.message ?? "Tersimpan.");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageTitle
        eyebrow="ASESMEN SEKOLAH"
        title="Ujian CBT"
        description={
          teacher
            ? "Buka ujian untuk kelas Anda, pantau pengerjaan, lalu rilis hasil setelah ujian ditutup."
            : "Kerjakan ujian dari guru. Jawaban tersimpan otomatis; nilai dan pembahasan dibuka setelah guru merilis hasil."
        }
      />
      <Card className="prose cbt-intro">
        <h2>Sebelum mulai</h2>
        <p>
          24 soal per mapel, waktu standar 45 menit. Urutan soal dan pilihan
          diacak per peserta. Anda dapat berpindah nomor dan menandai jawaban
          ragu-ragu. Waktu tetap berjalan jika halaman ditutup.
        </p>
        <p>
          Kerjakan mandiri. Pengawasan di ruang ujian tetap diperlukan; aplikasi
          tidak mengawasi perangkat lain.
        </p>
      </Card>
      <button
        type="button"
        className="btn secondary"
        disabled={busy}
        onClick={() => router.refresh()}
      >
        Perbarui status pengerjaan
      </button>
      {teacher && (
        <Card className="mt">
          <h2>Buka ujian baru</h2>
          {initial.classes.length ? (
            <form
              className="cbt-publish"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run({
                  action: "publish",
                  reviewed: f.get("reviewed") === "on",
                  class_id: f.get("class_id"),
                  subject: f.get("subject"),
                  title: f.get("title"),
                  duration_minutes: Number(f.get("duration")),
                  custom_csv: customCsv || undefined,
                });
              }}
            >
              <label>
                Kelas
                <select name="class_id" required disabled={busy}>
                  {initial.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mata pelajaran
                <select
                  name="subject"
                  required
                  disabled={busy}
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value as Subject);
                    setPreview(null);
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {SUBJECT_NAMES[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Judul ujian
                <input
                  name="title"
                  required
                  minLength={4}
                  maxLength={120}
                  defaultValue="Ujian CBT PKM"
                  disabled={busy}
                />
              </label>
              <label>
                Durasi (menit)
                <input
                  name="duration"
                  type="number"
                  min={5}
                  max={180}
                  defaultValue={45}
                  required
                  disabled={busy}
                />
              </label>
              <label>
                CSV ujian baru (opsional)
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    setPreview(null);
                    setCustomCsv("");
                    if (!file) return;
                    if (file.size > 500000) {
                      setError("Berkas maksimal 500 KB.");
                      e.target.value = "";
                      return;
                    }
                    setCustomCsv(await file.text());
                  }}
                />
              </label>
              <p className="small muted">
                Paket bawaan tersedia untuk satu gelombang. Setelah kunci
                dibuka, butir yang sama tidak dapat dipakai lagi sebagai ujian
                rahasia. Untuk ujian berikutnya, unggah CSV berisi 24 soal baru
                pada mapel ini; soal CSV ujian tidak masuk bank latihan.
              </p>
              <button
                type="button"
                className="btn secondary"
                disabled={busy}
                onClick={() => void showPreview()}
              >
                Tinjau 24 soal dan kunci
              </button>
              {preview && (
                <div className="cbt-preview">
                  {preview.map((q, i) => (
                    <details key={q.id} className="review-detail">
                      <summary>
                        {i + 1}. {q.topic_name}
                      </summary>
                      <p className="cbt-text">{q.question_text}</p>
                      {Object.entries(q.options).map(([key, value]) => (
                        <p key={key}>
                          {key}. {value}
                        </p>
                      ))}
                      <p>
                        <strong>Kunci: {q.correct_option}</strong> ·{" "}
                        {q.explanation}
                      </p>
                    </details>
                  ))}
                </div>
              )}
              <label className="cbt-review">
                <input
                  type="checkbox"
                  name="reviewed"
                  required
                  disabled={busy}
                />
                Saya sudah meninjau soal, kunci, dan kesesuaiannya dengan kelas.
              </label>
              <button className="btn primary" disabled={busy}>
                Buka ujian untuk kelas
              </button>
            </form>
          ) : (
            <p>
              Buat kelas terlebih dahulu melalui{" "}
              <Link href="/kelas" className="text-link">
                Kelas &amp; siswa
              </Link>
              .
            </p>
          )}
        </Card>
      )}
      {error && (
        <p className="form-error mt" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice mt" role="status">
          {message}
        </p>
      )}
      <div className="cbt-exam-list">
        {initial.exams.length ? (
          initial.exams.map((e) => (
            <Card key={e.id}>
              <p className="eyebrow">
                {SUBJECT_NAMES[e.subject]} · {e.class_name}
              </p>
              <h2>{e.title}</h2>
              <p>
                {e.count} soal · {e.duration_minutes} menit ·{" "}
                {e.status === "open" ? "Ujian dibuka" : "Ujian ditutup"}
              </p>
              {teacher ? (
                <>
                  <p>
                    Kode ujian:{" "}
                    <strong className="cbt-code">{e.access_code}</strong>
                  </p>
                  <p className="small muted">
                    Bagikan kode saat semua peserta siap. Kode ujian berbeda
                    dari kode bergabung ke kelas.
                  </p>
                  <div className="cbt-controls">
                    {e.status === "open" ? (
                      <button
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Tutup ujian sekarang? Semua pengerjaan aktif akan dikumpulkan dengan jawaban yang sudah tersimpan.",
                            )
                          )
                            void run({ action: "close", exam_id: e.id });
                        }}
                      >
                        Akhiri ujian
                      </button>
                    ) : !e.released ? (
                      <button
                        className="btn primary"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Rilis nilai dan kunci pembahasan kepada semua peserta ujian ini?",
                            )
                          )
                            void run({ action: "release", exam_id: e.id });
                        }}
                      >
                        Rilis hasil dan pembahasan
                      </button>
                    ) : (
                      <p>Hasil sudah dirilis.</p>
                    )}
                  </div>
                  <div className="table-wrap">
                    <table>
                      <caption className="sr-only">
                        Pengerjaan {e.title}
                      </caption>
                      <thead>
                        <tr>
                          <th>Peserta</th>
                          <th>Status</th>
                          <th>Tersimpan</th>
                          <th>Nilai</th>
                        </tr>
                      </thead>
                      <tbody>
                        {e.participants?.map((s) => (
                          <tr key={s.id}>
                            <td>{s.name}</td>
                            <td>
                              {s.status === "active"
                                ? "Mengerjakan"
                                : "Dikumpulkan"}
                            </td>
                            <td>{s.answered}/24</td>
                            <td>{s.score ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!e.participants?.length && (
                    <p>Belum ada peserta yang memulai.</p>
                  )}
                </>
              ) : e.sitting ? (
                <Link className="btn primary" href={"/ujian/" + e.sitting.id}>
                  {e.sitting.status === "active"
                    ? "Lanjutkan ujian"
                    : e.released
                      ? "Lihat hasil"
                      : "Lihat status pengumpulan"}
                </Link>
              ) : e.status === "open" ? (
                <form
                  className="cbt-code-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const f = new FormData(event.currentTarget);
                    void run({
                      action: "start",
                      exam_id: e.id,
                      code: String(f.get("code")).trim().toUpperCase(),
                    });
                  }}
                >
                  <label>
                    Kode ujian dari guru
                    <input
                      name="code"
                      required
                      minLength={6}
                      maxLength={20}
                      autoComplete="off"
                      autoCapitalize="characters"
                      disabled={busy}
                    />
                  </label>
                  <button className="btn primary" disabled={busy}>
                    Mulai ujian
                  </button>
                </form>
              ) : (
                <p>Ujian ini sudah ditutup.</p>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <h2>Belum ada ujian untuk ditampilkan</h2>
            <p>
              {teacher
                ? "Pilih kelas dan mapel untuk membuka ujian pertama."
                : "Pastikan Anda sudah bergabung ke kelas. Guru akan membuka ujian saat kegiatan dimulai."}
            </p>
            {!teacher && (
              <Link className="btn secondary" href="/kelas">
                Buka Kelas saya
              </Link>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
