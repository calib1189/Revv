import { describe, expect, it } from "vitest";
import { pickShopPictureMediaIds } from "@/lib/db/shop-pictures";

describe("pickShopPictureMediaIds", () => {
  it("uses a promoter's picture when the shop has nothing else", () => {
    const picked = pickShopPictureMediaIds([], [{ place_id: "a", media_id: "m1" }]);
    expect(picked.get("a")).toBe("m1");
  });

  it("lets a verified business's own logo win over a promoter's picture", () => {
    const picked = pickShopPictureMediaIds(
      [{ place_id: "a", logo_media_id: "logo" }],
      [{ place_id: "a", media_id: "m1" }],
    );
    expect(picked.get("a")).toBe("logo");
  });

  it("keeps the promoter's picture when the verified business has no logo yet", () => {
    const picked = pickShopPictureMediaIds(
      [{ place_id: "a", logo_media_id: null }],
      [{ place_id: "a", media_id: "m1" }],
    );
    expect(picked.get("a")).toBe("m1");
  });

  it("leaves out places with neither", () => {
    const picked = pickShopPictureMediaIds([{ place_id: "b", logo_media_id: null }], []);
    expect(picked.has("b")).toBe(false);
    expect(picked.size).toBe(0);
  });
});
