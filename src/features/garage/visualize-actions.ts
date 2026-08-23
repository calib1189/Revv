"use server";

import { validateImageFile } from "@/lib/validation/media";
import { validatePrompt } from "@/lib/validation/visualization";
import { getImageGenerationProvider } from "@/lib/providers/get-image-generation-provider";
import type { GeneratedImage } from "@/lib/providers/image-generation-provider";

export interface GenerateVisualizationResult {
  data?: GeneratedImage;
  error?: string;
}

export async function generateVisualizationAction(
  formData: FormData,
): Promise<GenerateVisualizationResult> {
  const file = formData.get("photo");
  const prompt = String(formData.get("prompt") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo first." };
  }
  const fileError = validateImageFile(file);
  if (fileError) return { error: fileError };

  const promptError = validatePrompt(prompt);
  if (promptError) return { error: promptError };

  const provider = getImageGenerationProvider();
  const bytes = await file.arrayBuffer();
  const data = await provider.generateVisualization(
    bytes,
    file.type,
    prompt.trim(),
  );
  return { data };
}
