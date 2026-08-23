import type { VehicleIdentification, VisionProvider } from "./vision-provider";

// The lite variant is ~10x faster than the full model for this task with
// equivalent accuracy in testing — worth it for a synchronous UI action.
const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const PROMPT =
  "Identify this vehicle's model year, make, model, and trim from the photo. " +
  "If you cannot confidently determine a field, use null for it rather than guessing. " +
  "Give an overall confidence score from 0 to 1 for your identification.";

interface GeminiIdentifyResponse {
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
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
              year: { type: "INTEGER", nullable: true },
              make: { type: "STRING", nullable: true },
              model: { type: "STRING", nullable: true },
              trim: { type: "STRING", nullable: true },
              confidence: { type: "NUMBER" },
            },
            required: ["year", "make", "model", "trim", "confidence"],
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini vision request failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const text: string | undefined = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini response did not include identification data.");
    }

    const parsed: GeminiIdentifyResponse = JSON.parse(text);
    const confidence = Math.max(0, Math.min(1, parsed.confidence));

    return {
      year: parsed.year,
      make: parsed.make,
      model: parsed.model,
      trim: parsed.trim,
      confidence,
      isMock: false,
    };
  }
}
