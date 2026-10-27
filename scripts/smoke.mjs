import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
// Hanya jalankan terhadap mode demo lokal. Data baru ditambahkan dan ditandai demo.
let cookie = "";
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
async function request(path, body, authenticated = true) {
  const response = await fetch(base + path, {
    redirect: "manual",
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: base } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { response, data };
}
await check("route tanpa login ditolak", async () =>
  assert.equal((await request("/api/dashboard")).response.status, 401),
);
await check("login demo siswa", async () => {
  const { response } = await request("/api/auth/demo", { role: "student" });
  assert.equal(response.status, 200);
  cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  assert.ok(cookie.includes("adaptiva_demo"));
});
await check("siswa ditolak mengakses bank guru", async () =>
  assert.equal((await request("/api/bank")).response.status, 403),
);
await check(
  "siswa ditolak mengunggah soal pada pratinjau dan commit",
  async () => {
    const csv =
      "topik,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,kesulitan,pembahasan\nlimit-fungsi,Soal ilegal,1,2,3,4,A,mudah,Pembahasan";
    for (const preview of [true, false])
      assert.equal(
        (await request("/api/actions", { action: "import", csv, preview }))
          .response.status,
        403,
      );
  },
);
await check("role injection ditolak", async () =>
  assert.equal(
    (
      await request("/api/actions", {
        action: "profile",
        full_name: "Uji",
        role: "teacher",
      })
    ).response.status,
    400,
  ),
);
await check("CSRF ditolak", async () => {
  const r = await fetch(base + "/api/actions", {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      Origin: "https://invalid.example",
    },
    body: JSON.stringify({ action: "start" }),
  });
  assert.equal(r.status, 403);
});
const dashboard = (await request("/api/dashboard")).data;
await check("paket soal dan unduhan kunci ditolak untuk siswa", async () => {
  assert.equal(
    (await request("/api/paket-soal?mapel=bahasa-inggris")).response.status,
    403,
  );
  assert.equal(
    (
      await request("/api/actions", {
        action: "import-curriculum",
        subject: "bahasa-inggris",
        reviewed: true,
      })
    ).response.status,
    403,
  );
  const page = await fetch(base + "/paket-soal", {
    headers: { Cookie: cookie },
    redirect: "manual",
  });
  const html = await page.text();
  assert.ok(
    [303, 307].includes(page.status) ||
      (page.status === 200 && html.includes("/akses")),
  );
  assert.ok(!html.includes("Kunci tinjauan guru"));
  assert.ok(!html.includes("ING-01"));
});
assert.equal(dashboard.actor.role, "student");
await check("isolasi asesmen siswa", async () =>
  assert.ok(
    dashboard.attempts.every((a) => a.student_id === dashboard.actor.id),
  ),
);
const start = await request("/api/actions", {
  action: "start",
  topic_id: dashboard.topics[1].id,
});
assert.equal(start.response.status, 200);
const sid = start.data.session_id;
let first = true;
for (let i = 0; i < 10; i++) {
  const { data: view, response } = await request(`/api/session/${sid}`);
  assert.equal(response.status, 200);
  if (view.session.status === "completed") break;
  await check(`soal ${i + 1} tanpa kunci dan pembahasan`, async () => {
    assert.equal(view.question.correct_option, undefined);
    assert.equal(view.question.explanation, undefined);
  });
  const body = {
    action: "answer",
    session_id: sid,
    question_id: view.question.id,
    selected_option: "A",
  };
  const result = await request("/api/actions", body);
  assert.equal(result.response.status, 200);
  assert.equal(typeof result.data.feedback.is_correct, "boolean");
  if (first) {
    const twice = await request("/api/actions", body);
    assert.equal(twice.data.duplicate, true);
    first = false;
  }
}
await check("sesi berakhir, riwayat dan ringkasan tersedia", async () => {
  const { data } = await request(`/api/session/${sid}`);
  assert.equal(data.session.status, "completed");
  assert.ok(data.attempts.length > 0 && data.attempts.length <= 10);
  assert.equal(
    new Set(data.attempts.map((a) => a.question_id)).size,
    data.attempts.length,
  );
  assert.ok(data.session.summary);
});
await check("halaman hasil dirender", async () => {
  const r = await fetch(`${base}/hasil/${sid}`, {
    headers: { Cookie: cookie },
  });
  assert.equal(r.status, 200);
  assert.ok((await r.text()).includes("Estimasi BKT akhir sesi"));
});
await request("/api/auth/logout", {});
cookie = "";
await check("logout mengakhiri akses cookie kosong", async () =>
  assert.equal((await request("/api/dashboard")).response.status, 401),
);
await check("login demo guru", async () => {
  const { response } = await request("/api/auth/demo", { role: "teacher" });
  assert.equal(response.status, 200);
  cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
});
await check("guru mendapat kelas dan bank soal", async () => {
  const d = (await request("/api/dashboard")).data;
  assert.equal(d.actor.role, "teacher");
  assert.ok(d.classes.length);
  assert.ok((await request("/api/bank")).data.length);
});
await check("CSV rusak tidak diimpor", async () => {
  const report = await request("/api/actions", {
    action: "import",
    csv: "kolom,salah\na,b",
    preview: true,
  });
  assert.ok(report.data.report.errors.length);
  const commit = await request("/api/actions", {
    action: "import",
    csv: "kolom,salah\na,b",
    preview: false,
  });
  assert.equal(commit.response.status, 400);
});
await check(
  "guru dapat meninjau paket dan mengunduh CSV yang dilindungi",
  async () => {
    const page = await fetch(base + "/paket-soal?mapel=bahasa-inggris", {
      headers: { Cookie: cookie },
    });
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes("ING-01"));
    const csv = await fetch(base + "/api/paket-soal?mapel=bahasa-inggris", {
      headers: { Cookie: cookie },
    });
    assert.equal(csv.status, 200);
    assert.equal(csv.headers.get("cache-control"), "private, no-store");
    assert.ok((await csv.text()).includes("ing-informational-reading"));
  },
);
await check("impor paket guru idempotent untuk ketiga mapel", async () => {
  for (const subject of ["matematika", "bahasa-inggris", "bahasa-indonesia"]) {
    const imported = await request("/api/actions", {
      action: "import-curriculum",
      subject,
      reviewed: true,
    });
    assert.equal(imported.response.status, 200);
    const before = (await request("/api/bank")).data.length;
    await request("/api/actions", {
      action: "import-curriculum",
      subject,
      reviewed: true,
    });
    assert.equal((await request("/api/bank")).data.length, before);
  }
});
await check("ekspor CSV berhasil", async () => {
  const response = await fetch(base + "/api/report", {
    headers: { Cookie: cookie },
  });
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes("p_before"));
});
await request("/api/auth/logout", {});
// Pemeriksaan siswa setelah paket tersedia pada bank guru.
{
  const { response } = await request("/api/auth/demo", { role: "student" });
  cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  for (const [subject, slug] of [
    ["matematika", "mtk-transformasi-fungsi"],
    ["bahasa-inggris", "ing-informational-reading"],
    ["bahasa-indonesia", "indo-informasi-teks"],
  ]) {
    await check(`sesi ${subject} selesai dan BKT terisolasi`, async () => {
      const before = (await request("/api/dashboard")).data;
      const topic = before.topics.find((t) => t.slug === slug);
      assert.ok(topic);
      const start = await request("/api/actions", {
        action: "start",
        topic_id: topic.id,
      });
      assert.equal(start.response.status, 200);
      const sessionId = start.data.session_id;
      for (let i = 0; i < 10; i++) {
        const view = (await request(`/api/session/${sessionId}`)).data;
        if (view.session.status === "completed") break;
        assert.equal(view.topic.subject, subject);
        assert.equal(view.question.correct_option, undefined);
        const answer = await request("/api/actions", {
          action: "answer",
          session_id: sessionId,
          question_id: view.question.id,
          selected_option: "A",
        });
        assert.equal(answer.response.status, 200);
      }
      const final = (await request(`/api/session/${sessionId}`)).data;
      assert.equal(final.session.status, "completed");
      assert.ok(final.attempts.length > 0 && final.attempts.length <= 6);
      const after = (await request("/api/dashboard")).data;
      assert.deepEqual(
        after.mastery.filter((m) => m.topic_id !== topic.id),
        before.mastery.filter((m) => m.topic_id !== topic.id),
      );
      const html = await fetch(base + `/latihan?mapel=${subject}`, {
        headers: { Cookie: cookie },
      });
      assert.equal(html.status, 200);
      assert.ok((await html.text()).includes(topic.name));
    });
  }
  await request("/api/auth/logout", {});
}
console.log(
  `${passed} pemeriksaan HTTP demo lulus. Hasil latihan demo baru telah disimpan.`,
);
