import { describe, it, expect } from "vitest";
import {
  applyFocus,
  newFocusControl,
  resumeFocus,
  focusView,
} from "@/lib/assessment-focus";
import { assessmentRanking } from "@/lib/server/cbt/ranking";
import { cbtLab } from "./cbt-fixture";
import type { ActivityInput } from "@/lib/assessment-support";
describe("Fokus berbasis kejadian", () => {
  function protocol() {
    const c = newFocusControl(),
      page = crypto.randomUUID();
    let seq = 0,
      now = 0;
    const send = (
      kinds: ActivityInput["events"][number]["kind"][],
      visible = true,
    ) =>
      applyFocus(
        c,
        {
          sitting_id: crypto.randomUUID(),
          events: kinds.map((kind) => ({ kind, id: crypto.randomUUID() })),
          presence: {
            visible,
            focused: visible,
            online: true,
            fullscreen: false,
            page_id: page,
            sequence: ++seq,
          },
        },
        now,
      );
    send(["opened"]);
    return {
      c,
      send,
      advance: (ms: number) => {
        now += ms;
      },
    };
  }
  it("tiga kejadian terpisah mengunci; hidden + left bukan dua pelanggaran", () => {
    const p = protocol();
    for (let i = 0; i < 3; i++) {
      p.send(["hidden"], false);
      p.send(["left_assessment"], false);
      p.send(["left_assessment"], false);
      p.send(["visible"]);
    }
    expect(focusView(true, p.c)).toMatchObject({
      strikes: 3,
      total_strikes: 3,
      locked: true,
    });
    p.send(["left_assessment"], false);
    expect(p.c.strikes).toBe(3);
    resumeFocus(p.c);
    expect(p.c).toMatchObject({
      strikes: 0,
      total_strikes: 3,
      locked: false,
      version: 4,
    });
  });
  it("grace perlu konfirmasi, batch terlambat tidak menghukum kembali, blur/offline bukan pelanggaran", () => {
    const p = protocol();
    p.send(["hidden"], false);
    p.advance(1999);
    p.send([], false);
    expect(p.c.strikes).toBe(0);
    p.advance(1);
    p.send([], false);
    expect(p.c.strikes).toBe(1);
    p.send(["visible"]);
    p.advance(5000);
    p.send(["hidden", "visible"]);
    p.send(["blur", "offline", "fullscreen_exit"]);
    expect(p.c.strikes).toBe(1);
  });
  it("urutan lama dan tab lama tidak mengubah kejadian baru", () => {
    const p = protocol(),
      before = structuredClone(p.c),
      page = p.c.current_page!;
    expect(
      applyFocus(
        p.c,
        {
          sitting_id: crypto.randomUUID(),
          events: [{ id: crypto.randomUUID(), kind: "left_assessment" }],
          presence: {
            visible: false,
            focused: false,
            online: true,
            fullscreen: false,
            page_id: page,
            sequence: 1,
          },
        },
        1000,
      ),
    ).toBe(false);
    expect(p.c).toEqual(before);
  });
});
describe("Peringkat asesmen", () => {
  it("seri memakai 1,2,2,4; identitas siswa lain dirahasiakan dan hasil menunggu rilis", async () => {
    const l = cbtLab(),
      t = l.service(l.teacher);
    await t.execute({
      action: "publish",
      reviewed: true,
      class_id: l.context.classes[0].id,
      subject: "matematika",
      title: "Peringkat kelas",
      duration_minutes: 45,
    });
    const e = l.state().exams[0];
    await l
      .service(l.student)
      .execute({ action: "start", exam_id: e.id, code: e.access_code });
    const source = l.state().sittings[0];
    const rows = [4, 2, 2, 0].map((n, i) => {
      const s = structuredClone(source);
      s.id = crypto.randomUUID();
      s.student_id = i === 0 ? l.student.id : crypto.randomUUID();
      s.status = "submitted";
      for (const id of s.order.slice(0, n)) {
        const q = e.items.find((q) => q.id === id)!;
        s.answers[id] = {
          option: (["A", "B", "C", "D"] as const)[
            s.option_orders[id].indexOf(q.correct_option)
          ],
          flagged: false,
        };
      }
      return s;
    });
    expect(assessmentRanking(e, rows, l.student, l.context)).toBeNull();
    e.released = true;
    const ranked = assessmentRanking(e, rows, l.student, l.context)!;
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 2, 4]);
    expect(ranked[0].label).toBe("Anda");
    for (const s of rows.slice(1))
      expect(JSON.stringify(ranked)).not.toContain(s.student_id);
    expect(
      assessmentRanking(
        e,
        rows,
        { ...l.student, id: crypto.randomUUID() },
        l.context,
      ),
    ).toBeNull();
  });
});

it("tab lama kembali menjadi halaman terpantau saat terlihat lagi", () => {
  const c = newFocusControl(),
    sitting_id = crypto.randomUUID(),
    a = crypto.randomUUID(),
    b = crypto.randomUUID();
  const send = (
    page_id: string,
    sequence: number,
    kind: "opened" | "visible" | "left_assessment",
  ) =>
    applyFocus(
      c,
      {
        sitting_id,
        events: [{ id: crypto.randomUUID(), kind }],
        presence: {
          visible: kind !== "left_assessment",
          focused: true,
          online: true,
          fullscreen: false,
          page_id,
          sequence,
        },
      },
      1000,
    );
  send(a, 1, "opened");
  send(b, 1, "opened");
  send(a, 2, "visible");
  send(a, 3, "left_assessment");
  expect(c.current_page).toBe(a);
  expect(c.strikes).toBe(1);
});

it("salinan background tidak mengambil halaman yang sedang dipantau", () => {
  const c = newFocusControl(),
    sitting_id = crypto.randomUUID(),
    a = crypto.randomUUID(),
    b = crypto.randomUUID();
  const send = (
    page_id: string,
    sequence: number,
    kind: "opened" | "hidden",
    visible: boolean,
  ) =>
    applyFocus(
      c,
      {
        sitting_id,
        events: [{ id: crypto.randomUUID(), kind }],
        presence: {
          visible,
          focused: visible,
          online: true,
          fullscreen: false,
          page_id,
          sequence,
        },
      },
      1000,
    );
  send(a, 1, "opened", true);
  send(b, 1, "opened", false);
  send(a, 2, "hidden", false);
  expect(c.current_page).toBe(a);
  expect(c.away).toBe(true);
});

it("kembali setelah grace tetap dihitung bila browser menunda heartbeat", () => {
  const c = newFocusControl(),
    page = crypto.randomUUID(),
    sitting_id = crypto.randomUUID();
  let sequence = 0;
  const send = (kind: "opened" | "hidden" | "visible", now: number) =>
    applyFocus(
      c,
      {
        sitting_id,
        events: [{ id: crypto.randomUUID(), kind }],
        presence: {
          visible: kind !== "hidden",
          focused: true,
          online: true,
          fullscreen: false,
          page_id: page,
          sequence: ++sequence,
        },
      },
      now,
    );
  send("opened", 0);
  send("hidden", 1);
  send("visible", 10001);
  expect(c.strikes).toBe(1);
  send("hidden", 11000);
  send("visible", 11500);
  expect(c.strikes).toBe(1);
});
