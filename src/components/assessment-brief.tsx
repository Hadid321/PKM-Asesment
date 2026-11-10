"use client";
import { useState } from "react";
import type { LearningBrief } from "@/lib/assessment-support";
export function AssessmentBrief({
  targetId,
  teacher = false,
}: {
  targetId: string;
  teacher?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [data, setData] = useState<{
    brief: LearningBrief;
    source: string;
    topics: { key: string; name: string }[];
  } | null>(null);
  async function generate() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/assessment/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_id: targetId }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(result.error ?? "Ringkasan belum dapat dibuat.");
      if (result.pending) {
        setError("Ringkasan sedang disiapkan. Coba lagi sebentar.");
        return;
      }
      setData(result);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="assessment-brief"
      aria-label="Pendamping belajar Adaptiva"
    >
      <p className="eyebrow">PENDAMPING AI</p>
      <h2>Asisten belajar Adaptiva</h2>
      <p>
        {teacher
          ? "Temukan materi yang perlu dibahas ulang dan susun langkah pendampingan kelas dari hasil asesmen."
          : "Pahami materi yang perlu kamu kuatkan dan susun langkah belajar yang bisa langsung kamu lakukan."}
      </p>
      <p className="small muted">
        Saran disusun dari hasil dan prioritas materi. AI tidak mengubah nilai
        atau menentukan pelanggaran.
      </p>
      {!data && (
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy
            ? "Menyiapkan rencana…"
            : teacher
              ? "Susun arahan kelas"
              : "Buat rencana belajarku"}
        </button>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {data && (
        <>
          <p className="eyebrow">
            {data.source === "groq"
              ? "RINGKASAN BERBANTUAN AI"
              : "PANDUAN TERSTRUKTUR · AI TIDAK TERSEDIA"}
          </p>
          <p>{data.brief.overview}</p>
          {data.brief.actions.map((a) => (
            <div key={a.topic_key}>
              <h3>
                {data.topics.find((t) => t.key === a.topic_key)?.name ??
                  "Prioritas belajar"}
              </h3>
              <p>{a.explanation}</p>
              <ol>
                {a.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
          <p>
            <strong>Bahan refleksi:</strong> {data.brief.reflection}
          </p>
          <p className="small muted">
            Saran belajar perlu ditinjau bersama guru. Nilai, estimasi BKT, dan
            urutan prioritas tetap dihitung aplikasi.
          </p>
        </>
      )}
    </section>
  );
}
