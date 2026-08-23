import type { ImageGenerationProvider } from "./image-generation-provider";
import { MockImageGenerationProvider } from "./mock-image-generation-provider";

/**
 * Swap in a real implementation here once an image-generation API key is
 * configured. Until then every environment gets the mock.
 */
export function getImageGenerationProvider(): ImageGenerationProvider {
  return new MockImageGenerationProvider();
}
