import type { BuildRating, RatingPhoto, RatingProvider } from "./rating-provider";
import { blendRatingScore } from "@/lib/rating/blend-score";
import { parseGeminiAnswer, postGemini } from "./gemini-request";
import { ratingPrompt } from "@/lib/rating/prompt";
import type { VehicleKind } from "@/lib/vehicles/category";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
// Several photos in one call take longer than a single-image check.
const ATTEMPT_TIMEOUT_MS = 20_000;

interface GeminiRatingResponse {
  score: number;
  strengths: string;
  limitingFactors: string;
  appearance: number;
  performance: number;
  wheelsFitment: number;
  interior: number;
  modifications: number;
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

  async rateBuild(photos: RatingPhoto[], buildSummary: string, kind: VehicleKind = "car"): Promise<BuildRating> {
    const imageParts = photos.map((photo) => ({
      inlineData: {
        mimeType: photo.mimeType,
        data: Buffer.from(photo.bytes).toString("base64"),
      },
    }));

    const body = JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${ratingPrompt(kind)}\n\nBUILD DETAILS:\n${buildSummary}` },
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
            appearance: { type: "NUMBER" },
            performance: { type: "NUMBER" },
            wheelsFitment: { type: "NUMBER" },
            interior: { type: "NUMBER" },
            modifications: { type: "NUMBER" },
          },
          required: [
            "score",
            "strengths",
            "limitingFactors",
            "appearance",
            "performance",
            "wheelsFitment",
            "interior",
            "modifications",
          ],
        },
      },
    });

    // Retried on a rate limit, brief outage or dropped connection: a
    // single failed call used to surface as an error the owner had to
    // retry by hand.
    const json = await postGemini(`${ENDPOINT}?key=${this.apiKey}`, body, {
      label: "rating",
      timeoutMs: ATTEMPT_TIMEOUT_MS,
    });
    const parsed = parseGeminiAnswer<GeminiRatingResponse>(json, "rating");

    const subscores = {
      appearance: clampScore(parsed.appearance),
      performance: clampScore(parsed.performance),
      wheelsFitment: clampScore(parsed.wheelsFitment),
      interior: clampScore(parsed.interior),
      modifications: clampScore(parsed.modifications),
    };

    return {
      // Blended with the five categories rather than taken as-is: the
      // model's own headline number clusters on a few values (see
      // blend-score.ts).
      score: blendRatingScore(parsed.score, subscores),
      strengths: parsed.strengths,
      limitingFactors: parsed.limitingFactors,
      subscores,
      isMock: false,
    };
  }
}
