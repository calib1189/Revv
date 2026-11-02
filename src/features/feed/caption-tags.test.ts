import { describe, expect, it } from "vitest";
import { addHashtag, captionTags, removeHashtag } from "./caption-tags";

describe("captionTags", () => {
  it("finds every tag, lower-cased, without the #", () => {
    expect([...captionTags("Fresh wheels #JDM on the #stance build")]).toEqual(["jdm", "stance"]);
  });

  it("returns nothing for a caption without tags", () => {
    expect(captionTags("just a drive").size).toBe(0);
  });
});

describe("addHashtag", () => {
  it("starts an empty caption with the tag", () => {
    expect(addHashtag("", "jdm")).toBe("#jdm");
  });

  it("appends with exactly one space, trimming trailing whitespace first", () => {
    expect(addHashtag("Sunday cruise  ", "carmeet")).toBe("Sunday cruise #carmeet");
  });

  it("accepts a tag given with its #", () => {
    expect(addHashtag("Build", "#turbo")).toBe("Build #turbo");
  });

  it("doesn't duplicate a tag that's already there in any case", () => {
    expect(addHashtag("Low #Stance", "stance")).toBe("Low #Stance");
  });
});

describe("removeHashtag", () => {
  it("removes the tag and tidies the gap", () => {
    expect(removeHashtag("Low #stance life", "stance")).toBe("Low life");
  });

  it("removes it regardless of case", () => {
    expect(removeHashtag("Build #TURBO", "turbo")).toBe("Build");
  });

  it("leaves a longer tag that merely starts the same alone", () => {
    expect(removeHashtag("#turbocharged #turbo", "turbo")).toBe("#turbocharged");
  });
});
