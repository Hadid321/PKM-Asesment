"use client";
import { useState } from "react";
import { post } from "./actions";
export function FocusResume({
  sittingId,
  name,
  onDone,
}: {
  sittingId: string;
  name: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="focus-resume"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          reason = String(new FormData(form).get("reason")).trim();
        setBusy(true);
        setError("");
        try {
          await post("/api/assessment/focus", {
            sitting_id: sittingId,
            request_id: crypto.randomUUID(),
            reason,
          });
          onDone();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Alasan izin lanjut untuk {name}
        <input
          name="reason"
          required
          minLength={8}
          maxLength={300}
          disabled={busy}
          placeholder="Contoh: sudah diperiksa pengawas"
        />
      </label>
      <button className="btn secondary" disabled={busy}>
        Beri izin lanjut
      </button>
      <p className="small muted">
        Hitungan saat ini diulang dari nol. Riwayat pelanggaran tetap tersimpan
        dan waktu tidak ditambah.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
