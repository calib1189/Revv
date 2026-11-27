import { describe, expect, it } from "vitest";
import { normalizeHandle, normalizeWebsite, profileLinkUrl } from "./profile-links";

describe("normalizeHandle", () => {
  it("takes a bare handle, with or without @", () => {
    expect(normalizeHandle("instagram", "scopedtm")).toEqual({ value: "scopedtm" });
    expect(normalizeHandle("instagram", "  @scopedtm ")).toEqual({ value: "scopedtm" });
  });

  it("is empty when nothing is typed", () => {
    expect(normalizeHandle("tiktok", "   ")).toEqual({ value: null });
  });

  it("pulls the handle out of a pasted profile link", () => {
    expect(normalizeHandle("instagram", "https://www.instagram.com/scopedtm/?hl=en")).toEqual({ value: "scopedtm" });
    expect(normalizeHandle("tiktok", "https://www.tiktok.com/@project_zella")).toEqual({ value: "project_zella" });
    expect(normalizeHandle("youtube", "youtube.com/@bob5oh")).toEqual({ value: "bob5oh" });
    expect(normalizeHandle("snapchat", "https://www.snapchat.com/add/chrisz_z33")).toEqual({ value: "chrisz_z33" });
  });

  it("rejects a link to a different site, and characters a handle can't have", () => {
    expect(normalizeHandle("instagram", "https://evil.example/scopedtm").error).toBeTruthy();
    expect(normalizeHandle("instagram", "scoped tm").error).toBeTruthy();
    expect(normalizeHandle("tiktok", "a".repeat(25)).error).toBeTruthy();
    expect(normalizeHandle("snapchat", "1abc").error).toBeTruthy();
  });
});

describe("normalizeWebsite", () => {
  it("adds https when it's left off, and upgrades http", () => {
    expect(normalizeWebsite("scopedtm.com")).toEqual({ value: "https://scopedtm.com" });
    expect(normalizeWebsite("http://www.scopedtm.com/shop")).toEqual({ value: "https://www.scopedtm.com/shop" });
  });

  it("is empty when nothing is typed", () => {
    expect(normalizeWebsite("")).toEqual({ value: null });
  });

  it("rejects things that aren't a real web address", () => {
    expect(normalizeWebsite("javascript:alert(1)").error).toBeTruthy();
    expect(normalizeWebsite("not a site").error).toBeTruthy();
    expect(normalizeWebsite("localhost").error).toBeTruthy();
    expect(normalizeWebsite(`https://a.com/${"x".repeat(200)}`).error).toBeTruthy();
  });
});

describe("profileLinkUrl", () => {
  it("builds each platform's link from the handle", () => {
    expect(profileLinkUrl("instagram", "scopedtm")).toBe("https://www.instagram.com/scopedtm");
    expect(profileLinkUrl("tiktok", "project_zella")).toBe("https://www.tiktok.com/@project_zella");
    expect(profileLinkUrl("youtube", "bob5oh")).toBe("https://www.youtube.com/@bob5oh");
    expect(profileLinkUrl("snapchat", "chrisz_z33")).toBe("https://www.snapchat.com/add/chrisz_z33");
  });
});
