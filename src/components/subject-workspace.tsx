"use client";
import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import type { DashboardData } from "@/lib/server/assessment";
import { selectedSubject, SUBJECT_NAMES } from "@/lib/subjects";
import { dashboardForSubject } from "@/lib/dashboard-view";
import { SubjectNav } from "./subject-nav";
import { StudentDashboard, TeacherDashboard } from "./dashboard";
import { PracticeView } from "./latihan-view";
import { RecommendationsView } from "./rekomendasi-view";
import { ReportsView } from "./rekap-view";

const paths = {
  dashboard: "/dashboard",
  practice: "/latihan",
  recommendations: "/rekomendasi",
  reports: "/rekap",
};
export function SubjectWorkspace({
  initial,
  view,
}: {
  initial: DashboardData;
  view: keyof typeof paths;
}) {
  const params = useSearchParams();
  const subject = selectedSubject(params.get("mapel"));
  const data = useMemo(
    () => dashboardForSubject(initial, subject),
    [initial, subject],
  );
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  return (
    <>
      <div className="subject-toolbar">
        <SubjectNav subject={subject} base={paths[view]} instant />
        <button
          type="button"
          className="text-link refresh-data"
          disabled={refreshing}
          onClick={() => startRefresh(() => router.refresh())}
        >
          <RefreshCw size={16} className={refreshing ? "spin" : undefined} />
          {refreshing ? "Memperbarui…" : "Perbarui data"}
        </button>
      </div>
      <p className="sr-only" role="status">
        {SUBJECT_NAMES[subject]} ditampilkan.
      </p>
      <div key={subject} className="subject-content" aria-busy={refreshing}>
        {view === "dashboard" ? (
          data.actor.role === "student" ? (
            <StudentDashboard data={data} />
          ) : (
            <TeacherDashboard data={data} />
          )
        ) : view === "practice" ? (
          <PracticeView data={data} />
        ) : view === "recommendations" ? (
          <RecommendationsView data={data} />
        ) : (
          <ReportsView data={data} />
        )}
      </div>
    </>
  );
}
