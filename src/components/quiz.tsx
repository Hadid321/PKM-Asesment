"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import type { Attempt, Option } from "@/lib/types";
import type { QuizData } from "@/lib/server/assessment";
import { post } from "./actions";
import { SUBJECT_NAMES } from "@/lib/subjects";
import {
  Badge,
  Card,
  EstimateNote,
  PageTitle,
  percent,
  ProgressBar,
} from "./ui";
export function Quiz({ initial }: { initial: QuizData }) {
  const router = useRouter();
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState<Option | null>(null),
    [feedback, setFeedback] = useState<Attempt | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const q = data.question;
  const readingParts = q?.question_text.split("\n\n");
  const isReading =
    readingParts &&
    readingParts.length >= 3 &&
    /^(Read the following practice text\.|Bacalah teks latihan berikut\.)$/.test(
      readingParts[0],
    );
  const savedCount =
    data.attempts.length +
    (feedback && !data.attempts.some((a) => a.id === feedback.id) ? 1 : 0);
  async function answer() {
    if (!selected || !q) return;
    setBusy(true);
    setError("");
    try {
      const result = await post<{ feedback: Attempt }>("/api/actions", {
        action: "answer",
        session_id: data.session.id,
        question_id: q.id,
        selected_option: selected,
      });
      setFeedback(result.feedback);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/session/${data.session.id}`, {
        cache: "no-store",
      });
      const nextData = await response.json();
      if (!response.ok) {
        if (response.status === 401) router.replace("/login?status=expired");
        throw new Error(nextData.error);
      }
      if (nextData.session.status === "completed") {
        router.push(`/hasil/${data.session.id}`);
        return;
      }
      setData(nextData as QuizData);
      setSelected(null);
      setFeedback(null);
    } catch (e) {
      setError((e as Error).message || "Koneksi terputus. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="quiz-container">
      <PageTitle
        eyebrow={`LATIHAN ADAPTIF / ${SUBJECT_NAMES[data.topic.subject].toUpperCase()}`}
        title={data.topic.name}
        description="Tidak perlu terburu-buru. Pahami soalnya, lalu pilih jawaban terbaikmu."
      />
      <div className="quiz-progress">
        <span>
          Soal {Math.min(data.attempts.length + 1, data.max)} dari maksimal{" "}
          {data.max}
        </span>
        <span>{savedCount} soal tersimpan</span>
      </div>
      <ProgressBar value={savedCount / data.max} label="Progres sesi" />
      <Card className="question-card">
        {q ? (
          <>
            <div className="section-head">
              <Badge tone="green">
                {
                  { easy: "Mudah", medium: "Sedang", hard: "Sulit" }[
                    q.difficulty
                  ]
                }
              </Badge>
              <span className="muted small">Pilihan ganda · Satu jawaban</span>
            </div>
            {isReading ? (
              <>
                <p className="small muted">{readingParts[0]}</p>
                <div className="reading-passage">
                  {readingParts.slice(1, -1).join("\n\n")}
                </div>
                <h2>{readingParts.at(-1)}</h2>
              </>
            ) : (
              <h2>{q.question_text}</h2>
            )}
            <fieldset disabled={busy || !!feedback} className="options">
              <legend className="sr-only">Pilih satu jawaban</legend>
              {(["A", "B", "C", "D"] as const).map((option) => (
                <label
                  className={`answer-option ${selected === option ? "selected" : ""} ${feedback?.correct_option === option ? "correct" : ""}`}
                  key={option}
                >
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selected === option}
                    onChange={() => setSelected(option)}
                  />
                  <span className="option-letter">{option}</span>
                  <span>{q.options[option]}</span>
                  {feedback?.correct_option === option && (
                    <CheckCircle2 size={20} />
                  )}
                </label>
              ))}
            </fieldset>
            {feedback ? (
              <div
                className={`feedback ${feedback.is_correct ? "right" : "wrong"}`}
                role="status"
              >
                <div>
                  {feedback.is_correct ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <XCircle size={22} />
                  )}
                  <strong>
                    {feedback.is_correct
                      ? "Jawabanmu tepat"
                      : "Mari pahami kembali"}
                  </strong>
                </div>
                <p>{feedback.explanation}</p>
                <small>
                  Kunci setelah dinilai: {feedback.correct_option} · BKT{" "}
                  {percent(feedback.p_before)} → {percent(feedback.p_after)}
                </small>
              </div>
            ) : (
              <p className="question-hint">
                <CircleHelp size={16} /> Jawaban akan dinilai dan disimpan
                sebelum pembahasan ditampilkan.
              </p>
            )}
            <div className="quiz-actions">
              <Link href="/dashboard" className="text-link">
                Simpan & kembali nanti
              </Link>
              {feedback ? (
                <button disabled={busy} className="btn primary" onClick={next}>
                  {busy ? "Memuat…" : "Lanjutkan"}
                  <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="btn primary"
                  disabled={!selected || busy}
                  onClick={answer}
                >
                  {busy ? "Menyimpan jawaban…" : "Kirim jawaban"}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2>Sesi telah selesai</h2>
            <Link className="btn primary" href={`/hasil/${data.session.id}`}>
              Lihat ringkasan
            </Link>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error} Jawaban yang sudah tersimpan tidak akan dihitung ganda.
          </p>
        )}
      </Card>
      <EstimateNote />
    </div>
  );
}
