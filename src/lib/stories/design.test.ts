import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, MAX_LAYERS, MAX_STROKES, parseStoryDesign } from "@/lib/stories/design";

describe("parseStoryDesign", () => {
  it("falls back to the plain design for anything that isn't one", () => {
    expect(parseStoryDesign(null)).toEqual(DEFAULT_DESIGN);
    expect(parseStoryDesign("nope")).toEqual(DEFAULT_DESIGN);
    expect(parseStoryDesign({ v: 2 })).toEqual(DEFAULT_DESIGN);
  });

  it("keeps a valid text layer and clamps where it can go and how big it gets", () => {
    const d = parseStoryDesign({
      v: 1,
      layers: [{ kind: "text", id: "a", text: "  Fresh wheels ", x: 2, y: -1, scale: 40, rotation: 1, font: "strong", color: "#E1141F", bg: "solid", align: "left" }],
    });
    expect(d.layers).toEqual([
      { kind: "text", id: "a", text: "Fresh wheels", x: 1, y: 0, scale: 4, rotation: 1, font: "strong", color: "#e1141f", bg: "solid", align: "left" },
    ]);
  });

  it("drops text that's empty, and unknown fonts, colors and kinds fall back or go", () => {
    const d = parseStoryDesign({
      v: 1,
      layers: [
        { kind: "text", id: "a", text: "   ", x: 0.5, y: 0.5 },
        { kind: "text", id: "b", text: "hi", x: 0.5, y: 0.5, font: "comic", color: "red; background:url(x)" },
        { kind: "script", id: "c" },
      ],
    });
    expect(d.layers).toHaveLength(1);
    expect(d.layers[0]).toMatchObject({ id: "b", font: "modern", color: "#ffffff" });
  });

  it("caps text length, layer count and drawing size", () => {
    const many = Array.from({ length: MAX_LAYERS + 5 }, (_, i) => ({ kind: "time", id: `t${i}`, label: "9:41 PM", x: 0.5, y: 0.5 }));
    expect(parseStoryDesign({ v: 1, layers: many }).layers).toHaveLength(MAX_LAYERS);
    const long = parseStoryDesign({ v: 1, layers: [{ kind: "text", id: "a", text: "x".repeat(900), x: 0.5, y: 0.5 }] });
    expect((long.layers[0] as { text: string }).text).toHaveLength(300);
    const strokes = Array.from({ length: MAX_STROKES + 3 }, () => ({ tool: "pen", color: "#ffffff", width: 0.02, points: [0.1, 0.1, 0.2, 0.2] }));
    expect(parseStoryDesign({ v: 1, drawing: strokes }).drawing).toHaveLength(MAX_STROKES);
  });

  it("keeps a stroke's points in the frame and drops strokes too short to draw", () => {
    const d = parseStoryDesign({
      v: 1,
      drawing: [
        { tool: "marker", color: "#ffd60a", width: 0.5, points: [-1, 0.5, 0.5, 2, 0.6] },
        { tool: "pen", color: "#ffffff", width: 0.02, points: [0.5] },
      ],
    });
    expect(d.drawing).toEqual([{ tool: "marker", color: "#ffd60a", width: 0.08, points: [0, 0.5, 0.5, 1] }]);
  });

  it("only keeps a mention or car sticker's identifiers, never its display data", () => {
    const d = parseStoryDesign({
      v: 1,
      layers: [
        { kind: "mention", id: "m", username: "Some_User", userId: "spoofed", x: 0.5, y: 0.5, style: 1 },
        { kind: "car", id: "c", vehicleId: "v1", name: "Fake 999", score: 100, tier: "cosmic", x: 0.5, y: 0.5 },
      ],
    });
    expect(d.layers[0]).toMatchObject({ kind: "mention", username: "some_user", userId: null, style: 1 });
    expect(d.layers[1]).toMatchObject({ kind: "car", vehicleId: "v1", name: "", score: null, tier: null });
  });

  it("keeps the media placement and filter within range", () => {
    const d = parseStoryDesign({ v: 1, media: { scale: 99, x: 5, y: 0, rotation: 0 }, filter: "vivid" });
    expect(d.media).toEqual({ scale: 5, x: 1, y: 0, rotation: 0 });
    expect(d.filter).toBe("vivid");
    expect(parseStoryDesign({ v: 1, filter: "evil" }).filter).toBe("normal");
  });
});

describe("interactive stickers", () => {
  const uuid = "0b1e8a1c-1111-4222-8333-944455556666";

  it("keeps a poll with a question and two trimmed options, and drops broken ones", () => {
    const d = parseStoryDesign({
      v: 1,
      layers: [
        { kind: "poll", id: "p", question: "  Stance or stock? ", options: [" Stance ", "Stock"], x: 0.5, y: 0.5 },
        { kind: "poll", id: "q", question: "Bad", options: ["Only one"], x: 0.5, y: 0.5 },
      ],
    });
    expect(d.layers).toEqual([{ kind: "poll", id: "p", question: "Stance or stock?", options: ["Stance", "Stock"], x: 0.5, y: 0.5, scale: 1, rotation: 0 }]);
  });

  it("allows only one poll, one question and one song per story", () => {
    const d = parseStoryDesign({
      v: 1,
      layers: [
        { kind: "question", id: "a", prompt: "Ask me", x: 0.5, y: 0.5 },
        { kind: "question", id: "b", prompt: "Again", x: 0.5, y: 0.5 },
        { kind: "music", id: "m", soundId: uuid, startMs: 5000, x: 0.5, y: 0.5 },
        { kind: "music", id: "n", soundId: uuid, startMs: 0, x: 0.5, y: 0.5 },
      ],
    });
    expect(d.layers.map((l) => l.id)).toEqual(["a", "m"]);
  });

  it("never trusts a song's title from the editor, and keeps its start time sane", () => {
    const d = parseStoryDesign({ v: 1, layers: [{ kind: "music", id: "m", soundId: uuid, startMs: -50, title: "Fake", artist: "Fake", x: 0.5, y: 0.5 }] });
    expect(d.layers[0]).toMatchObject({ kind: "music", soundId: uuid, startMs: 0, title: "", artist: "" });
    expect(parseStoryDesign({ v: 1, layers: [{ kind: "music", id: "m", soundId: "not-a-uuid", x: 0.5, y: 0.5 }] }).layers).toEqual([]);
  });

  it("keeps a location's name, trimmed and capped", () => {
    const d = parseStoryDesign({ v: 1, layers: [{ kind: "location", id: "l", name: "  Cars & Coffee, Dallas  ", x: 0.5, y: 0.5 }] });
    expect(d.layers[0]).toMatchObject({ kind: "location", name: "Cars & Coffee, Dallas", style: 0 });
    expect(parseStoryDesign({ v: 1, layers: [{ kind: "location", id: "l", name: "  ", x: 0.5, y: 0.5 }] }).layers).toEqual([]);
  });
});
