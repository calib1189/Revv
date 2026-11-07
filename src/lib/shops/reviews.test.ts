import { describe, expect, it } from "vitest";
import { normalizeReviewInput, summarizeReviews } from "./reviews";

describe("summarizeReviews", () => {
  it("is empty with no reviews", () => {
    expect(summarizeReviews([])).toEqual({ count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
  });

  it("averages to one decimal and counts each star", () => {
    expect(summarizeReviews([5, 4, 4])).toEqual({
      count: 3,
      average: 4.3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 },
    });
    expect(summarizeReviews([5, 5]).average).toBe(5);
    expect(summarizeReviews([1, 2]).average).toBe(1.5);
  });

  it("ignores values outside 1-5", () => {
    expect(summarizeReviews([5, 0, 6, 3.5]).count).toBe(1);
  });
});

describe("normalizeReviewInput", () => {
  it("trims and nulls blanks", () => {
    expect(normalizeReviewInput({ rating: 5, service: "  Tint ", body: "  Great work.  " })).toEqual({
      value: { rating: 5, service: "Tint", body: "Great work." },
    });
    expect(normalizeReviewInput({ rating: 3, service: "", body: "   " })).toEqual({
      value: { rating: 3, service: null, body: null },
    });
  });

  it("rejects a missing or out-of-range rating", () => {
    expect(normalizeReviewInput({ rating: 0, service: "", body: "" })).toHaveProperty("error");
    expect(normalizeReviewInput({ rating: 6, service: "", body: "" })).toHaveProperty("error");
    expect(normalizeReviewInput({ rating: 4.5, service: "", body: "" })).toHaveProperty("error");
  });

  it("rejects text that's too long", () => {
    expect(normalizeReviewInput({ rating: 4, service: "x".repeat(41), body: "" })).toHaveProperty("error");
    expect(normalizeReviewInput({ rating: 4, service: "", body: "x".repeat(1001) })).toHaveProperty("error");
  });
});
