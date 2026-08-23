import type { VisionProvider } from "./vision-provider";
import { MockVisionProvider } from "./mock-vision-provider";

/**
 * Swap in a real implementation here once a vision API key is configured
 * (e.g. read process.env.VISION_PROVIDER and branch). Until then every
 * environment gets the mock, which is fine — it's clearly labeled as a
 * mock everywhere its output is shown.
 */
export function getVisionProvider(): VisionProvider {
  return new MockVisionProvider();
}
