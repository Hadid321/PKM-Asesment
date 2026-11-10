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
  class_id: all.classes[0].id,
  subject: "matematika",
  title: "Asesmen dukungan " + nonce,
  duration_minutes: 45,
  custom_csv: csv,
});
assert.equal(publish.status, 200, JSON.stringify(publish.data));
const exam = (await req("teacher", "/api/cbt")).data.exams.find(
  (e) => e.id === publish.data.exam_id,
);
const start = await req("student", "/api/cbt", {
  action: "start",
  exam_id: exam.id,
  code: exam.access_code,
});
assert.equal(start.status, 200, JSON.stringify(start.data));
const sid = start.data.sitting_id,
  view = (await req("student", "/api/cbt?sitting=" + sid)).data;
const activity = {
  sitting_id: sid,
  events: [
    { id: crypto.randomUUID(), kind: "hidden" },
    { id: crypto.randomUUID(), kind: "blur" },
  ],
  presence: { visible: false, focused: false, online: true, fullscreen: false },
};
await check("event idempotent dan jawaban tidak berganti versi", async () => {
  for (let i = 0; i < 2; i++)
    assert.equal(
      (await req("student", "/api/assessment/activity", activity)).data
        .accepted,
      true,
    );
  assert.equal(
    (await req("student", "/api/cbt?sitting=" + sid)).data.version,
    view.version,
  );
  assert.equal(
    (
      await req("student", "/api/assessment/activity", {
        ...activity,
        events: [{ ...activity.events[0], kind: "visible" }],
      })
    ).status,
    409,
  );
});
await check(
  "guru melihat sinyal terpisah dan siswa tidak melihat monitor",
  async () => {
    const rows = (await req("teacher", "/api/cbt")).data.exams.find(
      (e) => e.id === exam.id,
    ).participants;
    assert.equal(rows[0].monitor.hidden_count, 1);
    assert.equal(rows[0].monitor.blur_count, 1);
    assert.ok(
      !(await req("student", "/api/cbt")).data.exams.some(
        (e) => e.participants,
      ),
    );
  },
);
await check(
  "payload aktivitas dibatasi dan guru tidak dapat berpura-pura menjadi siswa",
  async () => {
    assert.equal(
      (await req("teacher", "/api/assessment/activity", activity)).status,
      403,
    );
    assert.equal(
      (
        await req("student", "/api/assessment/activity", {
          ...activity,
          url: "https://private.example",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await req("student", "/api/assessment/activity", {
          ...activity,
          events: Array(21).fill(activity.events[0]),
        })
      ).status,
      400,
    );
  },
);
await check("AI tertahan sebelum penutupan dan rilis", async () => {
  assert.equal(
    (await req("student", "/api/assessment/brief", { target_id: sid })).status,
    409,
  );
  assert.equal(
    (await req("teacher", "/api/assessment/brief", { target_id: exam.id }))
      .status,
    409,
  );
});
await req("teacher", "/api/cbt", { action: "close", exam_id: exam.id });
await check(
  "catatan berhenti setelah selesai dan guru mendapatkan tindak lanjut cache",
  async () => {
    assert.equal(
      (await req("student", "/api/assessment/activity", activity)).data
        .accepted,
      false,
    );
    const first = await req("teacher", "/api/assessment/brief", {
      target_id: exam.id,
    });
    assert.equal(first.status, 200, JSON.stringify(first.data));
    assert.equal(first.data.brief.actions.length, 3);
    const retry = await req("teacher", "/api/assessment/brief", {
      target_id: exam.id,
    });
    assert.deepEqual(retry.data.brief, first.data.brief);
    assert.equal(
      (await req("student", "/api/assessment/brief", { target_id: sid }))
        .status,
      409,
    );
  },
);
await req("teacher", "/api/cbt", { action: "release", exam_id: exam.id });
await check(
  "siswa mendapat tindak lanjut setelah rilis dan tidak membaca target guru",
  async () => {
    const r = await req("student", "/api/assessment/brief", { target_id: sid });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.brief.actions.length, 3);
    assert.equal(
      (await req("student", "/api/assessment/brief", { target_id: exam.id }))
        .status,
      404,
    );
  },
);
console.log(passed + " pemeriksaan dukungan asesmen lulus.");
