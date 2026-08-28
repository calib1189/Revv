import type { ModerationProvider } from "./moderation-provider";
import { MockModerationProvider } from "./mock-moderation-provider";
import { GeminiModerationProvider } from "./gemini-moderation-provider";

/**
 * Real provider when GEMINI_API_KEY is configured, mock otherwise — same
 * pattern as get-vision-provider.ts. The mock always passes content, so
 * local dev without a key never gets blocked from posting, but also
 * never actually screens anything — don't treat a passing mock check as
 * a real moderation pass in any environment that matters.
 */
export function getModerationProvider(): ModerationProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) return new GeminiModerationProvider(apiKey);
  return new MockModerationProvider();
}
