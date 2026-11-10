import { describe, it, expect, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CbtHome } from "@/components/cbt-home";
import { CbtPlayer } from "@/components/cbt-player";
import { cbtLab } from "./cbt-fixture";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
describe("Kontrol asesmen menurut peran dan akses AI", () => {
  it("siswa tidak mendapatkan kontrol pemantauan guru", () => {
    const html = renderToStaticMarkup(
      createElement(CbtHome, {
        initial: { role: "student", classes: [], exams: [] },
      }),
    );
    expect(html).not.toContain("Perbarui status pengerjaan");
    expect(html).not.toContain("Buka ujian baru");
    expect(html).toContain("Daftar asesmen diperbarui otomatis");
  });
  it("guru tetap mendapatkan kontrol pemantauan", () => {
    const html = renderToStaticMarkup(
      createElement(CbtHome, {
        initial: { role: "teacher", classes: [], exams: [] },
      }),
    );
    expect(html).toContain("Perbarui status pengerjaan");
  });
  it("asisten muncul sesudah rilis dan tidak muncul saat siswa mengerjakan", async () => {
    const l = cbtLab(),
      t = l.service(l.teacher),
      u = l.service(l.student);
    await t.execute({
      action: "publish",
      reviewed: true,
      class_id: l.context.classes[0].id,
      subject: "matematika",
      title: "UI Asesmen",
      duration_minutes: 45,
    });
    const e = l.state().exams[0],
      start = await u.execute({
        action: "start",
        exam_id: e.id,
        code: e.access_code,
      });
    const render = async () =>
      renderToStaticMarkup(
        createElement(CbtPlayer, { initial: await u.view(start.sitting_id!) }),
      );
    expect(await render()).not.toContain("Asisten belajar Adaptiva");
    await t.execute({ action: "close", exam_id: e.id });
    expect(await render()).not.toContain("Asisten belajar Adaptiva");
    await t.execute({ action: "release", exam_id: e.id });
    expect(await render()).toContain("Buat rencana belajarku");
  });
});
