import { describe, expect, it } from "vitest";
import { grade } from "@/lib/server/cbt/engine";
import { examItems } from "@/lib/server/cbt/content";
import { prepareExamItems, questionFingerprint } from "@/lib/server/cbt/bank";
import { OTHER_TEACHER } from "@/lib/demo/seed";

import { CURRICULUM_QUESTIONS } from "@/lib/server/curriculum-content";
import { cbtLab } from "./cbt-fixture";
async function started() {
  const lab = cbtLab();
  const published = await lab.service(lab.teacher).execute({
    action: "publish",
    reviewed: true,
    class_id: lab.context.classes[0].id,
    subject: "bahasa-inggris",
    title: "Ujian Bahasa Inggris",
    duration_minutes: 45,
  });
  const exam = lab.state().exams[0];
  const student = lab.service(lab.student);
  const start = await student.execute({
    action: "start",
    exam_id: published.exam_id,
    code: exam.access_code,
  });
  return { ...lab, exam, studentService: student, id: start.sitting_id! };
}
describe("CBT: rahasia, waktu, identitas, dan idempotensi", () => {
  it("arsip menyembunyikan data uji tanpa menghapus hasil atau mengizinkan pemakaian ulang soal", async () => {
    const l = await started();
    const teacher = l.service(l.teacher);
    await teacher.execute({ action: "close", exam_id: l.exam.id });
    await teacher.execute({ action: "release", exam_id: l.exam.id });
    await l.repo.transact((state) => {
      state.exams[0].archived_at = new Date().toISOString();
    });
    expect((await teacher.list()).exams).toHaveLength(0);
    expect((await l.studentService.list()).exams).toHaveLength(0);
    expect((await l.studentService.view(l.id)).result).not.toBeNull();
    expect(l.state().exams).toHaveLength(1);
    expect(l.state().sittings).toHaveLength(1);
    await expect(
      teacher.execute({
        action: "publish",
        reviewed: true,
        class_id: l.context.classes[0].id,
        subject: "bahasa-inggris",
        title: "Paket yang pernah dirilis",
        duration_minutes: 45,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("CSV privat valid dapat ditinjau, tetapi salah mapel, duplikat dan soal latihan ditolak", () => {
    const l = cbtLab();
    const items = examItems("matematika", l.context.topics);
    const csv = (rows: typeof items) =>
      [
        "topik,pertanyaan,opsi_a,opsi_b,opsi_c,opsi_d,kunci,kesulitan,pembahasan",
        ...rows.map((q) =>
          [
            l.context.topics.find((t) => t.id === q.topic_id)!.slug,
            q.question_text,
            ...Object.values(q.options),
            q.correct_option,
            "sedang",
            q.explanation,
          ]
            .map((v) => '"' + v.replaceAll('"', '""') + '"')
            .join(","),
        ),
      ].join("\n");
    expect(prepareExamItems("matematika", l.context, csv(items))).toHaveLength(
      24,
    );
    expect(() =>
      prepareExamItems("bahasa-inggris", l.context, csv(items)),
    ).toThrow(/mapel/);
    expect(() =>
      prepareExamItems(
        "matematika",
        l.context,
        csv([...items.slice(0, 23), items[0]]),
      ),
    ).toThrow(/duplikat/);
    l.context.questions.push({
      ...l.context.questions[0],
      question_text: items[0].question_text.toUpperCase(),
      options: {
        ...items[0].options,
        A: items[0].options.D,
        D: items[0].options.A,
      },
    });
    expect(questionFingerprint(l.context.questions.at(-1)!)).toBe(
      questionFingerprint(items[0]),
    );
    expect(() => prepareExamItems("matematika", l.context, csv(items))).toThrow(
      /latihan/,
    );
  });
  it("rilis terkoordinasi lintas ujian dan paket terbuka tidak dapat dipakai lagi", async () => {
    const l = await started();
    const t = l.service(l.teacher);
    const second = await t.execute({
      action: "publish",
      reviewed: true,
      class_id: l.context.classes[0].id,
      subject: "bahasa-inggris",
      title: "Gelombang kedua",
      duration_minutes: 45,
    });
    await t.execute({ action: "close", exam_id: l.exam.id });
    await expect(
      t.execute({ action: "release", exam_id: l.exam.id }),
    ).rejects.toMatchObject({ status: 409 });
    await t.execute({ action: "close", exam_id: second.exam_id });
    await t.execute({ action: "release", exam_id: l.exam.id });
    await expect(
      t.execute({
        action: "publish",
        reviewed: true,
        class_id: l.context.classes[0].id,
        subject: "bahasa-inggris",
        title: "Tidak boleh dipakai ulang",
        duration_minutes: 45,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("preview dan publikasi hanya untuk guru, dan wajib ada peninjauan", async () => {
    const l = cbtLab();
    expect(l.service(l.teacher).preview("matematika")).toHaveLength(24);
    expect(() => l.service(l.student).preview("matematika")).toThrow();
    await expect(
      l
        .service(l.student)
        .execute({ action: "preview", subject: "matematika" }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      l.service(l.teacher).execute({
        action: "publish",
        class_id: l.context.classes[0].id,
        subject: "matematika",
        title: "Tanpa peninjauan",
        duration_minutes: 45,
      }),
    ).rejects.toThrow();
  });
  it("72 soal CBT berbeda dari bank latihan dan setiap topik memiliki enam butir", () => {
    const lab = cbtLab();
    const old = new Set(CURRICULUM_QUESTIONS.map((q) => q.question_text));
    for (const s of [
      "matematika",
      "bahasa-inggris",
      "bahasa-indonesia",
    ] as const) {
      const items = examItems(s, lab.context.topics);
      expect(items).toHaveLength(24);
      expect(items.every((q) => !old.has(q.question_text))).toBe(true);
      const groups = Object.groupBy(items, (q) => q.topic_id);
      expect(Object.values(groups).map((g) => g!.length)).toEqual([6, 6, 6, 6]);
    }
  });
  it("view, list, save, retry, dan submit siswa tidak mengungkap kunci atau BKT sebelum rilis", async () => {
    const l = await started();
    const view = await l.studentService.view(l.id);
    const first = view.questions[0];
    const saved = await l.studentService.execute({
      action: "save",
      sitting_id: l.id,
      item_id: first.id,
      option: "A",
      flagged: true,
      expected_version: 0,
    });
    const submitted = await l.studentService.execute({
      action: "submit",
      sitting_id: l.id,
      expected_version: 1,
    });
    const retry = await l.studentService.execute({
      action: "submit",
      sitting_id: l.id,
      expected_version: 1,
    });
    for (const response of [
      view,
      saved,
      submitted,
      retry,
      await l.studentService.list(),
    ]) {
      const text = JSON.stringify(response);
      expect(text).not.toMatch(
        /"correct_option"|"explanation"|"is_correct"|"p_l"|"priors"|"access_code"/,
      );
    }
    expect((await l.studentService.view(l.id)).result).toBeNull();
    expect(l.state().sittings).toHaveLength(1);
  });
  it("refresh dan start ulang memakai urutan serta deadline yang sama", async () => {
    const l = await started();
    const before = await l.studentService.view(l.id);
    l.advance(10000);
    const resumed = await l.studentService.execute({
      action: "start",
      exam_id: l.exam.id,
      code: l.exam.access_code,
    });
    const after = await l.studentService.view(l.id);
    expect(resumed.sitting_id).toBe(l.id);
    expect(after.questions).toEqual(before.questions);
    expect(after.deadline_at).toBe(before.deadline_at);
  });
  it("satu peserta tidak memperoleh sesi atau opsi milik peserta lain", async () => {
    const l = await started();
    const other = l.context.profiles.find(
      (p) => p.role === "student" && p.id !== l.student.id,
    )!;
    const start = await l.service(other).execute({
      action: "start",
      exam_id: l.exam.id,
      code: l.exam.access_code,
    });
    expect(start.sitting_id).not.toBe(l.id);
    expect(l.state().sittings[0].order).not.toEqual(
      l.state().sittings[1].order,
    );
    await expect(l.service(other).view(l.id)).rejects.toMatchObject({
      status: 404,
    });
  });
  it("kode salah, siswa luar kelas, dan guru lain ditolak", async () => {
    const l = await started();
    const outsider = { ...l.student, id: crypto.randomUUID() };
    await expect(
      l.service(outsider).execute({
        action: "start",
        exam_id: l.exam.id,
        code: l.exam.access_code,
      }),
    ).rejects.toMatchObject({ status: 404 });
    const other = l.context.profiles.find((p) => p.id === OTHER_TEACHER)!;
    await expect(
      l.service(other).execute({ action: "close", exam_id: l.exam.id }),
    ).rejects.toMatchObject({ status: 404 });
    const fresh = await l.service(l.teacher).execute({
      action: "publish",
      reviewed: true,
      class_id: l.context.classes[0].id,
      subject: "matematika",
      title: "Ujian lain",
      duration_minutes: 45,
    });
    await expect(
      l.studentService.execute({
        action: "start",
        exam_id: fresh.exam_id,
        code: "SALAH123",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("batas waktu server menutup sesi dan tidak menerima autosave terlambat", async () => {
    const l = await started();
    const q = (await l.studentService.view(l.id)).questions[0];
    l.advance(45 * 60000);
    const late = await l.studentService.execute({
      action: "save",
      sitting_id: l.id,
      item_id: q.id,
      option: "A",
      flagged: false,
      expected_version: 0,
    });
    expect(late.view?.status).toBe("submitted");
    expect(late.view?.answered).toBe(0);
    expect(late.view?.end_reason).toBe("time");
    expect(l.state().sittings[0].answers).toEqual({});
  });
  it("autosave dengan versi lama tidak menimpa jawaban terbaru", async () => {
    const l = await started();
    const q = (await l.studentService.view(l.id)).questions[0];
    await l.studentService.execute({
      action: "save",
      sitting_id: l.id,
      item_id: q.id,
      option: "B",
      flagged: false,
      expected_version: 0,
    });
    await expect(
      l.studentService.execute({
        action: "save",
        sitting_id: l.id,
        item_id: q.id,
        option: "A",
        flagged: true,
        expected_version: 0,
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(l.state().sittings[0].answers[q.id].option).toBe("B");
  });
  it("guru harus menutup ujian sebelum merilis dan penutupan membekukan jawaban", async () => {
    const l = await started();
    await expect(
      l.service(l.teacher).execute({ action: "release", exam_id: l.exam.id }),
    ).rejects.toMatchObject({ status: 409 });
    await l.service(l.teacher).execute({ action: "close", exam_id: l.exam.id });
    const closed = await l.studentService.view(l.id);
    expect(closed.status).toBe("submitted");
    expect(closed.result).toBeNull();
    await l
      .service(l.teacher)
      .execute({ action: "release", exam_id: l.exam.id });
    const result = (await l.studentService.view(l.id)).result;
    expect(result?.review).toHaveLength(24);
    expect(result?.score).toBe(0);
  });
  it("penilaian mengikuti opsi yang diacak dan mempertahankan data latihan", async () => {
    const l = await started();
    const before = structuredClone(l.context);
    let view = await l.studentService.view(l.id);
    for (const item of view.questions) {
      const raw = l.exam.items.find((q) => q.id === item.id)!;
      const correctText = raw.options[raw.correct_option];
      const key = Object.entries(item.options).find(
        ([, value]) => value === correctText,
      )![0];
      const saved = await l.studentService.execute({
        action: "save",
        sitting_id: l.id,
        item_id: item.id,
        option: key,
        flagged: false,
        expected_version: view.version,
      });
      view = saved.view!;
    }
    await l.studentService.execute({
      action: "submit",
      sitting_id: l.id,
      expected_version: view.version,
    });
    expect(grade(l.exam, l.state().sittings[0]).correct).toBe(24);
    expect(l.context).toEqual(before);
    const list = await l.service(l.teacher).list();
    expect(list.exams[0].participants?.[0].score).toBe(100);
  });
});
