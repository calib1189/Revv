import type {
  GeneratedImage,
  ImageGenerationProvider,
} from "./image-generation-provider";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Deliberately does not generate anything — no real image model is wired
 * up. Returns the original image unchanged so the before/after and
 * share-to-post flow can be built and exercised end to end. Every call
 * site must label this as mock output; never present it as a real result.
 */
export class MockImageGenerationProvider implements ImageGenerationProvider {
  async generateVisualization(
    originalImageBytes: ArrayBuffer,
    mimeType: string,
  ): Promise<GeneratedImage> {
    await delay(1200 + Math.random() * 800);

    return {
      imageBase64: Buffer.from(originalImageBytes).toString("base64"),
      mimeType,
      isMock: true,
    };
  }
}
