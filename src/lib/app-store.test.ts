import { describe, expect, it } from "vitest";
import { APP_STORE_URL, isIosUserAgent } from "@/lib/app-store";

describe("APP_STORE_URL", () => {
  it("points at SORZA's listing without pinning a country", () => {
    expect(APP_STORE_URL).toBe("https://apps.apple.com/app/id6814665400");
  });
});

describe("isIosUserAgent", () => {
  it("recognizes iPhones and iPads", () => {
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      ),
    ).toBe(true);
  });

  it("leaves Android, desktop and a missing header on the website", () => {
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36",
      ),
    ).toBe(false);
    expect(
      isIosUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
      ),
    ).toBe(false);
    expect(isIosUserAgent(null)).toBe(false);
  });
});
