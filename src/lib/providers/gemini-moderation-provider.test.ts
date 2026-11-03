import { afterEach, describe, expect, it, vi } from "vitest";
import { GeminiModerationProvider } from "@/lib/providers/gemini-moderation-provider";

function verdict(parts: object[], finishReason = "STOP") {
  return new Response(JSON.stringify({ candidates: [{ content: { parts }, finishReason }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const allowed = { text: JSON.stringify({ flagged: false, reason: null, confidence: 0.98 }) };

async function moderate() {
  const provider = new GeminiModerationProvider("test-key");
  return provider.moderateImage(new Uint8Array([1, 2, 3]).buffer, "image/jpeg");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GeminiModerationProvider", () => {
  it("retries a rate-limited call instead of failing the upload", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota", { status: 429 }))
      .mockResolvedValueOnce(verdict([allowed]));
    vi.stubGlobal("fetch", fetchMock);

    const pending = moderate();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ flagged: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a dropped connection", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(verdict([allowed]));
    vi.stubGlobal("fetch", fetchMock);

    const pending = moderate();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toMatchObject({ flagged: false });
  });

  it("gives up after three tries and says why", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockImplementation(async () => new Response("busy", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const pending = moderate();
    const assertion = expect(pending).rejects.toThrow("503");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("doesn't retry a request that can never succeed", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad key", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(moderate()).rejects.toThrow("400");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("finds the verdict even when a thinking part comes first", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(verdict([{ thought: true, text: "hmm" }, allowed])));
    await expect(moderate()).resolves.toMatchObject({ flagged: false, isMock: false });
  });

  it("passes a flag through with its reason", async () => {
    const flagged = { text: JSON.stringify({ flagged: true, reason: "Explicit content", confidence: 0.9 }) };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(verdict([flagged])));
    await expect(moderate()).resolves.toMatchObject({ flagged: true, reason: "Explicit content" });
  });
});
