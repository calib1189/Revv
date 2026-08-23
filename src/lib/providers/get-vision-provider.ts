import type { VisionProvider } from "./vision-provider";
import { MockVisionProvider } from "./mock-vision-provider";
import { GeminiVisionProvider } from "./gemini-vision-provider";

/**
 * Real provider when GEMINI_API_KEY is configured, mock otherwise — the
 * mock stays fully functional for local dev / no-key environments, and is
 * clearly labeled as a mock everywhere its output is shown.
 */
export function getVisionProvider(): VisionProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiVisionProvider(apiKey);
  return new MockVisionProvider();
}
