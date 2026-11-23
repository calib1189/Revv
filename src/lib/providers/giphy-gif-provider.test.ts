import { afterEach, describe, expect, it, vi } from "vitest";
import { GiphyGifProvider, toGifResults } from "./giphy-gif-provider";

afterEach(() => {
  vi.unstubAllGlobals();
});

const gif = (id: unknown, width: unknown = "200", height: unknown = "134") => ({
  id,
  title: "Burnout GIF",
  images: { fixed_width: { width, height } },
});

describe("toGifResults", () => {
  it("keeps GIFs with a plain id and a 200px rendition", () => {
    expect(toGifResults({ data: [gif("LfQzCXmICSoa4")] })).toEqual([
      { id: "LfQzCXmICSoa4", width: 200, height: 134, title: "Burnout GIF" },
    ]);
  });

  it("drops anything the database wouldn't accept", () => {
    expect(toGifResults({ data: [gif("bad/id"), gif("ok", "200", null), gif(42)] })).toEqual([]);
    expect(toGifResults({})).toEqual([]);
  });
});

describe("GiphyGifProvider", () => {
  it("searches with the content rating and a trimmed query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [gif("abc")] }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new GiphyGifProvider("test-key").search("  Burnout ");

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/v1/gifs/search");
    expect(url.searchParams.get("q")).toBe("burnout");
    expect(url.searchParams.get("rating")).toBe("pg-13");
    expect(result).toEqual({ gifs: [{ id: "abc", width: 200, height: 134, title: "Burnout GIF" }], isMock: false });
  });

  it("throws when GIPHY refuses, so the picker can show an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("limit", { status: 429 })));
    await expect(new GiphyGifProvider("test-key").trending()).rejects.toThrow("429");
  });
});
