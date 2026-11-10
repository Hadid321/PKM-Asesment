import { describe, expect, it } from "vitest";
import { shouldAcceptCbtView } from "@/lib/cbt/client-state";
const base = {
  version: 0,
  status: "active" as const,
  released: false,
  server_time: "2026-11-03T12:00:00.000Z",
};
describe("Respons CBT yang datang tidak berurutan", () => {
  it("GET lama tidak memundurkan jawaban yang sudah disimpan", () => {
    const saved = {
      ...base,
      version: 1,
      server_time: "2026-11-03T12:00:02.000Z",
    };
    expect(shouldAcceptCbtView(saved, base)).toBe(false);
    expect(shouldAcceptCbtView(base, saved)).toBe(true);
  });
  it("status pengumpulan dan rilis tidak dibatalkan oleh respons lama", () => {
    const submitted = {
      ...base,
      version: 2,
      status: "submitted" as const,
      released: true,
    };
    expect(shouldAcceptCbtView(submitted, { ...base, version: 3 })).toBe(false);
    expect(
      shouldAcceptCbtView(submitted, { ...submitted, released: false }),
    ).toBe(false);
  });
  it("respons waktu lama pada versi sama tidak mereset penghitung waktu", () => {
    expect(
      shouldAcceptCbtView(
        { ...base, server_time: "2026-11-03T12:00:10.000Z" },
        base,
      ),
    ).toBe(false);
  });
});

it("respons lama tidak membatalkan penghentian atau izin baru", () => {
  const locked = { ...base, focus: { version: 3 } },
    resumed = { ...base, focus: { version: 4 } };
  expect(shouldAcceptCbtView(resumed, locked)).toBe(false);
  expect(shouldAcceptCbtView(locked, resumed)).toBe(true);
});
