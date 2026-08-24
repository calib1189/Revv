import type { BuildRating, RatingProvider } from "./rating-provider";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliberately not connected to any real model — returns a plausible
 * mid-range score after a short simulated delay so the confirm UI can be
 * built and exercised before a real RatingProvider is wired up.
 */
export class MockRatingProvider implements RatingProvider {
  async rateBuild(): Promise<BuildRating> {
    await delay(900 + Math.random() * 600);

    const score = Math.round((4 + Math.random() * 4) * 10) / 10;

    return {
      score,
      strengths: "This is a mock rating — no real model reviewed your build.",
      limitingFactors: "Mock ratings don't identify real limiting factors.",
      isMock: true,
    };
  }
}
