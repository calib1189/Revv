import type { ModerationResult, ModerationProvider } from "./moderation-provider";
import { parseGeminiAnswer, postGemini } from "./gemini-request";

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

const ATTEMPT_TIMEOUT_MS = 15_000;

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

    // Retried on a rate limit, brief outage or dropped connection, so a
    // single failed call doesn't fail the whole upload.
    const json = await postGemini(`${ENDPOINT}?key=${this.apiKey}`, body, {
      label: "moderation",
      timeoutMs: ATTEMPT_TIMEOUT_MS,
    });
    const parsed = parseGeminiAnswer<GeminiModerationResponse>(json, "moderation verdict");

    return {
      flagged: parsed.flagged,
      reason: parsed.flagged ? parsed.reason : null,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      isMock: false,
    };
  }
}
