"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function TeacherAccessForm({ action, id }: { action: "issue" | "redeem" | "revoke"; id?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage(""); setCode("");
    try {
      const body = action === "issue" ? { action, email: form.get("email") } :
        action === "redeem" ? { action, code: form.get("code") } : { action, id };
      const response = await fetch("/api/teacher-access", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Permintaan gagal.");
      if (result.redirect === "/dashboard") { window.location.assign("/dashboard"); return; }
      setMessage(result.message || "Berhasil.");
      if (typeof result.code === "string") setCode(result.code);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Permintaan gagal."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className={`stack teacher-access-form${action === "revoke" ? " teacher-access-revoke" : ""}`}>
      {action === "issue" && <label>Email guru<input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="guru@email.com" disabled={busy} /></label>}
      {action === "redeem" && <label>Kode undangan<input name="code" required maxLength={32} autoComplete="off" spellCheck={false} disabled={busy} placeholder="Kode dari administrator" /></label>}
      <button className={action === "revoke" ? "btn secondary small-btn" : "btn primary"} disabled={busy} type="submit">
        {busy ? "Memproses…" : action === "issue" ? "Buat undangan" : action === "redeem" ? "Aktifkan akun guru" : "Cabut undangan"}
      </button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p role="status" className="notice">{message}</p>}
      {code && <div className="notice teacher-access-code"><strong>Salin kode ini sekarang</strong><input readOnly value={code} aria-label="Kode undangan baru" onFocus={(e) => e.currentTarget.select()} /><p>Kirim secara pribadi kepada guru yang dituju. Kode tidak dapat ditampilkan kembali.</p></div>}
    </form>
  );
}
