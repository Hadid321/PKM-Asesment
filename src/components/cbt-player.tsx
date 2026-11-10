"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CbtView } from "@/lib/server/cbt/engine";
import type { Option } from "@/lib/types";
import { Card, percent } from "./ui";
import { shouldAcceptCbtView } from "@/lib/cbt/client-state";
async function postExam<T>(body: unknown): Promise<T> {
  const r = await fetch("/api/cbt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(
      new Error(data.error ?? "Permintaan belum tersimpan."),
      { status: r.status },
    );
  return data;
}
const keys = ["A", "B", "C", "D"] as const;
type Pending = { id: string; option: Option | null; flagged: boolean };
export function CbtPlayer({ initial }: { initial: CbtView }) {
  const [data, setData] = useState(initial);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [warning, setWarning] = useState("");
  const [remaining, setRemaining] = useState(
    Math.max(
      0,
      Math.ceil(
        (Date.parse(initial.deadline_at) - Date.parse(initial.server_time)) /
          1000,
      ),
    ),
  );
  const offset = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousIndex = useRef(0);
  const fetching = useRef<AbortController | null>(null);
  const latest = useRef(initial);
  const applyView = useCallback((next: CbtView) => {
    if (!shouldAcceptCbtView(latest.current, next)) return;
    latest.current = next;
    offset.current = Date.parse(next.server_time) - Date.now();
    setData(next);
    if (next.status === "submitted") setPending(null);
  }, []);
  const refresh = useCallback(
    async (force = false) => {
      if (fetching.current && !force) return;
      fetching.current?.abort();
      const request = new AbortController();
      fetching.current = request;
      try {
        const r = await fetch("/api/cbt?sitting=" + data.id, {
          cache: "no-store",
          signal: request.signal,
        });
        const next = await r.json();
        if (!r.ok) throw Error(next.error ?? "Belum dapat memeriksa status.");
        applyView(next);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (fetching.current === request) fetching.current = null;
      }
    },
    [data.id, applyView],
  );
  useEffect(() => {
    if (data.status !== "active") return;
    offset.current = Date.parse(initial.server_time) - Date.now();
    let lastExpiryCheck = 0;
    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil(
          (Date.parse(data.deadline_at) - Date.now() - offset.current) / 1000,
        ),
      );
      setRemaining(seconds);
      if (seconds === 0 && Date.now() - lastExpiryCheck > 5000) {
        lastExpiryCheck = Date.now();
        void refresh();
      }
    };
    const timer = setInterval(tick, 1000);
    const statusTimer = setInterval(() => void refresh(), 30000);
    return () => {
      clearInterval(timer);
      clearInterval(statusTimer);
    };
  }, [data.status, data.deadline_at, initial.server_time, refresh]);
  useEffect(() => {
    function visible() {
      if (document.hidden) return;
      setWarning(
        "Tetap kerjakan ujian secara mandiri. Berpindah halaman tidak menghentikan waktu.",
      );
    }
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, []);
  useEffect(() => {
    function unload(e: BeforeUnloadEvent) {
      if (pending || busy) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [pending, busy]);
  useEffect(() => {
    if (index !== previousIndex.current) heading.current?.focus();
    previousIndex.current = index;
  }, [index]);
  const q = data.questions[index];
  const splitAt = q?.question_text.lastIndexOf("\n\n") ?? -1;
  const passage = splitAt >= 0 ? q.question_text.slice(0, splitAt) : "";
  const prompt =
    splitAt >= 0 ? q.question_text.slice(splitAt + 2) : q?.question_text;
  const current =
    pending?.id === q?.id
      ? pending
      : q
        ? { id: q.id, option: q.selected, flagged: q.flagged }
        : null;
  async function save(value: Pending) {
    setPending(value);
    setBusy(true);
    setError("");
    try {
      const r = await postExam<{ view: CbtView }>({
        action: "save",
        sitting_id: data.id,
        item_id: value.id,
        option: value.option,
        flagged: value.flagged,
        expected_version: latest.current.version,
      });
      applyView(r.view);
      setPending(null);
    } catch (e) {
      if ((e as Error & { status?: number }).status === 409)
        await refresh(true);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (pending || busy) return;
    if (
      !window.confirm(
        `Kumpulkan ujian? ${data.answered} dari 24 soal sudah dijawab. Setelah dikumpulkan, jawaban tidak dapat diubah.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const r = await postExam<{ view: CbtView }>({
        action: "submit",
        sitting_id: data.id,
        expected_version: latest.current.version,
      });
      applyView(r.view);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (data.status === "submitted")
    return (
      <div className="cbt-player">
        <Card className="prose">
          <p className="eyebrow">UJIAN CBT</p>
          <h1>Jawaban sudah dikumpulkan</h1>
          <p>
            {data.title} · {data.answered} dari 24 soal dijawab.
          </p>
          {data.result ? (
            <>
              <h2>Nilai {data.result.score}/100</h2>
              <p>
                {data.result.correct} dari {data.result.total} jawaban benar.
                Hasil dan pembahasan sudah dibuka oleh guru.
              </p>
              <h3>Perkiraan pemahaman pada ujian</h3>
              {data.result.topics.map((t) => (
                <p key={t.id}>
                  {t.name}: {percent(t.p_l)}
                </p>
              ))}
              <p className="small muted">
                BKT memakai rumus yang sama dengan latihan. Estimasi ujian
                disimpan terpisah agar nilai latihan sebelumnya tetap utuh; ini
                bukan sertifikasi penguasaan.
              </p>
            </>
          ) : (
            <p className="notice">
              Nilai, kunci, dan pembahasan menunggu guru menutup ujian dan
              merilis hasil untuk seluruh peserta.
            </p>
          )}
          <div className="cbt-controls">
            <button className="btn secondary" onClick={() => void refresh()}>
              Periksa hasil terbaru
            </button>
            <Link className="btn secondary" href="/ujian">
              Kembali ke daftar ujian
            </Link>
          </div>
        </Card>
        {data.result?.review.map((item, i) => (
          <Card className="mt prose" key={item.id}>
            <h2>
              {i + 1}.{" "}
              {item.is_correct
                ? "Benar"
                : item.selected_option
                  ? "Perlu ditinjau"
                  : "Tidak dijawab"}
            </h2>
            <p className="cbt-text">{item.question_text}</p>
            {Object.entries(item.options).map(([key, text]) => (
              <p key={key}>
                {key}. {text}
              </p>
            ))}
            <p>
              Jawaban Anda: {item.selected_option ?? "—"} · Kunci:{" "}
              {item.correct_option}
            </p>
            <p>{item.explanation}</p>
          </Card>
        ))}
      </div>
    );
  return (
    <div className="cbt-player">
      <div className="cbt-top">
        <div>
          <p className="eyebrow">UJIAN CBT</p>
          <h1>{data.title}</h1>
        </div>
        <div className="cbt-clock" role="timer" aria-label="Sisa waktu ujian">
          {Math.floor(remaining / 60)
            .toString()
            .padStart(2, "0")}
          :{(remaining % 60).toString().padStart(2, "0")}
        </div>
      </div>
      <p className="small muted">
        Jawaban tersimpan otomatis. Waktu mengikuti server dan tetap berjalan
        jika Anda berpindah halaman.
      </p>
      {warning && (
        <p className="notice" role="status">
          {warning}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}{" "}
          {pending && (
            <button
              className="btn secondary"
              disabled={busy}
              onClick={() => void save(pending)}
            >
              Coba simpan lagi
            </button>
          )}
        </p>
      )}
      <div className="cbt-grid">
        <Card className="cbt-question">
          {q && current ? (
            <>
              <h2 ref={heading} tabIndex={-1} className="eyebrow">
                SOAL {index + 1} DARI 24
              </h2>
              {passage && (
                <div className="cbt-passage">
                  <p className="cbt-text">{passage}</p>
                </div>
              )}
              <p className="cbt-text cbt-prompt">{prompt}</p>
              <fieldset
                className="options"
                disabled={busy || pending !== null || remaining === 0}
              >
                <legend>Pilih satu jawaban</legend>
                {keys.map((key) => (
                  <label
                    className={`answer-option ${current.option === key ? "selected" : ""}`}
                    key={key}
                  >
                    <input
                      type="radio"
                      name="cbt-answer"
                      checked={current.option === key}
                      onChange={() =>
                        void save({
                          id: q.id,
                          option: key,
                          flagged: current.flagged,
                        })
                      }
                    />
                    <span className="option-letter">{key}</span>
                    <span>{q.options[key]}</span>
                  </label>
                ))}
              </fieldset>
              <label className="cbt-flag">
                <input
                  type="checkbox"
                  checked={current.flagged}
                  disabled={busy || pending !== null}
                  onChange={(e) =>
                    void save({
                      id: q.id,
                      option: current.option,
                      flagged: e.target.checked,
                    })
                  }
                />
                Tandai ragu-ragu
              </label>
              <p role="status" className="small muted">
                {busy
                  ? "Menyimpan jawaban…"
                  : pending
                    ? "Jawaban belum tersimpan."
                    : "Semua perubahan sudah tersimpan."}
              </p>
              <div className="cbt-controls">
                <button
                  className="btn secondary"
                  disabled={index === 0 || busy || pending !== null}
                  onClick={() => setIndex((i) => i - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  className="btn primary"
                  disabled={index === 23 || busy || pending !== null}
                  onClick={() => setIndex((i) => i + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </>
          ) : (
            <p>Memeriksa status ujian…</p>
          )}
        </Card>
        <Card className="cbt-navigator">
          <h2>Nomor soal</h2>
          <p>{data.answered}/24 terjawab</p>
          <div className="cbt-number-grid">
            {data.questions.map((item, i) => (
              <button
                key={item.id}
                aria-label={`Soal ${i + 1}${item.selected ? ", terjawab" : ", belum dijawab"}${item.flagged ? ", ragu-ragu" : ""}`}
                aria-current={i === index ? "step" : undefined}
                className={`${item.selected ? "answered" : ""} ${item.flagged ? "flagged" : ""}`}
                disabled={busy || pending !== null}
                onClick={() => setIndex(i)}
              >
                {i + 1}
                {item.flagged && <span aria-hidden="true">?</span>}
              </button>
            ))}
          </div>
          <p className="small muted">
            Terisi: sudah dijawab · ?: ragu-ragu. Nomor yang sedang dibuka
            diberi garis tebal.
          </p>
          <button
            className="btn primary"
            disabled={busy || pending !== null}
            onClick={() => void submit()}
          >
            Kumpulkan ujian
          </button>
          <button
            className="btn secondary"
            onClick={() => {
              if (document.documentElement.requestFullscreen)
                void document.documentElement
                  .requestFullscreen()
                  .catch(() =>
                    setWarning(
                      "Layar penuh tidak tersedia. Ujian tetap dapat dikerjakan.",
                    ),
                  );
            }}
          >
            Layar penuh
          </button>
          <p className="small muted">
            Minta bantuan pengawas jika ada kendala. Kunci tidak ditampilkan
            selama pengerjaan.
          </p>
        </Card>
      </div>
    </div>
  );
}
