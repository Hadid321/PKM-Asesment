"use client";
import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, GraduationCap, Users, Eye, EyeOff } from "lucide-react";
import { post } from "./actions";
import { loginInput, registerInput } from "@/lib/validation";
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setStatus("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = (register ? registerInput : loginInput).safeParse(values);
    if (!parsed.success) {
      setError(
        "Periksa nama, format email, dan kata sandi minimal 8 karakter.",
      );
      setBusy(false);
      return;
    }
    try {
      const data = await post(
        `/api/auth/${register ? "register" : "login"}`,
        parsed.data,
      );
      if (data.redirect) window.location.assign(data.redirect);
      else setStatus(data.message || "Berhasil.");
    } catch (e) {
      setError((e as Error).message);
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
      ) : (
        <form className="stack" onSubmit={submit}>
          {register && (
            <label>
              Nama lengkap
              <input
                name="full_name"
                required
                maxLength={100}
                autoComplete="name"
                placeholder="Nama lengkap Anda"
              />
            </label>
          )}
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="nama@sekolah.sch.id"
            />
          </label>
          <label>
            Kata sandi
            <span className="password-field">
              <input
                name="password"
                type={visible ? "text" : "password"}
                required
                minLength={8}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                disabled={!ready}
                aria-label={
                  visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          <button className="btn primary full" disabled={busy || !ready}>
            {busy ? "Memproses…" : register ? "Buat akun siswa" : "Masuk"}
            <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            {register ? "Sudah punya akun?" : "Belum punya akun?"}{" "}
            <Link href={register ? "/login" : "/registrasi"}>
              {register ? "Masuk" : "Daftar sebagai siswa"}
            </Link>
          </p>
          {register && (
            <small className="muted">
              Akun guru hanya disiapkan oleh administrator.
            </small>
          )}
        </form>
      )}
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
    </>
  );
}
