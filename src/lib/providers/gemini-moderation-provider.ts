import type { ModerationResult, ModerationProvider } from "./moderation-provider";

// Same lite model as gemini-vision-provider.ts — this is a binary
// classification task, not something that needs the full model.
const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT =
  "You are a content safety filter for a car-enthusiast social app. Look " +
  "at this image and determine whether it contains sexually explicit " +
  "content, nudity, or sexual acts. Ordinary photos of people (including " +
  "at car shows, in swimwear, etc.) are NOT flagged — only flag clearly " +
  "explicit sexual content or nudity. Respond with whether this should be " +
  "blocked, a short reason if so, and your confidence from 0 to 1.";

interface GeminiModerationResponse {
  flagged: boolean;
  reason: string | null;
  confidence: number;
}

/** Statuses that mean "not right now" rather than "never" — the free
 * tier's per-minute rate limit (429) above all, since moderation shares
 * it with ratings and vehicle identification. */
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 15_000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Real moderation via the Gemini API — same free-tier-eligible vision
 * call as GeminiVisionProvider, just a different prompt/schema. Server
 * only: never import this from client code.
 */
export class GeminiModerationProvider implements ModerationProvider {
  constructor(private apiKey: string) {}

  async moderateImage(
    imageBytes: ArrayBuffer,
    mimeType: string,
  ): Promise<ModerationResult> {
    const base64 = Buffer.from(imageBytes).toString("base64");
    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            flagged: { type: "BOOLEAN" },
            reason: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
          required: ["flagged", "reason", "confidence"],
        },
      },
    });

    // A single failed call used to fail the whole upload. A rate limit, a
    // brief outage or a dropped connection gets two more tries, a beat
    // apart; each try is capped so a hung request can't hold the upload.
    let res: Response | null = null;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });
      } catch (err) {
        if (attempt === ATTEMPTS) throw err;
        await wait(attempt * 800);
        continue;
      }
      if (res.ok || !RETRYABLE_STATUSES.has(res.status) || attempt === ATTEMPTS) break;
      await wait(attempt * 800);
    }

    if (!res || !res.ok) {
      const detail = res ? `${res.status} ${await res.text()}` : "no response";
      throw new Error(`Gemini moderation request failed: ${detail}`);
    }

    const json = await res.json();
    // The verdict is whichever part carries text — not necessarily the
    // first, since a model can lead with a thinking part of its own.
    const parts: { text?: unknown; thought?: unknown }[] = json.candidates?.[0]?.content?.parts ?? [];
    const text = parts.find((part) => typeof part.text === "string" && !part.thought)?.text as
      | string
      | undefined;
    if (!text) {
      throw new Error(
        `Gemini response did not include a moderation verdict (finishReason: ${json.candidates?.[0]?.finishReason ?? "none"}).`,
      );
    }

    const parsed: GeminiModerationResponse = JSON.parse(text);

    return {
      flagged: parsed.flagged,
      reason: parsed.flagged ? parsed.reason : null,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      isMock: false,
    };
  }
}
