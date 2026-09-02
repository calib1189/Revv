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
  "precise score from 0 to 100 with two decimal places (e.g. 87.50, " +
  "72.25, 95.75) — use the decimals for real differentiation between " +
  "similar builds rather than defaulting to whole numbers, considering " +
  "how coherent and well-executed the build looks and how clean the car " +
  "presents in the photos. A bone-stock car isn't bad, it just scores " +
  "lower than a thoughtfully built one — but only call a car stock if " +
  "the photos actually look stock. Reserve 90+ for genuinely " +
  "exceptional, heavily customized builds and 100 for something truly " +
  "showstopping — don't hand it out easily, but don't withhold it from " +
  "a build that clearly earns it either.\n\n" +
  "Then explain the score in two parts. `strengths`: one to two sentences " +
  "naming the specific things you actually see that earned this score — " +
  "particular mods, paint quality, how coherent the theme is. " +
  "`limitingFactors`: one to two sentences naming the SPECIFIC, ACTIONABLE " +
  "things holding the score back from being higher — what looks " +
  "unfinished, inconsistent, or missing, or if the build is already " +
  "excellent, what the very highest tier would still require. Never say " +
  "something vague like 'needs more mods' without naming what kind.\n\n" +
  "Finally, break your read of the build down into four independent " +
  "0-100 subscores — each is your own honest judgment of that one facet " +
  "alone, not a component that has to add up to the headline score: " +
  "`style` (design coherence, color/theme choices, how well the parts " +
  "work together visually), `execution` (fit, finish, and build " +
  "quality — how cleanly the work was done), `mods` (the scope and " +
  "ambition of the modifications themselves, stock being low here), " +
  "and `photography` (how well these specific photos show the car off — " +
  "lighting, angles, background — separate from the car itself).";

interface GeminiRatingResponse {
  score: number;
  strengths: string;
  limitingFactors: string;
  style: number;
  execution: number;
  mods: number;
  photography: number;
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
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
              style: { type: "NUMBER" },
              execution: { type: "NUMBER" },
              mods: { type: "NUMBER" },
              photography: { type: "NUMBER" },
            },
            required: [
              "score",
              "strengths",
              "limitingFactors",
              "style",
              "execution",
              "mods",
              "photography",
            ],
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

    return {
      score: clampScore(parsed.score),
      strengths: parsed.strengths,
      limitingFactors: parsed.limitingFactors,
      subscores: {
        style: clampScore(parsed.style),
        execution: clampScore(parsed.execution),
        mods: clampScore(parsed.mods),
        photography: clampScore(parsed.photography),
      },
      isMock: false,
    };
  }
}
