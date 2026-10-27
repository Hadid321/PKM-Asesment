import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { readJson, rateLimit } from "@/lib/server/http";
import { topicInput } from "@/lib/validation";
beforeEach(() => vi.stubEnv("APP_URL", "http://127.0.0.1:3000"));
afterEach(() => vi.unstubAllEnvs());
const request = (body: string, origin = "http://127.0.0.1:3000") =>
  new Request("http://localhost:3000/api/actions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body,
  });
describe("Batas input dan Origin", () => {
  it("menerima origin lokal walau Next memakai host internal berbeda", async () =>
    expect(await readJson(request('{"ok":true}'))).toEqual({ ok: true }));
  it("menolak asal lain", async () =>
    expect(readJson(request("{}", "https://palsu.invalid"))).rejects.toThrow(
      "Asal",
    ));
  it("menolak JSON rusak", async () =>
    expect(readJson(request("rusak"))).rejects.toThrow("JSON tidak valid"));
  it("membatasi ukuran stream", async () =>
    expect(readJson(request("x".repeat(600001)))).rejects.toThrow("600 KB"));
  it("rate limit mengembalikan pesan yang dapat dicoba ulang", () => {
    const key = crypto.randomUUID();
    rateLimit(key, 1);
    expect(() => rateLimit(key, 1)).toThrow("Tunggu satu menit");
  });
  it("URL materi invalid dan protokol skrip ditolak", () => {
    const data = {
      name: "Topik",
      slug: "topik",
      description: "Deskripsi",
      material_title: "Materi",
      prerequisites: [],
    };
    for (const material_url of [
      "https://",
      "javascript:alert(1)",
      "http://example.com",
      "/materi/tidak-ada",
    ])
      expect(topicInput.safeParse({ ...data, material_url }).success).toBe(
        false,
      );
    expect(
      topicInput.safeParse({
        ...data,
        material_url: "https://example.com/materi",
      }).success,
    ).toBe(true);
  });
});
