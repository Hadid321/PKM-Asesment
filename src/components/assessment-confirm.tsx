"use client";
import { useEffect, useId, useRef } from "react";
export function AssessmentConfirm({
  open,
  title,
  description,
  confirmLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    cancel = useRef<HTMLButtonElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.documentElement.style.overflow;
    dialog.showModal();
    cancel.current?.focus();
    document.documentElement.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.documentElement.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="assessment-confirm"
      aria-labelledby={id + "-title"}
      aria-describedby={id + "-description"}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <p className="eyebrow">KONFIRMASI ASESMEN</p>
      <h2 id={id + "-title"}>{title}</h2>
      <p id={id + "-description"}>{description}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="assessment-confirm-actions">
        <button
          type="button"
          ref={cancel}
          className="btn secondary"
          disabled={busy}
          onClick={onCancel}
        >
          Batal
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Memproses…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
