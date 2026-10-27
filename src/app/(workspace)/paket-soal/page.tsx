import { requirePageRole } from "@/lib/server/page-data";
import { curriculumPackage } from "@/lib/server/curriculum-content";
import { CurriculumView } from "@/components/curriculum-view";

export default async function Page() {
  await requirePageRole("teacher");
  return (
    <CurriculumView
      packs={{
        matematika: curriculumPackage("matematika"),
        "bahasa-inggris": curriculumPackage("bahasa-inggris"),
        "bahasa-indonesia": curriculumPackage("bahasa-indonesia"),
      }}
    />
  );
}
