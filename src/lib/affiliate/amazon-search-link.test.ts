import { afterEach, describe, expect, it } from "vitest";
import { buildPartSearchUrl } from "./amazon-search-link";

describe("buildPartSearchUrl", () => {
  const originalTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;

  afterEach(() => {
    if (originalTag === undefined) {
      delete process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
    } else {
      process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG = originalTag;
    }
  });

  it("falls back to a plain Google search when no tag is configured", () => {
    delete process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
    expect(buildPartSearchUrl("cold air intake")).toBe(
      "https://www.google.com/search?q=cold%20air%20intake",
    );
  });

  it("builds a tagged Amazon search link once a tag is configured", () => {
    process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG = "revv-20";
    expect(buildPartSearchUrl("cold air intake")).toBe(
      "https://www.amazon.com/s?k=cold%20air%20intake&tag=revv-20",
    );
  });

  it("encodes special characters in both the query and the tag", () => {
    process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG = "revv&tag";
    expect(buildPartSearchUrl("18x9.5 +35 wheels")).toBe(
      "https://www.amazon.com/s?k=18x9.5%20%2B35%20wheels&tag=revv%26tag",
    );
  });
});
