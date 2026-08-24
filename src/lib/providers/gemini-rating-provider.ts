import type { BuildRating, RatingPhoto, RatingProvider } from "./rating-provider";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT =
  "You are rating a car build for a fun, gamified ranking feature on an " +
  "automotive social app — think of it like a video game rank, not a " +
  "professional appraisal. The photos are the primary evidence — look " +
  "closely at paint, body panels, bumpers, lights, wheels, stance, and " +
  "interior for anything custom or modified, even if it isn't itemized in " +
  "the build details below. Custom paint, custom-fabricated panels, " +
  "widebody kits, and other bodywork are major modifications — weigh them " +
  "at least as heavily as bolt-on parts. Give an honest but encouraging " +
  "score from 0 to 10 (one decimal), considering how coherent and " +
  "well-executed the build looks and how clean the car presents in the " +
  "photos. A bone-stock car isn't bad, it just scores lower than a " +
  "thoughtfully built one — but only call a car stock if the photos " +
  "actually look stock. Reserve 9+ for genuinely exceptional, heavily " +
  "customized builds and 10 for something truly showstopping — don't hand " +
  "it out easily, but don't withhold it from a build that clearly earns it " +
  "either.\n\n" +
  "Then explain the score in two parts. `strengths`: one to two sentences " +
  "naming the specific things you actually see that earned this score — " +
  "particular mods, paint quality, how coherent the theme is. " +
  "`limitingFactors`: one to two sentences naming the SPECIFIC, ACTIONABLE " +
  "things holding the score back from being higher — what looks " +
  "unfinished, inconsistent, or missing, or if the build is already " +
  "excellent, what the very highest tier would still require. Never say " +
  "something vague like 'needs more mods' without naming what kind.";

interface GeminiRatingResponse {
  score: number;
  strengths: string;
  limitingFactors: string;
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
              strengths: { type: "STRING" },
              limitingFactors: { type: "STRING" },
            },
            required: ["score", "strengths", "limitingFactors"],
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

    return {
      score,
      strengths: parsed.strengths,
      limitingFactors: parsed.limitingFactors,
      isMock: false,
    };
  }
}
