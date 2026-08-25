import { describe, expect, it } from "vitest";
import { PART_CATEGORIES, getPartCategoryLabel } from "./categories";

describe("PART_CATEGORIES", () => {
  it("has a unique, non-empty id and label for every category", () => {
    const ids = new Set<string>();
    for (const category of PART_CATEGORIES) {
      expect(category.id.trim()).not.toBe("");
      expect(category.label.trim()).not.toBe("");
      expect(ids.has(category.id)).toBe(false);
      ids.add(category.id);
    }
  });

  it("includes merch with no search keyword, since there's nothing real to search for yet", () => {
    const merch = PART_CATEGORIES.find((c) => c.id === "merch");
    expect(merch).toBeDefined();
    expect(merch?.searchKeyword).toBeNull();
  });

  it("gives every non-merch category a real search keyword", () => {
    for (const category of PART_CATEGORIES) {
      if (category.id === "merch") continue;
      expect(category.searchKeyword?.trim()).not.toBe("");
    }
  });
});

describe("getPartCategoryLabel", () => {
  it("resolves a known id to its label", () => {
    expect(getPartCategoryLabel("wheels-tires")).toBe("Wheels & Tires");
  });

  it("falls back to the raw id for an unknown category", () => {
    expect(getPartCategoryLabel("not-a-real-category")).toBe("not-a-real-category");
  });
});
