"use client";
import { SUBJECTS, SUBJECT_NAMES, type Subject } from "@/lib/subjects";
export function SubjectNav({
  subject,
  base,
  instant = false,
}: {
  subject: Subject;
  base: string;
  instant?: boolean;
}) {
  return (
    <nav className="subject-nav" aria-label="Mata pelajaran wajib">
      {SUBJECTS.map((id) => (
        <a
          key={id}
          href={`${base}?mapel=${id}`}
          aria-current={subject === id ? "page" : undefined}
          onClick={(event) => {
            if (
              !instant ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            if (id !== subject)
              window.history.pushState(null, "", `${base}?mapel=${id}`);
          }}
        >
          {SUBJECT_NAMES[id]}
        </a>
      ))}
    </nav>
  );
}
