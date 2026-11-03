"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BookOpen,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LibraryBig,
  ListOrdered,
  Menu,
  Settings2,
  Upload,
  Users,
  X,
} from "lucide-react";
import type { Profile } from "@/lib/types";
import { Logout } from "./actions";
import { ThemeToggle } from "./theme-toggle";
import { TextSizeToggle } from "./text-size-toggle";
import { selectedSubject, subjectHref } from "@/lib/subjects";
import { Brand } from "./brand";
import { SCHOOL_NAME } from "@/lib/site";
export { Brand } from "./brand";
function NavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <span className={`navigation-hint ${pending ? "is-pending" : ""}`}>
      <span className="navigation-spinner" aria-hidden="true" />
      <span className="sr-only" role="status">
        {pending ? "Memuat halaman…" : ""}
      </span>
    </span>
  );
}
export function Shell({
  actor,
  mode,
  children,
}: {
  actor: Profile;
  mode: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const subject = selectedSubject(useSearchParams().get("mapel"));
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const student = actor.role === "student";
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        menuRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  function closeMenu() {
    setOpen(false);
    menuRef.current?.focus();
  }
  const items = student
    ? [
        { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
        { href: "/latihan", label: "Latihan", icon: BookOpen },
        { href: "/rekomendasi", label: "Rencana belajar", icon: ListOrdered },
        { href: "/riwayat", label: "Riwayat", icon: ClipboardList },
        { href: "/kelas", label: "Kelas saya", icon: Users },
      ]
    : [
        { href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard },
        { href: "/kelas", label: "Kelas & siswa", icon: Users },
        { href: "/topik", label: "Topik & materi", icon: LibraryBig },
        { href: "/bank-soal", label: "Bank soal", icon: ClipboardList },
        { href: "/paket-soal", label: "Paket kelas XII", icon: BookOpen },
        { href: "/impor", label: "Unggah soal", icon: Upload },
        { href: "/rekap", label: "Hasil asesmen", icon: ListOrdered },
      ];
  const current =
    items.find((i) => pathname.startsWith(i.href))?.label ??
    (pathname.startsWith("/kuis")
      ? "Sesi latihan"
      : pathname.startsWith("/hasil")
        ? "Hasil latihan"
        : "Ruang belajar");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Langsung ke konten
      </a>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Tutup navigasi"
          onClick={closeMenu}
        />
      )}
      <aside id="app-navigation" className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <Brand />
          <button
            ref={closeRef}
            className="icon-button mobile-only"
            aria-label="Tutup menu"
            onClick={closeMenu}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switch">
          <span className="workspace-avatar">{student ? "S" : "G"}</span>
          <div>
            <strong>Ruang {student ? "siswa" : "guru"}</strong>
            <span>{SCHOOL_NAME}</span>
          </div>
        </div>
        <div className="workspace-label">RUANG KERJA</div>
        <nav aria-label="Navigasi utama">
          {items.map((i) => (
            <Link
              href={subjectHref(i.href, subject)}
              key={i.href}
              className={pathname.startsWith(i.href) ? "active" : ""}
              aria-current={pathname.startsWith(i.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <i.icon size={18} strokeWidth={1.7} />
              <span>{i.label}</span>
              <NavigationHint />
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="program-note">
            <span className="program-dot" />
            <span>
              Kegiatan PKM<strong>Pendampingan belajar kelas XII</strong>
            </span>
          </div>
          <Link className="settings-link" href="/panduan">
            <BookOpen size={17} />
            Panduan penggunaan
            <ArrowUpRight size={14} />
          </Link>
          <Link className="settings-link" href="/profil">
            <Settings2 size={17} />
            Pengaturan profil
          </Link>
          <Logout />
          <div className="sidebar-foot">ADAPTIVA / ASESMEN & PEMBELAJARAN</div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuRef}
              className="icon-button mobile-only"
              aria-label="Buka menu"
              aria-controls="app-navigation"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span className="desktop-only">
              {student ? "Belajar" : "Mengajar"}
            </span>
            <ChevronRight className="desktop-only" size={14} />
            <strong>{current}</strong>
          </div>
          <div className="topbar-right">
            <span className="mode-pill">
              <span />
              {mode === "demo" ? "Demo lokal" : "Data sekolah"}
            </span>
            <TextSizeToggle />
            <ThemeToggle />
            <Link
              href="/profil"
              className="profile-mini"
              aria-label={`Profil ${actor.full_name}`}
            >
              <span className="avatar">
                {actor.full_name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0])
                  .join("")}
              </span>
              <span className="desktop-only">
                <strong>{actor.full_name}</strong>
                <small>{student ? "Siswa" : "Guru"}</small>
              </span>
            </Link>
          </div>
        </header>
        {mode === "demo" && (
          <div className="demo-banner">
            <span className="demo-indicator" />
            <span>
              <strong>Lingkungan demo.</strong> Akun, soal, dan hasil di halaman
              ini adalah data simulasi.
            </span>
            <Link href="/panduan">
              Tentang demo <ArrowUpRight size={12} />
            </Link>
          </div>
        )}
        <main id="main" className="main-content">
          <div key={pathname} className="page-enter">
            {children}
          </div>
        </main>
        <footer className="app-footer">
          <span>Adaptiva / {SCHOOL_NAME}</span>
          <span>Pendampingan belajar melalui kegiatan PKM</span>
        </footer>
      </div>
    </div>
  );
}
