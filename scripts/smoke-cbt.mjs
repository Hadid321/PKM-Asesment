import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3012";
const url = new URL(base);
assert.ok(
  ["127.0.0.1", "localhost"].includes(url.hostname),
  "CBT smoke hanya untuk demo lokal.",
);
const cookies = {};
let passed = 0;
async function req(role, body, query = "", origin = base) {
  const r = await fetch(base + "/api/cbt" + query, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: cookies[role] || "",
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
}
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
const hidden = (data) => {
  assert.doesNotMatch(
    JSON.stringify(data),
    /"(?:correct_option|explanation|priors|option_orders|fingerprints|access_code|is_correct|p_l)"\s*:/,
  );
};
await check("CBT tanpa sesi ditolak", async () =>
  assert.equal((await req("none")).status, 401),
);
for (const role of ["teacher", "student"]) {
  const r = await fetch(base + "/api/auth/demo", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ role }),
  });
  assert.equal(r.status, 200);
  cookies[role] = r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
await check("pratinjau dan publish hanya guru; CSRF ditolak", async () => {
  assert.equal((await req("student", null, "?preview=matematika")).status, 403);
  assert.equal(
    (await req("student", { action: "preview", subject: "matematika" })).status,
    403,
  );
  assert.equal(
    (
      await req(
        "teacher",
        { action: "preview", subject: "matematika" },
        "",
        "https://invalid.example",
      )
    ).status,
    403,
  );
});
const teacher = (await req("teacher")).data;
const classId = teacher.classes[0].id;
let exam, view;
await check("GET dan POST preview memiliki kontrak yang sama", async () => {
  const get = await req("teacher", null, "?preview=matematika");
  const post = await req("teacher", {
    action: "preview",
    subject: "matematika",
  });
  assert.equal(get.data.items.length, 24);
  assert.equal(post.data.items.length, 24);
  assert.ok(post.data.items[0].correct_option);
});
await check("guru menerbitkan paket yang ditinjau", async () => {
  const existing = teacher.exams.find(
    (e) => e.title === "QA HTTP CBT" && e.status === "open",
  );
  const r = existing
    ? { status: 200, data: { exam_id: existing.id } }
    : await req("teacher", {
        action: "publish",
        reviewed: true,
        class_id: classId,
        subject: "matematika",
        title: "QA HTTP CBT",
        duration_minutes: 45,
      });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  exam = (await req("teacher")).data.exams.find((e) => e.id === r.data.exam_id);
});
await check("kode dan payload siswa aman; satu pengerjaan", async () => {
  hidden((await req("student")).data);
  assert.equal(
    (
      await req("student", {
        action: "start",
        exam_id: exam.id,
        code: "SALAH123",
      })
    ).status,
    403,
  );
  const r = await req("student", {
    action: "start",
    exam_id: exam.id,
    code: exam.access_code,
  });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const retry = await req("student", {
    action: "start",
    exam_id: exam.id,
    code: exam.access_code,
  });
  assert.equal(retry.data.sitting_id, r.data.sitting_id);
  view = (await req("student", null, "?sitting=" + r.data.sitting_id)).data;
  hidden(view);
  assert.equal(view.result, null);
});
await check(
  "autosave dan refresh mempertahankan jawaban, urutan, waktu",
  async () => {
    const before = structuredClone(view);
    const r = await req("student", {
      action: "save",
      sitting_id: view.id,
      item_id: view.questions[0].id,
      option: "B",
      flagged: true,
      expected_version: view.version,
    });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    hidden(r.data);
    view = (await req("student", null, "?sitting=" + view.id)).data;
    assert.equal(view.questions[0].selected, "B");
    assert.equal(view.questions[0].flagged, true);
    assert.equal(view.deadline_at, before.deadline_at);
    assert.deepEqual(
      view.questions.map((q) => q.id),
      before.questions.map((q) => q.id),
    );
    assert.equal(
      (
        await req("student", {
          action: "save",
          sitting_id: view.id,
          item_id: view.questions[0].id,
          option: "A",
          flagged: false,
          expected_version: before.version,
        })
      ).status,
      409,
    );
  },
);
await check(
  "submit tidak membuka kunci; guru harus menutup sebelum rilis",
  async () => {
    const r = await req("student", {
      action: "submit",
      sitting_id: view.id,
      expected_version: view.version,
    });
    assert.equal(r.status, 200);
    hidden(r.data);
    assert.equal(r.data.view.result, null);
    assert.equal(
      (await req("teacher", { action: "release", exam_id: exam.id })).status,
      409,
    );
    assert.equal(
      (await req("teacher", { action: "close", exam_id: exam.id })).status,
      200,
    );
    hidden((await req("student", null, "?sitting=" + view.id)).data);
    assert.equal(
      (await req("teacher", { action: "release", exam_id: exam.id })).status,
      200,
    );
  },
);
await check(
  "hasil baru terbuka setelah rilis; paket terbuka tidak dipakai lagi",
  async () => {
    const result = (await req("student", null, "?sitting=" + view.id)).data
      .result;
    assert.equal(result.review.length, 24);
    assert.ok(result.review[0].correct_option);
    assert.equal(
      (
        await req("teacher", {
          action: "publish",
          reviewed: true,
          class_id: classId,
          subject: "matematika",
          title: "Ulang paket terpapar",
          duration_minutes: 45,
        })
      ).status,
      409,
    );
  },
);
console.log(passed + " pemeriksaan HTTP CBT lulus.");
