export interface GeneratedImage {
  imageBase64: string;
  mimeType: string;
  isMock: boolean;
}

export interface ImageGenerationProvider {
  generateVisualization(
    originalImageBytes: ArrayBuffer,
    mimeType: string,
    prompt: string,
  ): Promise<GeneratedImage>;
}
