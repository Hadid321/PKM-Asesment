"use client";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  ArrowRight,
  GraduationCap,
  Users,
  Eye,
  EyeOff,
  MailCheck,
  LoaderCircle,
} from "lucide-react";
import { ApiRequestError, post } from "./actions";
import { loginInput, registerInput } from "@/lib/validation";
import styles from "./public.module.css";
type FieldName = "full_name" | "email" | "password";
const fields: FieldName[] = ["full_name", "email", "password"];
const subscribeToReady = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
export function AuthForm({
  mode,
  register = false,
}: {
  mode: "demo" | "supabase";
  register?: boolean;
}) {
  const ready = useSyncExternalStore(
    subscribeToReady,
    clientReady,
    serverReady,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [visible, setVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const formRef = useRef<HTMLFormElement>(null);
  function focusField(name: FieldName) {
    const input = formRef.current?.elements.namedItem(name);
    if (input instanceof HTMLInputElement) input.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setStatus("");
    setFieldErrors({});
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (register ? registerInput : loginInput).safeParse(values);
    if (!parsed.success) {
      const errors: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        if (fields.includes(field) && !errors[field])
          errors[field] = issue.message;
      }
      setFieldErrors(errors);
      const first = fields.find((field) => errors[field]);
      if (first) focusField(first);
      return;
    }
    setBusy(true);
    try {
      const data = await post(
        `/api/auth/${register ? "register" : "login"}`,
        parsed.data,
      );
      if (data.redirect) window.location.assign(data.redirect);
      else setStatus(data.message || "Berhasil.");
    } catch (e) {
      if (
        e instanceof ApiRequestError &&
        fields.includes(e.field as FieldName)
      ) {
        const field = e.field as FieldName;
        setFieldErrors({ [field]: e.message });
        // Tunggu field diaktifkan kembali sebelum mengembalikan fokus.
        requestAnimationFrame(() => focusField(field));
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function demo(role: "student" | "teacher") {
    setBusy(true);
    setError("");
    try {
      const data = await post("/api/auth/demo", { role });
      window.location.assign(data.redirect!);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      {mode === "demo" ? (
        <div className="stack">
          <div className="notice">
            <strong>Demo lokal</strong>
            <p>
              Tanpa akun eksternal. Jawaban latihan disimpan di komputer ini.
              Jangan gunakan data atau kata sandi sungguhan.
            </p>
          </div>
          <button
            className="demo-role"
            disabled={busy || !ready}
            onClick={() => demo("student")}
          >
            <span className="role-icon">
              <GraduationCap />
            </span>
            <span>
              <strong>Masuk sebagai siswa</strong>
              <small>Rani Putri · Latihan & rekomendasi</small>
            </span>
            <ArrowRight size={20} />
          </button>
          <button
            className="demo-role"
            disabled={busy || !ready}
            onClick={() => demo("teacher")}
          >
            <span className="role-icon teacher">
              <Users />
            </span>
            <span>
              <strong>Masuk sebagai guru</strong>
              <small>Maya Pramesti · Kelas & bank soal</small>
            </span>
            <ArrowRight size={20} />
          </button>
          {busy && <p role="status">Menyiapkan ruang belajar…</p>}
        </div>
      ) : register && status ? (
        <div className={styles.confirmation} role="status" aria-live="polite">
          <MailCheck size={28} strokeWidth={1.5} />
          <h3>Periksa emailmu</h3>
          <p>{status}</p>
          <Link className="btn secondary full" href="/login">
            Ke halaman masuk <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <form
          ref={formRef}
          className="stack"
          onSubmit={submit}
          noValidate
          aria-busy={busy}
          onChange={(event) => {
            if (!(event.target instanceof HTMLInputElement)) return;
            const name = event.target.name as FieldName;
            if (fields.includes(name))
              setFieldErrors((current) => ({ ...current, [name]: undefined }));
            setError("");
          }}
        >
          {register && (
            <div className={styles.fieldGroup}>
              <label htmlFor="auth-full-name">Nama lengkap</label>
              <input
                name="full_name"
                id="auth-full-name"
                required
                disabled={busy}
                maxLength={100}
                autoComplete="name"
                placeholder="Nama yang digunakan di kelas"
                aria-invalid={!!fieldErrors.full_name}
                aria-describedby={
                  fieldErrors.full_name ? "auth-name-error" : undefined
                }
              />
              {fieldErrors.full_name && (
                <span
                  id="auth-name-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {fieldErrors.full_name}
                </span>
              )}
            </div>
          )}
          <div className={styles.fieldGroup}>
            <label htmlFor="auth-email">Email</label>
            <input
              name="email"
              id="auth-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={busy}
              maxLength={254}
              autoComplete="email"
              placeholder="Alamat email aktif"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={
                `${register ? "auth-email-hint " : ""}${fieldErrors.email ? "auth-email-error" : ""}`.trim() ||
                undefined
              }
            />
            {fieldErrors.email && (
              <span
                id="auth-email-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.email}
              </span>
            )}
            {register && (
              <span id="auth-email-hint" className={styles.fieldHint}>
                Gunakan email yang bisa kamu buka untuk konfirmasi akun.
              </span>
            )}
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor="auth-password">Kata sandi</label>
            <span className="password-field">
              <input
                name="password"
                id="auth-password"
                type={visible ? "text" : "password"}
                required
                disabled={busy}
                minLength={8}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "Buat kata sandi" : "Masukkan kata sandi"
                }
                aria-invalid={!!fieldErrors.password}
                aria-describedby={
                  `${register ? "auth-password-hint " : ""}${fieldErrors.password ? "auth-password-error" : ""}`.trim() ||
                  undefined
                }
              />
              <button
                type="button"
                disabled={!ready || busy}
                aria-pressed={visible}
                aria-label={
                  visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
            {fieldErrors.password && (
              <span
                id="auth-password-error"
                className={styles.fieldError}
                role="alert"
              >
                {fieldErrors.password}
              </span>
            )}
            {register && (
              <span id="auth-password-hint" className={styles.fieldHint}>
                Minimal 8 karakter. Hindari nama atau kata sandi yang mudah
                ditebak.
              </span>
            )}
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn primary full" disabled={busy || !ready}>
            {busy
              ? register
                ? "Mendaftarkan akun…"
                : "Sedang masuk…"
              : register
                ? "Buat akun siswa"
                : "Masuk"}
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
          </button>
          <p className="auth-switch">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link href={register ? "/login" : "/registrasi"}>
              {register ? "Masuk" : "Daftar sebagai siswa"}
            </Link>
          </p>
        </form>
      )}
      {error && mode === "demo" && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {status && !register && (
        <p className="form-success" role="status">
          {status}
        </p>
      )}
    </>
  );
}
