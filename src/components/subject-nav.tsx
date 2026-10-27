import Link from "next/link";
import { SUBJECTS, SUBJECT_NAMES, type Subject } from "@/lib/subjects";
export function SubjectNav({
  subject,
  base,
}: {
  subject: Subject;
  base: string;
}) {
  return (
    <nav className="subject-nav" aria-label="Mata pelajaran wajib">
      {SUBJECTS.map((id) => (
        <Link
          key={id}
          href={`${base}?mapel=${id}`}
          aria-current={subject === id ? "page" : undefined}
        >
          {SUBJECT_NAMES[id]}
        </Link>
      ))}
    </nav>
  );
}
