"use client";
import { Moon, Sun } from "lucide-react";
export function ThemeToggle() {
  function toggle() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("adaptiva-theme", next);
    } catch {
      /* Preferensi tetap berlaku pada halaman ini. */
    }
  }
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema terang atau gelap"
    >
      <Sun className="theme-sun" size={17} />
      <Moon className="theme-moon" size={17} />
      <span>Tema</span>
    </button>
  );
}
