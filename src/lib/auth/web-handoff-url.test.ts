import { describe, expect, it } from "vitest";
import { webHandoffUrl } from "@/lib/auth/web-handoff-url";
import { SITE_URL } from "@/lib/site-url";

describe("webHandoffUrl", () => {
  it("lands on this site's callback, not Supabase's own verify page", () => {
    const url = new URL(webHandoffUrl("abc123", "/advertise/new"));
    expect(url.origin).toBe(new URL(SITE_URL).origin);
    expect(url.pathname).toBe("/auth/callback");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("magiclink");
  });

  it("carries the page's query and #fragment through intact", () => {
    const next = "/discover/shop/ChIJ_x-1?category=body&x=a b#promote";
    const url = new URL(webHandoffUrl("abc123", next));
    // A raw # or & in `next` would otherwise end the query early.
    expect(url.hash).toBe("");
    expect(url.searchParams.get("next")).toBe(next);
  });
});
