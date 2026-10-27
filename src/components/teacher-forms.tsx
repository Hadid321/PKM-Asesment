"use client";
import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Pencil, Plus, X } from "lucide-react";
import type { Question, Topic, Prerequisite } from "@/lib/types";
import { questionInput, topicInput } from "@/lib/validation";
import { post } from "./actions";
import { Badge, Card, Empty } from "./ui";
import { SUBJECTS, SUBJECT_NAMES, type Subject } from "@/lib/subjects";
export function QuestionManager({
  questions,
  topics,
  actorId,
}: {
  questions: Question[];
  topics: Topic[];
  actorId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  function open(q: Question | "new") {
    setEditing(q);
    setError("");
    dialog.current?.showModal();
  }
  const q = editing && editing !== "new" ? editing : null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const f = Object.fromEntries(new FormData(event.currentTarget));
    const input = questionInput.safeParse({
      ...(q?.created_by === actorId ? { id: q.id } : {}),
      topic_id: f.topic_id,
      question_text: f.question_text,
      options: { A: f.A, B: f.B, C: f.C, D: f.D },
      correct_option: f.correct_option,
      difficulty: f.difficulty,
      explanation: f.explanation,
    });
    if (!input.success) {
      setError(input.error.issues.map((i) => i.message).join("; "));
      setBusy(false);
      return;
    }
    try {
      const result = await post("/api/actions", {
        action: "save-question",
        question: input.data,
      });
      setStatus(result.message!);
      dialog.current?.close();
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="toolbar">
        <label className="filter-label">
          Mata pelajaran
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setFilter("");
            }}
          >
            <option value="">Semua mapel</option>
            {SUBJECTS.map((id) => (
              <option key={id} value={id}>
                {SUBJECT_NAMES[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-label">
          Filter topik
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Semua topik</option>
            {topics
              .filter((t) => !subjectFilter || t.subject === subjectFilter)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.curriculum_track === "pengayaan" ? " (pengayaan)" : ""}
                </option>
              ))}
          </select>
        </label>
        <button className="btn primary" onClick={() => open("new")}>
          <Plus size={17} />
          Tambah soal
        </button>
      </div>
      {status && (
        <p role="status" className="form-success">
          {status}
        </p>
      )}
      <Card>
        {questions
          .filter(
            (q) =>
              q.created_by === actorId &&
              (!filter || q.topic_id === filter) &&
              (!subjectFilter ||
                topics.some(
                  (t) => t.id === q.topic_id && t.subject === subjectFilter,
                )),
          )
          .map((q) => (
            <div className="bank-row" key={q.id}>
              <div className="grow">
                <div className="inline-badges">
                  <Badge>
                    {
                      SUBJECT_NAMES[
                        topics.find((t) => t.id === q.topic_id)?.subject ??
                          "matematika"
                      ]
                    }
                  </Badge>
                  <Badge>{topics.find((t) => t.id === q.topic_id)?.name}</Badge>
                  <Badge
                    tone={
                      q.difficulty === "easy"
                        ? "green"
                        : q.difficulty === "medium"
                          ? "blue"
                          : "amber"
                    }
                  >
                    {
                      { easy: "Mudah", medium: "Sedang", hard: "Sulit" }[
                        q.difficulty
                      ]
                    }
                  </Badge>
                </div>
                <h3>{q.question_text}</h3>
                <small className="muted">
                  Kunci guru: {q.correct_option} · {q.explanation}
                </small>
              </div>
              <button
                className="btn secondary small-btn"
                onClick={() => open(q)}
              >
                <Pencil size={15} />
                Edit soal
              </button>
            </div>
          ))}
        {!questions.length && (
          <Empty>Belum ada soal. Tambahkan soal atau impor CSV.</Empty>
        )}
      </Card>
      <dialog
        ref={dialog}
        onCancel={() => setEditing(null)}
        className="editor-dialog"
      >
        <div className="dialog-heading">
          <h2>{q?.created_by === actorId ? "Edit soal" : "Buat soal"}</h2>
          <button
            className="icon-button"
            aria-label="Tutup editor"
            onClick={() => {
              dialog.current?.close();
              setEditing(null);
            }}
          >
            <X size={21} />
          </button>
        </div>
        {editing && (
          <form
            key={typeof editing === "string" ? "new" : editing.id}
            className="stack"
            onSubmit={submit}
          >
            <label>
              Topik
              <select name="topic_id" defaultValue={q?.topic_id} required>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {SUBJECT_NAMES[t.subject]} · {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pertanyaan
              <textarea
                name="question_text"
                defaultValue={q?.question_text}
                required
                maxLength={3000}
                rows={3}
              />
            </label>
            <div className="form-grid">
              {(["A", "B", "C", "D"] as const).map((key) => (
                <label key={key}>
                  Pilihan {key}
                  <input
                    name={key}
                    required
                    maxLength={600}
                    defaultValue={q?.options[key]}
                  />
                </label>
              ))}
              <label>
                Kunci jawaban
                <select name="correct_option" defaultValue={q?.correct_option}>
                  {["A", "B", "C", "D"].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label>
                Kesulitan
                <select name="difficulty" defaultValue={q?.difficulty}>
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                </select>
              </label>
            </div>
            <label>
              Pembahasan
              <textarea
                name="explanation"
                required
                maxLength={3000}
                defaultValue={q?.explanation}
                rows={3}
              />
            </label>
            <button className="btn primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan soal"}
            </button>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </form>
        )}
      </dialog>
    </>
  );
}
export function TopicManager({
  topics,
  prerequisites,
}: {
  topics: Topic[];
  prerequisites: Prerequisite[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Topic | "new" | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const t = editing && editing !== "new" ? editing : null;
  const [topicSubject, setTopicSubject] = useState<Subject>("matematika");
  function open(topic: Topic | "new") {
    setTopicSubject(topic === "new" ? "matematika" : topic.subject);
    setEditing(topic);
    setError("");
    dialog.current?.showModal();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    const data = topicInput.safeParse({
      subject: topicSubject,
      curriculum_track: t?.curriculum_track ?? f.get("curriculum_track"),
      ...(t ? { id: t.id } : {}),
      name: f.get("name"),
      slug: f.get("slug"),
      description: f.get("description"),
      material_title: f.get("material_title"),
      material_url: f.get("material_url"),
      prerequisites: f.getAll("prerequisites"),
    });
    if (!data.success) {
      setError(data.error.issues.map((i) => i.message).join("; "));
      setBusy(false);
      return;
    }
    try {
      const result = await post("/api/actions", {
        action: "save-topic",
        topic: data.data,
      });
      setStatus(result.message!);
      dialog.current?.close();
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="toolbar">
        <p className="muted">
          Katalog topik dan materi dipakai bersama oleh seluruh guru di proyek
          ini.
        </p>
        <button className="btn primary" onClick={() => open("new")}>
          <Plus size={17} />
          Tambah topik
        </button>
      </div>
      {status && (
        <p role="status" className="form-success">
          {status}
        </p>
      )}
      <div className="topic-grid">
        {topics.map((topic) => (
          <Card key={topic.id}>
            <div className="inline-badges">
              <Badge>{SUBJECT_NAMES[topic.subject]}</Badge>
              <Badge>
                {topic.curriculum_track === "pengayaan" ? "Pengayaan" : "Wajib"}
              </Badge>
            </div>
            <h2>{topic.name}</h2>
            <p className="muted">{topic.description}</p>
            <p className="small">
              Prasyarat:{" "}
              {prerequisites
                .filter((e) => e.topic_id === topic.id)
                .map(
                  (e) =>
                    topics.find((t) => t.id === e.prerequisite_topic_id)?.name,
                )
                .join(", ") || "Tidak ada"}
            </p>
            <p className="small">
              Materi: {topic.material_title || "Belum diisi"}
            </p>
            <button className="btn secondary" onClick={() => open(topic)}>
              <Pencil size={16} />
              Kelola topik & materi
            </button>
          </Card>
        ))}
      </div>
      <dialog
        className="editor-dialog"
        ref={dialog}
        onCancel={() => setEditing(null)}
      >
        <div className="dialog-heading">
          <h2>{t ? "Edit topik" : "Tambah topik"}</h2>
          <button
            className="icon-button"
            aria-label="Tutup editor"
            onClick={() => {
              dialog.current?.close();
              setEditing(null);
            }}
          >
            <X size={21} />
          </button>
        </div>
        {editing && (
          <form key={t?.id || "new"} className="stack" onSubmit={submit}>
            <label>
              Mata pelajaran
              <select
                value={topicSubject}
                disabled={Boolean(t)}
                onChange={(e) => setTopicSubject(e.target.value as Subject)}
              >
                {SUBJECTS.map((id) => (
                  <option key={id} value={id}>
                    {SUBJECT_NAMES[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Kategori
              <select
                name="curriculum_track"
                defaultValue={t?.curriculum_track ?? "wajib"}
                disabled={Boolean(t)}
              >
                <option value="wajib">Wajib</option>
                <option value="pengayaan">Pengayaan</option>
              </select>
            </label>
            <small className="muted">
              Mapel dan kategori tetap setelah topik dibuat agar riwayat tetap
              konsisten.
            </small>
            <label>
              Nama topik
              <input
                name="name"
                defaultValue={t?.name}
                required
                maxLength={100}
              />
            </label>
            <label>
              Slug unik
              <input
                name="slug"
                defaultValue={t?.slug}
                pattern="[a-z0-9-]+"
                placeholder="contoh-topik"
                required
                maxLength={100}
              />
            </label>
            <label>
              Deskripsi
              <textarea
                name="description"
                defaultValue={t?.description}
                required
                maxLength={1000}
              />
            </label>
            <label>
              Judul materi
              <input
                name="material_title"
                defaultValue={t?.material_title}
                maxLength={160}
              />
            </label>
            <label>
              Tautan materi
              <input
                name="material_url"
                defaultValue={t?.material_url}
                placeholder="https://… atau /materi/slug"
                maxLength={1200}
              />
            </label>
            <fieldset className="prerequisite-checks">
              <legend>Topik prasyarat</legend>
              {topics
                .filter(
                  (topic) =>
                    topic.id !== t?.id && topic.subject === topicSubject,
                )
                .map((topic) => (
                  <label key={topic.id}>
                    <input
                      type="checkbox"
                      name="prerequisites"
                      value={topic.id}
                      defaultChecked={prerequisites.some(
                        (e) =>
                          e.topic_id === t?.id &&
                          e.prerequisite_topic_id === topic.id,
                      )}
                    />
                    {topic.name}
                  </label>
                ))}
            </fieldset>
            <small className="muted">
              Sistem akan menolak hubungan prasyarat yang melingkar. Tautan
              HTTPS yang ditambahkan guru belum diperiksa otomatis.
            </small>
            <button className="btn primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan topik"}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        )}
      </dialog>
    </>
  );
}
interface ImportReport {
  total: number;
  valid_count: number;
  duplicates: number;
  errors: { line: number; message: string }[];
}
export function CsvImport() {
  const router = useRouter();
  const [filename, setFilename] = useState("");
  const [imported, setImported] = useState(false);
  const [csv, setCsv] = useState(""),
    [report, setReport] = useState<ImportReport | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("");
  async function send(preview: boolean) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await post<{ message: string; report: ImportReport }>(
        "/api/actions",
        { action: "import", csv, preview },
      );
      setReport(result.report);
      setStatus(result.message);
      setImported(!preview);
      if (!preview) router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="upload-steps" aria-label="Alur unggah soal">
        <span className={!report ? "current" : ""}>
          <span>1</span>Pilih file
        </span>
        <i />
        <span className={report && !imported ? "current" : ""}>
          <span>2</span>Validasi
        </span>
        <i />
        <span className={imported ? "current" : ""}>
          <span>3</span>Simpan ke bank soal
        </span>
      </div>
      <div className="dashboard-columns">
        <Card>
          <div className="section-head">
            <div>
              <h2>Unggah bank soal</h2>
              <p>CSV UTF-8 · Maksimal 500 KB atau 200 soal</p>
            </div>
            <FileSpreadsheet size={24} />
          </div>
          <div className="stack">
            <label className="upload-zone">
              <FileSpreadsheet size={32} />
              <strong>Pilih file CSV</strong>
              <span>
                {filename || "File dari perangkat Anda. Format .csv, UTF-8."}
              </span>
              <input
                type="file"
                aria-label="Pilih file CSV"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  setReport(null);
                  setStatus("");
                  setError("");
                  setFilename("");
                  setImported(false);
                  setCsv("");
                  if (!file) return;
                  if (!file.name.toLowerCase().endsWith(".csv")) {
                    setError("Pilih berkas dengan ekstensi .csv.");
                    setCsv("");
                    return;
                  }
                  if (file.size > 500000) {
                    setError("Ukuran file maksimal 500 KB.");
                    setCsv("");
                    return;
                  }
                  try {
                    setCsv(await file.text());
                    setFilename(
                      `${file.name} · ${(file.size / 1000).toFixed(1)} KB`,
                    );
                  } catch {
                    setError("File tidak dapat dibaca.");
                  }
                }}
              />
            </label>
            <details className="csv-paste">
              <summary>Tempel atau periksa isi CSV</summary>
              <label>
                Isi CSV
                <textarea
                  rows={6}
                  value={csv}
                  maxLength={500000}
                  disabled={busy}
                  placeholder="Atau tempel isi CSV di sini…"
                  onChange={(e) => {
                    setCsv(e.target.value);
                    setReport(null);
                    setStatus("");
                    setFilename("");
                    setImported(false);
                  }}
                />
              </label>
            </details>
            <button
              className="btn secondary"
              disabled={!csv || busy}
              onClick={() => send(true)}
            >
              {busy ? "Memproses…" : "Validasi & pratinjau"}
            </button>
            {report && (
              <div className="notice">
                <strong>
                  {report.total} baris · {report.valid_count}{" "}
                  {imported ? "berhasil diimpor" : "siap diimpor"} ·{" "}
                  {report.duplicates} duplikat dilewati
                </strong>
                {report.errors.length > 0 ? (
                  <ul>
                    {report.errors.map((e, i) => (
                      <li key={i}>
                        Baris {e.line}: {e.message}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {imported
                      ? "Soal tersimpan di bank soal Anda dan tersedia untuk siswa kelas Anda."
                      : "Semua baris valid. Soal baru akan ditambahkan setelah tombol impor ditekan."}
                  </p>
                )}
              </div>
            )}
            <button
              className="btn primary"
              disabled={
                !report ||
                report.errors.length > 0 ||
                !report.valid_count ||
                imported ||
                busy
              }
              onClick={() => send(false)}
            >
              {imported
                ? "Soal sudah diimpor"
                : `Impor ${report?.valid_count ?? 0} soal valid`}
            </button>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {status && (
              <p className="form-success" role="status">
                {status}
              </p>
            )}
          </div>
        </Card>
        <Card>
          <div className="section-label">PANDUAN UNGGAH</div>
          <h2>Siapkan file soal Anda</h2>
          <p className="muted small">
            Soal yang Anda unggah hanya dapat dikelola melalui akun guru Anda.
            Siswa mengerjakan soal melalui kelas yang Anda kelola.
          </p>
          <p className="muted">
            Seluruh file ditolak apabila ada baris tidak valid. Perbaiki file,
            lalu validasi ulang. Tidak ada impor sebagian secara diam-diam.
          </p>
          <div className="stack mt">
            <a className="btn secondary" download href="/csv/template-soal.csv">
              <Download size={17} />
              Unduh template
            </a>
            <a className="btn secondary" download href="/csv/contoh-soal.csv">
              <Download size={17} />
              Unduh contoh soal
            </a>
          </div>
          <p className="small muted mt">
            Kolom topik menerima slug atau nama topik yang sudah terdaftar.
            Kunci: A/B/C/D. Kesulitan: mudah/sedang/sulit. Gunakan tanda kutip
            untuk teks yang mengandung koma.
          </p>
          <p className="small muted">
            Duplikat ditentukan dari topik, pertanyaan, dan pilihan jawaban yang
            sama. Jumlah yang dilewati selalu ditampilkan.
          </p>
        </Card>
      </div>
    </>
  );
}
