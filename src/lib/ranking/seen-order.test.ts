import { describe, expect, it } from "vitest";
import { compareForViewer, isAfterCursor, type ViewerRanked } from "@/lib/ranking/seen-order";

const item = (id: string, score: number, seen: boolean): ViewerRanked => ({ id, score, seen });
const ids = (items: ViewerRanked[]) => items.map((i) => i.id);

describe("compareForViewer", () => {
  it("puts every post the viewer hasn't seen before any they have, however well the seen one scores", () => {
    const sorted = [item("seen-hot", 90, true), item("new-cold", 2, false), item("new-warm", 40, false), item("seen-cold", 1, true)].sort(
      compareForViewer,
    );
    expect(ids(sorted)).toEqual(["new-warm", "new-cold", "seen-hot", "seen-cold"]);
  });

  it("breaks score ties by id so the order is total", () => {
    expect(ids([item("b", 5, false), item("a", 5, false)].sort(compareForViewer))).toEqual(["a", "b"]);
  });
});

describe("isAfterCursor", () => {
  const all = [item("u1", 50, false), item("u2", 10, false), item("s1", 80, true), item("s2", 20, true)].sort(compareForViewer);
  const after = (cursor: { postId: string; score: number; seen: boolean }) => ids(all.filter((i) => isAfterCursor(i, cursor)));

  it("continues through the rest of the unseen posts, then the seen ones", () => {
    expect(after({ postId: "u1", score: 50, seen: false })).toEqual(["u2", "s1", "s2"]);
  });

  it("never goes back to unseen posts once the page reached the seen ones", () => {
    expect(after({ postId: "s1", score: 80, seen: true })).toEqual(["s2"]);
  });
});
