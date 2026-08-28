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

    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini moderation request failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini response did not include a moderation verdict.");
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
