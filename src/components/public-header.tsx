import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import styles from "./public.module.css";

export function PublicHeader({ auth = false }: { auth?: boolean }) {
  return (
    <header className={styles.header}>
      <Brand href="/" />
      {auth ? (
        <nav
          aria-label="Navigasi halaman akun"
          className={styles.headerActions}
        >
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={16} /> Beranda
          </Link>
          <ThemeToggle />
        </nav>
      ) : (
        <>
          <nav aria-label="Navigasi utama" className={styles.headerNav}>
            <a href="#mata-pelajaran">Mata pelajaran</a>
            <a href="#cara-belajar">Cara belajar</a>
            <a href="#untuk-guru">Untuk guru</a>
          </nav>
          <div className={styles.headerActions}>
            <ThemeToggle />
            <Link href="/login" className={styles.headerLogin}>
              Masuk <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </>
      )}
    </header>
  );
}
