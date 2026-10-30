import { describe, expect, it } from "vitest";
import {
  CURRICULUM_TOPICS,
  CURRICULUM_SOURCES,
  curriculumTopics,
} from "@/lib/curriculum/catalog";
import {
  LEARNING_MATERIALS,
  topicWithLearningMaterial,
} from "@/lib/learning-materials";
import { READING_STIMULI } from "@/lib/server/reading-stimuli";
import { CURRICULUM_QUESTIONS } from "@/lib/server/curriculum-content";

describe("Materi dan peninjauan isi paket", () => {
  it("setiap topik paket mempunyai materi khusus, contoh, dan latihan mandiri", () => {
    for (const topic of curriculumTopics()) {
      const lesson = LEARNING_MATERIALS[topic.slug];
      expect(lesson.subject).toBe(topic.subject);
      expect(topic.material_url).toBe(`/materi/${topic.slug}`);
      expect(lesson.paragraphs.length).toBeGreaterThanOrEqual(2);
      expect(lesson.example.length).toBeGreaterThan(50);
      expect(lesson.exercise.explanation.length).toBeGreaterThan(50);
    }
    expect(Object.keys(LEARNING_MATERIALS)).toHaveLength(
      CURRICULUM_TOPICS.length,
    );
  });
  it("tautan umum lama mendapat fallback lokal tanpa menulis ulang topik", () => {
    const topic = {
      ...curriculumTopics()[0],
      material_url: CURRICULUM_SOURCES[2].url,
    };
    const before = structuredClone(topic);
    expect(topicWithLearningMaterial(topic).material_url).toBe(
      `/materi/${topic.slug}`,
    );
    expect(topic).toEqual(before);
  });
  it("tautan dan judul yang dipilih guru tetap dipakai", () => {
    const topic = {
      ...curriculumTopics()[0],
      material_url: "https://sekolah.example/materi",
      material_title: "Modul kelas saya",
    };
    expect(topicWithLearningMaterial(topic)).toBe(topic);
  });
  it("stimulus Inggris berada pada rentang baca yang ditetapkan untuk paket", () => {
    for (const passage of Object.values(READING_STIMULI)) {
      const words = passage.trim().split(/\s+/).length;
      expect(words).toBeGreaterThanOrEqual(250);
      expect(words).toBeLessThanOrEqual(300);
    }
    expect(READING_STIMULI.info1).toContain("bus timetable did not change");
    expect(READING_STIMULI.info1).toContain("a quarter past four");
  });
  it("pengacakan opsi menjaga makna kunci dan distribusi seimbang tanpa pola berulang lama", () => {
    const expected: Record<string, string> = {
      "MTK-01": "g(x) = x² + 3",
      "MTK-23": "15/28",
      "ING-02": "They have more time to choose books before leaving.",
      "IND-16": "Para peserta mengumpulkan sampah sesuai jenisnya.",
    };
    for (const [code, answer] of Object.entries(expected)) {
      const q = CURRICULUM_QUESTIONS.find((q) => q.code === code)!;
      expect(q.options[q.correct_option]).toBe(answer);
    }
    for (const prefix of ["MTK", "ING", "IND"]) {
      const questions = CURRICULUM_QUESTIONS.filter((q) =>
        q.code.startsWith(prefix),
      );
      for (const letter of ["A", "B", "C", "D"])
        expect(
          questions.filter((q) => q.correct_option === letter),
        ).toHaveLength(6);
      expect(questions.map((q) => q.correct_option).join("")).not.toBe(
        "ABDC".repeat(6),
      );
    }
  });
});
