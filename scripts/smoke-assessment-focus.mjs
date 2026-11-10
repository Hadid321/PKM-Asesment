import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3012";
assert.ok(
  ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
  "Demo lokal saja.",
);
const cookie = {};
let passed = 0;
async function req(role, path, body, origin = base) {
  const r = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: cookie[role] ?? "",
      ...(body ? { Origin: origin, "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
async function check(name, fn) {
  await fn();
  passed++;
  console.log("PASS " + name);
}
await check(
  "dukungan asesmen memerlukan akun dan origin yang sah",
  async () => {
    assert.equal(
      (await req("none", "/api/assessment/activity", {})).status,
      401,
    );
    for (const role of ["teacher", "student"]) {
      const r = await fetch(base + "/api/auth/demo", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      assert.equal(r.status, 200);
      cookie[role] = r.headers
        .getSetCookie()
        .map((c) => c.split(";")[0])
        .join("; ");
    }
    assert.equal(
      (
        await req(
          "student",
          "/api/assessment/activity",
          {},
          "https://invalid.example",
        )
      ).status,
      403,
    );
  },
);
const all = (await req("teacher", "/api/cbt")).data;
for (const e of all.exams.filter((e) => e.status === "open"))
  await req("teacher", "/api/cbt", { action: "close", exam_id: e.id });
const topics = (await req("teacher", "/api/dashboard")).data.topics;
const items = (await req("teacher", "/api/cbt?preview=matematika")).data.items;
const nonce = crypto.randomUUID().slice(0, 8);
const csv = [
  "topik,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,kesulitan,pembahasan",
  ...items.map((q) =>
    [
      topics.find((t) => t.id === q.topic_id).slug,
      "Simulasi lokal " + nonce + ": " + q.question_text,
      ...Object.values(q.options),
      q.correct_option,
      "sedang",
      q.explanation,
    ]
      .map((v) => '"' + v.replaceAll('"', '""') + '"')
      .join(","),
  ),
].join("\n");

const publish = await req("teacher", "/api/cbt", {
  action: "publish",
  reviewed: true,
  focus_guard: true,
  class_id: all.classes[0].id,
  subject: "matematika",
  title: "Fokus HTTP " + nonce,
  duration_minutes: 45,
  custom_csv: csv,
});
assert.equal(publish.status, 200, JSON.stringify(publish.data));
const exam = (await req("teacher", "/api/cbt")).data.exams.find(
  (e) => e.id === publish.data.exam_id,
);
await check("peserta wajib menyetujui aturan", async () => {
  assert.equal(
    (
      await req("student", "/api/cbt", {
        action: "start",
        exam_id: exam.id,
        code: exam.access_code,
      })
    ).status,
    400,
  );
});
const start = await req("student", "/api/cbt", {
  action: "start",
  exam_id: exam.id,
  code: exam.access_code,
  acknowledge_policy: true,
});
assert.equal(start.status, 200, JSON.stringify(start.data));
const sid = start.data.sitting_id,
  view = () => req("student", "/api/cbt?sitting=" + sid),
  page_id = crypto.randomUUID();
let sequence = 0;
const send = async (kinds, visible = true) =>
  req("student", "/api/assessment/activity", {
    sitting_id: sid,
    events: kinds.map((kind) => ({ id: crypto.randomUUID(), kind })),
    presence: {
      visible,
      focused: visible,
      online: true,
      fullscreen: false,
      page_id,
      sequence: ++sequence,
    },
  });
await send(["opened"]);
const first = (await view()).data,
  q = first.questions[0];
assert.equal(
  (
    await req("student", "/api/cbt", {
      action: "save",
      sitting_id: sid,
      item_id: q.id,
      option: "A",
      flagged: false,
      expected_version: 0,
    })
  ).status,
  200,
);
await check("kejadian pertama dan kedua hanya memberi peringatan", async () => {
  for (let i = 1; i <= 2; i++) {
    await send(["left_assessment"], false);
    await send(["visible"]);
    const v = (await view()).data;
    assert.equal(v.focus.strikes, i);
    assert.equal(v.questions.length, 24);
  }
});
await send(["left_assessment"], false);
await check(
  "pelanggaran ketiga menyembunyikan soal dan memblokir jawaban/submit",
  async () => {
    const v = (await view()).data;
    assert.equal(v.focus.locked, true);
    assert.equal(v.questions.length, 0);
    assert.equal(v.answered, 1);
    assert.equal(v.ranking, null);
    for (const action of ["save", "submit"])
      assert.equal(
        (
          await req("student", "/api/cbt", {
            action,
            sitting_id: sid,
            expected_version: v.version,
            ...(action === "save"
              ? { item_id: q.id, option: "B", flagged: false }
              : {}),
          })
        ).status,
        409,
      );
    const row = (await req("teacher", "/api/cbt")).data.exams
      .find((e) => e.id === exam.id)
      .participants.find((s) => s.id === sid);
    assert.equal(row.monitor.focus.strikes, 3);
    assert.equal(row.monitor.focus.locked, true);
  },
);
await check(
  "izin hanya guru, alasan dicatat, pengulangan permintaan idempotent",
  async () => {
    const body = {
      sitting_id: sid,
      request_id: crypto.randomUUID(),
      reason: "Perangkat diperiksa oleh pengawas",
    };
    assert.equal(
      (await req("student", "/api/assessment/focus", body)).status,
      403,
    );
    for (let i = 0; i < 2; i++)
      assert.equal(
        (await req("teacher", "/api/assessment/focus", body)).status,
        200,
      );
    const v = (await view()).data;
    assert.equal(v.focus.locked, false);
    assert.equal(v.focus.strikes, 0);
    assert.equal(v.focus.total_strikes, 3);
    assert.equal(v.deadline_at, first.deadline_at);
    assert.equal(v.answered, 1);
    assert.equal(
      (
        await req("student", "/api/cbt", {
          action: "submit",
          sitting_id: sid,
          expected_version: v.version,
        })
      ).status,
      200,
    );
    assert.equal((await view()).data.ranking, null);
  },
);
await req("teacher", "/api/cbt", { action: "close", exam_id: exam.id });
await check(
  "peringkat hanya sesudah rilis, tanpa identitas teman dan kunci sebelum rilis",
  async () => {
    assert.equal((await view()).data.result, null);
    assert.equal(
      (
        await req("teacher", "/api/cbt", {
          action: "release",
          exam_id: exam.id,
        })
      ).status,
      200,
    );
    const v = (await view()).data;
    assert.ok(v.result);
    assert.equal(v.ranking[0].label, "Anda");
    assert.ok(!JSON.stringify(v.ranking).includes("student_id"));
    assert.equal(
      (
        await req("teacher", "/api/assessment/focus", {
          sitting_id: sid,
          request_id: crypto.randomUUID(),
          reason: "Ujian sudah berakhir sekarang",
        })
      ).status,
      409,
    );
  },
);
console.log(passed + " pemeriksaan HTTP fokus dan peringkat lulus.");
