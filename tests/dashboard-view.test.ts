import { describe, expect, it, vi } from "vitest";
import { dashboardForSubject } from "@/lib/dashboard-view";
import { SUBJECTS, subjectHref } from "@/lib/subjects";
import { dashboard, execute } from "@/lib/server/assessment";
import { DEMO_STUDENT, DEMO_TEACHER, demoState } from "@/lib/demo/seed";
import { memoryRepository } from "./helpers";

describe("Pergantian mapel dari DTO pengguna", () => {
  it.each([DEMO_STUDENT, DEMO_TEACHER])(
    "hasil lokal sama dengan perhitungan server untuk seluruh mapel: %s",
    async (actorId) => {
      const { repo, state } = memoryRepository();
      const teacher = state().profiles.find((p) => p.id === DEMO_TEACHER)!;
      for (const subject of SUBJECTS)
        await execute(repo, teacher, {
          action: "import-curriculum",
          subject,
          reviewed: true,
        });
      const actor = state().profiles.find((p) => p.id === actorId)!;
      const all = await dashboard(repo, actor);
      const original = structuredClone(all);
      for (const subject of SUBJECTS) {
        const result = dashboardForSubject(all, subject);
        expect(result).toEqual(await dashboard(repo, actor, subject));
        // Topik peluang lama tetap wajib; tiga topik kalkulus adalah pengayaan.
        expect(result.topics).toHaveLength(subject === "matematika" ? 5 : 4);
        expect(result.questionCounts.reduce((n, row) => n + row.count, 0)).toBe(
          subject === "matematika" ? 36 : 24,
        );
      }
      expect(all).toEqual(original);
      expect(all).not.toHaveProperty("questions");
    },
  );
  it("30 pergantian pilihan tidak membaca repository lagi", async () => {
    const { repo } = memoryRepository();
    const actor = demoState().profiles.find((p) => p.id === DEMO_STUDENT)!;
    const read = vi.spyOn(repo, "read");
    const initial = await dashboard(repo, actor);
    for (let i = 0; i < 30; i++)
      dashboardForSubject(initial, SUBJECTS[i % SUBJECTS.length]);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("menjaga sesi aktif lintas mapel serta tidak menambah data siswa lain", async () => {
    const { repo, state } = memoryRepository();
    const actor = state().profiles.find((p) => p.id === DEMO_STUDENT)!;
    await execute(repo, actor, {
      action: "start",
      topic_id: state().topics[1].id,
    });
    const initial = await dashboard(repo, actor);
    const english = dashboardForSubject(initial, "bahasa-inggris");
    expect(english.activeSession?.id).toBe(initial.activeSession?.id);
    expect(english.students).toEqual([actor]);
    expect(english.attempts.every((a) => a.student_id === actor.id)).toBe(true);
    expect(english.sessions).toHaveLength(0);
  });
  it("tautan antarhalaman mempertahankan mapel pada halaman yang mendukungnya", () => {
    expect(subjectHref("/latihan", "bahasa-inggris")).toBe(
      "/latihan?mapel=bahasa-inggris",
    );
    expect(subjectHref("/rekap", "bahasa-indonesia")).toBe(
      "/rekap?mapel=bahasa-indonesia",
    );
    expect(subjectHref("/kelas", "bahasa-inggris")).toBe("/kelas");
  });
});
