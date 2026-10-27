"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Subject } from "@/lib/subjects";
import { post } from "./actions";
export function CurriculumImport({
  subject,
  count,
}: {
  subject: Subject;
  count: number;
}) {
  const router = useRouter();
  const [reviewed, setReviewed] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const result = await post("/api/actions", {
        action: "import-curriculum",
        subject,
        reviewed,
      });
      setStatus(result.message ?? "Soal diimpor.");
      setReviewed(false);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      <label className="review-accept">
        <input
          type="checkbox"
          checked={reviewed}
          disabled={busy}
          required
          onChange={(e) => setReviewed(e.target.checked)}
        />
        Saya telah meninjau soal, kunci, dan kesesuaiannya dengan pembelajaran
        kelas saya.
      </label>
      <button className="btn primary" disabled={!reviewed || busy}>
        {busy ? "Mengimpor…" : `Impor ${count} soal ke bank saya`}
      </button>
      {status && (
        <p className="form-success" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
