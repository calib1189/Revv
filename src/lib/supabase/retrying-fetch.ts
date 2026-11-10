/** Gateway and server errors worth a second try: the request never got a
 * real answer (Supabase restarting, Cloudflare in front of it timing out). */
const RETRY_STATUSES = new Set([500, 502, 503, 504, 520, 521, 522, 523, 524]);

/**
 * A fetch for the Supabase clients that quietly retries reads.
 *
 * Every tab page renders all four panels (Garage, Feed, Discover,
 * Leaderboard) from dozens of reads, so one network blip or one 5xx
 * from Supabase used to throw the whole page onto "Something went
 * wrong". Reads (GET/HEAD) are safe to repeat, so they get two more
 * tries with a short pause. Writes are never retried: repeating a
 * POST could insert twice. Neither are 4xx answers (repeating them
 * gets the same answer) or a request its caller cancelled.
 */
export function createRetryingFetch(
  base: typeof fetch = fetch,
  { retries = 2, delayMs = 150 }: { retries?: number; delayMs?: number } = {},
): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (method !== "GET" && method !== "HEAD") return base(input, init);

    for (let attempt = 0; ; attempt++) {
      const last = attempt >= retries || init?.signal?.aborted;
      try {
        const res = await base(input, init);
        if (last || !RETRY_STATUSES.has(res.status)) return res;
      } catch (err) {
        if (last || init?.signal?.aborted) throw err;
      }
      if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  };
}
