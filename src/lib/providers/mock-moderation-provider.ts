import type { ModerationResult, ModerationProvider } from "./moderation-provider";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliberately not connected to any real model — always passes, after a
 * short simulated delay, so local dev without GEMINI_API_KEY never gets
 * blocked from posting. Never presented to a user as a real safety
 * check (isMock: true).
 */
export class MockModerationProvider implements ModerationProvider {
  async moderateImage(): Promise<ModerationResult> {
    await delay(300 + Math.random() * 300);
    return { flagged: false, reason: null, confidence: 1, isMock: true };
  }
}
