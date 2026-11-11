import { describe, expect, it } from "vitest";
import { parsePosterSnapshot, posterSubscores } from "@/lib/posters/snapshot";

const good = {
  carName: "1966 Ford Mustang Coupe",
  nickname: "Ruby",
  username: "calib_lawson",
  score: 91.25,
  tier: "ruby",
  subscores: { appearance: 94, performance: 90, wheelsFitment: 85, interior: 88, modifications: 93 },
  ratedAt: "2026-09-18T08:53:39.398+00:00",
  photoPath: "owner/photo.jpg",
};

describe("posterSubscores", () => {
  it("keeps all five categories", () => {
    expect(posterSubscores(good.subscores)).toEqual(good.subscores);
  });

  it("drops the row entirely when any category is missing", () => {
    expect(posterSubscores({ ...good.subscores, interior: undefined })).toBeNull();
    expect(posterSubscores(null)).toBeNull();
  });
});

describe("parsePosterSnapshot", () => {
  it("reads a stored snapshot back", () => {
    expect(parsePosterSnapshot(good)).toEqual(good);
  });

  it("treats an empty nickname as none", () => {
    expect(parsePosterSnapshot({ ...good, nickname: "" })?.nickname).toBeNull();
  });

  it("refuses a snapshot it can't print honestly", () => {
    expect(parsePosterSnapshot({ ...good, tier: "platinum-plus" })).toBeNull();
    expect(parsePosterSnapshot({ ...good, score: "91" })).toBeNull();
    expect(parsePosterSnapshot({ ...good, photoPath: "" })).toBeNull();
    expect(parsePosterSnapshot(null)).toBeNull();
    expect(parsePosterSnapshot([])).toBeNull();
  });
});

describe("posterSnapshotJson", () => {
  it("round-trips through the stored form", async () => {
    const { posterSnapshotJson } = await import("@/lib/posters/snapshot");
    expect(parsePosterSnapshot(posterSnapshotJson(parsePosterSnapshot(good)!))).toEqual(good);
  });
});
