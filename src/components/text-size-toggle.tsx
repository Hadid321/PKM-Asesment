"use client";
import { useSyncExternalStore } from "react";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("adaptiva-text-size", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("adaptiva-text-size", callback);
  };
}
function enlarged() {
  try {
    return localStorage.getItem("adaptiva-text-size") === "large";
  } catch {
    return document.documentElement.dataset.textSize === "large";
  }
}
export function TextSizeToggle() {
  const large = useSyncExternalStore(subscribe, enlarged, () => false);
  return (
    <button
      type="button"
      className="text-size-toggle"
      aria-label="Teks lebih besar"
      aria-pressed={large}
      title={large ? "Kembalikan ukuran teks standar" : "Perbesar ukuran teks"}
      onClick={() => {
        const next = large ? "standard" : "large";
        document.documentElement.dataset.textSize = next;
        try {
          localStorage.setItem("adaptiva-text-size", next);
        } catch {
          // Tetap berlaku pada halaman ini jika penyimpanan diblokir.
        }
        window.dispatchEvent(new Event("adaptiva-text-size"));
      }}
    >
      <span aria-hidden="true">Aa</span>
    </button>
  );
}
