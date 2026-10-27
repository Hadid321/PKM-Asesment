import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "green" | "amber" | "blue";
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <BookOpen size={26} />
      <p>{children}</p>
    </div>
  );
}
export function EstimateNote() {
  return (
    <p className="estimate-note">
      <CircleHelp size={15} /> BKT adalah estimasi model, bukan sertifikasi
      kompetensi. Jawaban benar dan estimasi penguasaan merupakan dua ukuran
      berbeda.
    </p>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span style={{ width: `${value * 100}%` }} />
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
export function MaterialLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      className="text-link"
      href={href}
      target={href.startsWith("https://") ? "_blank" : undefined}
      rel="noopener noreferrer"
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
export const percent = (p: number) => `${Math.round(p * 100)}%`;
export const date = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
