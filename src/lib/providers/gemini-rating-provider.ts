import type { BuildRating, RatingPhoto, RatingProvider } from "./rating-provider";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT =
  "You are rating a car build for a fun, gamified ranking feature on an " +
  "automotive social app — think of it like a video game rank, not a " +
  "professional appraisal. Look at the photos and the build details below, " +
  "then give an honest but encouraging score from 0 to 10 (one decimal), " +
  "considering how coherent and well-executed the modifications are, and " +
  "how clean the car looks in the photos. A bone-stock car isn't bad, it " +
  "just scores lower than a thoughtfully built one. Reserve 9+ for " +
  "genuinely exceptional builds and 10 for something truly showstopping — " +
  "don't hand it out easily. Give a short, specific one-to-two sentence " +
  "reason for the score.";

interface GeminiRatingResponse {
  score: number;
  summary: string;
}

/**
 * Real build rating via the Gemini API. Vision input is free-tier
 * eligible. Server only: never import this from client code.
 */
export class GeminiRatingProvider implements RatingProvider {
  constructor(private apiKey: string) {}

  async rateBuild(photos: RatingPhoto[], buildSummary: string): Promise<BuildRating> {
    const imageParts = photos.map((photo) => ({
      inlineData: {
        mimeType: photo.mimeType,
        data: Buffer.from(photo.bytes).toString("base64"),
      },
    }));

    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `${PROMPT}\n\nBUILD DETAILS:\n${buildSummary}` },
              ...imageParts,
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              summary: { type: "STRING" },
            },
            required: ["score", "summary"],
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini rating request failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini response did not include a rating.");
    }

    const parsed: GeminiRatingResponse = JSON.parse(text);
    const score = Math.round(Math.max(0, Math.min(10, parsed.score)) * 10) / 10;

    return { score, summary: parsed.summary, isMock: false };
  }
}
