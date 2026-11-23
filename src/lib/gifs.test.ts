import { describe, expect, it } from "vitest";
import { gifFromRow, gifUrl, parseGif, parseGifFromForm } from "./gifs";

describe("parseGif", () => {
  it("returns null when no GIF was sent", () => {
    expect(parseGif({ id: null, width: null, height: null })).toBeNull();
    expect(parseGif({ id: "", width: "", height: "" })).toBeNull();
  });

  it("reads a GIF from string form values", () => {
    expect(parseGif({ id: "LfQzCXmICSoa4", width: "200", height: "134" })).toEqual({
      id: "LfQzCXmICSoa4",
      width: 200,
      height: 134,
    });
  });

  it("rejects ids that aren't plain GIPHY ids", () => {
    expect(parseGif({ id: "../evil", width: "200", height: "134" })).toBe("invalid");
    expect(parseGif({ id: "https://example.com/x.gif", width: "200", height: "134" })).toBe("invalid");
    expect(parseGif({ id: "a".repeat(65), width: "200", height: "134" })).toBe("invalid");
  });

  it("rejects missing or out-of-range sizes", () => {
    expect(parseGif({ id: "abc", width: "", height: "134" })).toBe("invalid");
    expect(parseGif({ id: "abc", width: "0", height: "134" })).toBe("invalid");
    expect(parseGif({ id: "abc", width: "200", height: "2001" })).toBe("invalid");
    expect(parseGif({ id: "abc", width: "12.5", height: "134" })).toBe("invalid");
  });
});

describe("parseGifFromForm", () => {
  it("reads the gif_* fields", () => {
    const fd = new FormData();
    fd.set("gif_id", "abc123");
    fd.set("gif_width", "200");
    fd.set("gif_height", "150");
    expect(parseGifFromForm(fd)).toEqual({ id: "abc123", width: 200, height: 150 });
    expect(parseGifFromForm(new FormData())).toBeNull();
  });
});

describe("gifUrl / gifFromRow", () => {
  it("builds the GIPHY rendition URL from the id", () => {
    expect(gifUrl("abc123")).toBe("https://media.giphy.com/media/abc123/200w.webp");
  });

  it("returns the GIF only when the row has all three fields", () => {
    expect(gifFromRow({ gif_id: "abc", gif_width: 200, gif_height: 100 })).toEqual({ id: "abc", width: 200, height: 100 });
    expect(gifFromRow({ gif_id: null, gif_width: null, gif_height: null })).toBeNull();
  });
});
