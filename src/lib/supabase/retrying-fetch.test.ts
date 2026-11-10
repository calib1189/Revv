import { describe, expect, it, vi } from "vitest";
import { createRetryingFetch } from "@/lib/supabase/retrying-fetch";

const ok = () => new Response("[]", { status: 200 });
const status = (code: number) => new Response("", { status: code });
const noWait = { delayMs: 0 };

describe("createRetryingFetch", () => {
  it("retries a read that hits a network error, then returns the good response", async () => {
    const base = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(ok());
    const res = await createRetryingFetch(base, noWait)("https://x.supabase.co/rest/v1/builds");
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
  });

  it("retries a read on a 5xx gateway error", async () => {
    const base = vi.fn().mockResolvedValueOnce(status(503)).mockResolvedValueOnce(status(520)).mockResolvedValueOnce(ok());
    const res = await createRetryingFetch(base, noWait)("https://x/rest/v1/a", { method: "GET" });
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it("gives up after the retries and hands back the last failure", async () => {
    const base = vi.fn().mockResolvedValue(status(502));
    const res = await createRetryingFetch(base, noWait)("https://x/rest/v1/a");
    expect(res.status).toBe(502);
    expect(base).toHaveBeenCalledTimes(3);

    const failing = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(createRetryingFetch(failing, noWait)("https://x/rest/v1/a")).rejects.toThrow("fetch failed");
    expect(failing).toHaveBeenCalledTimes(3);
  });

  it("never retries a write", async () => {
    for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
      const base = vi.fn().mockResolvedValue(status(503));
      const res = await createRetryingFetch(base, noWait)("https://x/rest/v1/a", { method, body: "{}" });
      expect(res.status).toBe(503);
      expect(base).toHaveBeenCalledTimes(1);
    }
  });

  it("doesn't retry answers that won't change (4xx) or a cancelled request", async () => {
    const notFound = vi.fn().mockResolvedValue(status(404));
    expect((await createRetryingFetch(notFound, noWait)("https://x/a")).status).toBe(404);
    expect(notFound).toHaveBeenCalledTimes(1);

    const controller = new AbortController();
    controller.abort();
    const aborted = vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError"));
    await expect(createRetryingFetch(aborted, noWait)("https://x/a", { signal: controller.signal })).rejects.toThrow();
    expect(aborted).toHaveBeenCalledTimes(1);
  });
});
