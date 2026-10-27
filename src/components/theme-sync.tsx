"use client";
import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function sync() {
      let saved: string | null = null;
      let textSize: string | null = null;
      try {
        saved = localStorage.getItem("adaptiva-theme");
        textSize = localStorage.getItem("adaptiva-text-size");
      } catch {
        // Tema sistem tetap dapat digunakan jika penyimpanan diblokir.
      }
      document.documentElement.dataset.theme =
        saved === "light" || saved === "dark"
          ? saved
          : media.matches
            ? "dark"
            : "light";
      document.documentElement.dataset.textSize =
        textSize === "large" ? "large" : "standard";
    }
    function storage(event: StorageEvent) {
      if (
        event.key === "adaptiva-theme" ||
        event.key === "adaptiva-text-size" ||
        event.key === null
      )
        sync();
    }
    sync();
    window.addEventListener("storage", storage);
    media.addEventListener("change", sync);
    return () => {
      window.removeEventListener("storage", storage);
      media.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
