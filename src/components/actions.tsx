"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, LogOut, Copy, Check } from "lucide-react";
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}
export async function post<
  T = { message?: string; redirect?: string; session_id?: string },
>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Koneksi terputus. Periksa jaringan, lalu coba lagi.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiRequestError(
      "Layanan belum memberikan respons yang dapat dibaca. Coba lagi beberapa saat.",
    );
  }
  if (!response.ok) {
    if (response.status === 401 && !url.startsWith("/api/auth"))
      window.location.assign(
        new URL("/login?status=expired", window.location.origin).href,
      );
    throw new ApiRequestError(
      data.error || "Permintaan belum dapat diproses.",
      typeof data.field === "string" ? data.field : undefined,
    );
  }
  return data as T;
}
export function StartButton({
  topicId,
  children = "Mulai latihan",
  secondary = false,
}: {
  topicId: string;
  children?: React.ReactNode;
  secondary?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <button
        className={`btn ${secondary ? "secondary" : "primary"}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const data = await post("/api/actions", {
              action: "start",
              topic_id: topicId,
            });
            router.push(`/kuis/${data.session_id}`);
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        {busy ? (
          <LoaderCircle className="spin" size={17} />
        ) : (
          <ArrowRight size={17} />
        )}
        {busy ? "Menyiapkan…" : children}
      </button>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function Logout() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        disabled={busy}
        className="logout"
        onClick={async () => {
          setBusy(true);
          try {
            await post("/api/auth/logout", {});
            window.location.assign(
              new URL("/login", window.location.origin).href,
            );
          } catch (e) {
            setError((e as Error).message);
            setBusy(false);
          }
        }}
      >
        <LogOut size={17} />
        {busy ? "Keluar…" : "Keluar"}
      </button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
export function SimpleForm({
  action,
  field,
  label,
  placeholder = "",
  initial = "",
  button,
}: {
  action: "create-class" | "join-class" | "profile";
  field: "name" | "code" | "full_name";
  label: string;
  placeholder?: string;
  initial?: string;
  button: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const data = await post("/api/actions", {
        action,
        [field]: new FormData(form).get(field),
      });
      setStatus(data.message || "Tersimpan.");
      if (action !== "profile") form.reset();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="stack">
      <label>
        {label}
        <input
          name={field}
          required
          maxLength={100}
          minLength={action === "join-class" ? 6 : 1}
          placeholder={placeholder}
          defaultValue={initial}
        />
      </label>
      <button className="btn primary" disabled={busy}>
        {busy ? "Menyimpan…" : button}
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
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="copy-code"
        aria-label={`Salin kode kelas ${code}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
          } catch {
            setError("Salin kode yang tampil secara manual.");
          }
        }}
      >
        {code}
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      {error && <small role="status">{error}</small>}
    </>
  );
}
