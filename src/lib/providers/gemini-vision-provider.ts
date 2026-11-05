import { VEHICLE_CATEGORIES, isVehicleCategory } from "@/lib/vehicles/category";
import type { VehicleIdentification, VisionProvider } from "./vision-provider";
import { parseGeminiAnswer, postGemini } from "./gemini-request";

// The lite variant is ~10x faster than the full model for this task with
// equivalent accuracy in testing — worth it for a synchronous UI action.
const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ATTEMPT_TIMEOUT_MS = 15_000;

const PROMPT =
  "Identify this vehicle's model year, make, model, and trim from the photo. " +
  "Also classify it into exactly one of these categories: " +
  `${VEHICLE_CATEGORIES.join(", ")}. "cars" means an ordinary everyday car ` +
  "with no strong enthusiast identity (a daily-driven sedan/SUV/crossover) " +
  "— use it as the default when nothing more specific clearly applies. " +
  "If you cannot confidently determine a field, use null for it rather " +
  "than guessing — this includes category if the vehicle type genuinely " +
  "isn't clear from the photo. Give an overall confidence score from 0 " +
  "to 1 for your identification.";

interface GeminiIdentifyResponse {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  category: string | null;
  confidence: number;
}

/**
 * Real vision identification via the Gemini API (text/vision input is free
 * tier eligible — unlike image generation, which requires billing). Server
 * only: never import this from client code.
 */
export class GeminiVisionProvider implements VisionProvider {
  constructor(private apiKey: string) {}

  async identifyVehicle(
    imageBytes: ArrayBuffer,
    mimeType: string,
  ): Promise<VehicleIdentification> {
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
            year: { type: "INTEGER", nullable: true },
            make: { type: "STRING", nullable: true },
            model: { type: "STRING", nullable: true },
            trim: { type: "STRING", nullable: true },
            category: { type: "STRING", nullable: true },
            confidence: { type: "NUMBER" },
          },
          required: ["year", "make", "model", "trim", "category", "confidence"],
        },
      },
    });

    const json = await postGemini(`${ENDPOINT}?key=${this.apiKey}`, body, {
      label: "vision",
      timeoutMs: ATTEMPT_TIMEOUT_MS,
    });
    const parsed = parseGeminiAnswer<GeminiIdentifyResponse>(json, "vehicle identification");
    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    return {
      year: parsed.year,
      make: parsed.make,
      model: parsed.model,
      trim: parsed.trim,
      category: parsed.category && isVehicleCategory(parsed.category) ? parsed.category : null,
      confidence,
      isMock: false,
    };
  }
}
