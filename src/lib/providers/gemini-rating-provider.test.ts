import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiRatingProvider } from "@/lib/providers/gemini-rating-provider";

const answer = {
  text: JSON.stringify({
    score: 88.4,
    strengths: "Clean stance.",
    limitingFactors: "Stock interior.",
    appearance: 90,
    performance: 80,
    wheelsFitment: 92,
    interior: 70,
    modifications: 85,
  }),
};

function reply(parts: object[], finishReason = "STOP") {
  return new Response(JSON.stringify({ candidates: [{ content: { parts }, finishReason }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function rate() {
  const provider = new GeminiRatingProvider("test-key");
  return provider.rateBuild([{ bytes: new Uint8Array([1, 2, 3]).buffer, mimeType: "image/jpeg" }], "2020 Test Car");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GeminiRatingProvider", () => {
  it("retries a rate-limited call instead of showing the owner an error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(reply([answer]));
    vi.stubGlobal("fetch", fetchMock);

    const pending = rate();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ isMock: false, strengths: "Clean stance." });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a dropped connection", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(reply([answer]));
    vi.stubGlobal("fetch", fetchMock);

    const pending = rate();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ isMock: false });
  });

  it("reads the rating even when a thinking part comes first", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply([{ thought: true, text: "Looking..." }, answer])));
    const rating = await rate();
    expect(rating.subscores.wheelsFitment).toBe(92);
  });

  it("doesn't retry a request that can never succeed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad key", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(rate()).rejects.toThrow("400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says why when the answer was cut off", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply([{ text: '{"score": 8' }], "MAX_TOKENS")));
    await expect(rate()).rejects.toThrow("MAX_TOKENS");
  });
});
