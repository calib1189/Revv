/**
 * The one way this app calls Gemini's generateContent, shared by the
 * rating, vision and moderation providers. Server only.
 *
 * Every caller used to make a single bare fetch, so a free-tier rate
 * limit, a brief outage or a dropped connection surfaced as an error the
 * user had to retry by hand, and the answer was read from the first
 * response part, which can be a thinking part rather than the JSON.
 */

/** Statuses that mean "not right now" rather than "never": the free
 * tier's per-minute rate limit (429) above all, which every Gemini
 * feature in the app shares. */
export const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const DEFAULT_ATTEMPTS = 3;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GeminiRequestOptions {
  /** Names the feature in error messages, e.g. "rating". */
  label: string;
  /** Per-attempt cap, so one hung request can't hold the caller. */
  timeoutMs: number;
  attempts?: number;
}

/**
 * POSTs `body` to a generateContent URL and returns the parsed JSON
 * response. A retryable status or a network failure gets up to two more
 * tries, a beat apart; anything else fails at once with the status in
 * the message.
 */
export async function postGemini(url: string, body: string, options: GeminiRequestOptions): Promise<unknown> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  let res: Response | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (err) {
      if (attempt === attempts) throw err;
      await wait(attempt * 800);
      continue;
    }
    if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt === attempts) break;
    await wait(attempt * 800);
  }

  if (!res || !res.ok) {
    const detail = res ? `${res.status} ${await res.text()}` : "no response";
    throw new Error(`Gemini ${options.label} request failed: ${detail}`);
  }
  return res.json();
}

interface GeminiPart {
  text?: unknown;
  thought?: unknown;
}

interface GeminiResponseShape {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
}

/**
 * The structured answer in a generateContent response, parsed: the
 * first part that carries text and isn't a thinking part. Throws, naming
 * the finish reason, when there isn't one or it isn't valid JSON.
 */
export function parseGeminiAnswer<T>(json: unknown, label: string): T {
  const candidate = (json as GeminiResponseShape | null)?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts.find((part) => typeof part.text === "string" && !part.thought)?.text as string | undefined;
  if (!text) {
    throw new Error(
      `Gemini response did not include a ${label} (finishReason: ${candidate?.finishReason ?? "none"}).`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Gemini ${label} wasn't valid JSON (finishReason: ${candidate?.finishReason ?? "none"}).`);
  }
}
