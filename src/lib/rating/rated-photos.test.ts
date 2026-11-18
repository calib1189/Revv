import { describe, expect, it } from "vitest";
import { MAX_RATING_PHOTOS, ratedGalleryIds } from "./rated-photos";

const row = (id: string, mediaId = `m-${id}`, kind = "image") => ({ id, mediaId, kind });

describe("ratedGalleryIds", () => {
  it("gives the cover one of the four slots and fills the rest in gallery order", () => {
    const gallery = [row("a"), row("b"), row("c"), row("d"), row("e")];
    expect(ratedGalleryIds(gallery, "cover")).toEqual(["a", "b", "c"]);
  });

  it("uses all four slots on the gallery when there's no cover", () => {
    const gallery = [row("a"), row("b"), row("c"), row("d"), row("e")];
    expect(ratedGalleryIds(gallery, null)).toEqual(["a", "b", "c", "d"]);
  });

  it("skips videos, which the rating can't use", () => {
    const gallery = [row("a"), row("v", "m-v", "video"), row("b"), row("c"), row("d")];
    expect(ratedGalleryIds(gallery, "cover")).toEqual(["a", "b", "c"]);
  });

  it("doesn't spend a slot on the cover photo a second time", () => {
    const gallery = [row("a", "cover"), row("b"), row("c"), row("d")];
    expect(ratedGalleryIds(gallery, "cover")).toEqual(["b", "c", "d"]);
  });

  it("returns fewer when there aren't enough photos", () => {
    expect(ratedGalleryIds([row("a")], "cover")).toEqual(["a"]);
    expect(ratedGalleryIds([], null)).toEqual([]);
  });

  it("is four photos in total", () => {
    expect(MAX_RATING_PHOTOS).toBe(4);
  });
});
