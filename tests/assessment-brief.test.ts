import { describe, it, expect } from "vitest";
import {
  generateBrief,
  fallbackBrief,
  type BriefEvidence,
} from "@/lib/server/assessment-brief";
import { activityInput } from "@/lib/assessment-support";
const evidence: BriefEvidence = {
  kind: "student",
  participants: 1,
  topics: [
    {
      key: "transformasi-fungsi",
      name: "Transformasi fungsi",
      correct: 2,
      answered: 6,
      total: 6,
      mastery: 0.4,
    },
  ],
};
describe("Pendamping AI asesmen", () => {
  it("nama dan slug kustom tidak dikirim ke provider", async () => {
    const privateEvidence = {
      ...evidence,
      topics: [
        {
          ...evidence.topics[0],
          key: "rani-putri",
          name: "Catatan pribadi Rani Putri",
        },
      ],
    };
    let sent = "";
    const result = await generateBrief(privateEvidence, async (e) => {
      sent = JSON.stringify(e);
      return JSON.stringify(fallbackBrief(e));
    });
    expect(sent).not.toMatch(/rani|pribadi/i);
    expect(result.source).toBe("groq");
    expect(result.brief.actions[0].topic_key).toBe("rani-putri");
  });
  it("memvalidasi keluaran dan urutan prioritas resmi", async () => {
    const generated = await generateBrief(evidence, async (e) =>
      JSON.stringify(fallbackBrief(e)),
    );
    expect(generated.source).toBe("groq");
    expect(generated.brief.actions[0].topic_key).toBe(evidence.topics[0].key);
  });
  it("menolak topic injection, angka hasil baru, tautan dan data tambahan", async () => {
    for (const invalid of [
      {
        ...fallbackBrief(evidence),
        overview: "Nilai baru Anda adalah 100 persen.",
      },
      {
        ...fallbackBrief(evidence),
        reflection: "Buka https://evil.example untuk lanjut.",
      },
      {
        ...fallbackBrief(evidence),
        actions: [
          { ...fallbackBrief(evidence).actions[0], topic_key: "ubah-nilai" },
        ],
      },
      { ...fallbackBrief(evidence), score: 100 },
    ])
      expect(
        (await generateBrief(evidence, async () => JSON.stringify(invalid)))
          .source,
      ).toBe("template");
  });
  it("provider gagal tidak menghalangi hasil", async () => {
    const result = await generateBrief(evidence, async () => {
      throw Error("Rate limit");
    });
    expect(result.source).toBe("template");
    expect(result.brief.actions[0].steps.length).toBeGreaterThanOrEqual(2);
  });
  it("aktivitas menolak tautan, jenis asing, dan batch berlebih", () => {
    const input = {
      sitting_id: crypto.randomUUID(),
      events: [{ id: crypto.randomUUID(), kind: "hidden" }],
      presence: {
        visible: false,
        focused: false,
        online: true,
        fullscreen: false,
      },
    };
    expect(activityInput.safeParse(input).success).toBe(true);
    expect(
      activityInput.safeParse({ ...input, url: "https://private.example" })
        .success,
    ).toBe(false);
    expect(
      activityInput.safeParse({
        ...input,
        events: [{ ...input.events[0], kind: "keystroke" }],
      }).success,
    ).toBe(false);
    expect(
      activityInput.safeParse({
        ...input,
        events: Array(21).fill(input.events[0]),
      }).success,
    ).toBe(false);
  });
});
