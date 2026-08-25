"use server";

import { createClient } from "@/lib/supabase/server";
import { validateImageFile } from "@/lib/validation/media";
import { validatePrompt } from "@/lib/validation/visualization";
import { getImageGenerationProvider } from "@/lib/providers/get-image-generation-provider";
import {
  isUnderVisualizeRateLimit,
  recordVisualizeAttempt,
} from "@/lib/vehicles/visualize-rate-limit";
import type { GeneratedImage } from "@/lib/providers/image-generation-provider";

export interface GenerateVisualizationResult {
  data?: GeneratedImage;
  error?: string;
}

export async function generateVisualizationAction(
  formData: FormData,
): Promise<GenerateVisualizationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // This is the single most expensive AI call in the app (a billed
  // image-generation API, not a free-tier one) and doesn't insert into
  // any table itself, so there's no RLS policy to hang auth or a rate
  // limit off. Both have to be enforced explicitly here, same as
  // identifyVehicleAction, or this Server Action is an open,
  // unauthenticated, unlimited way to spend real money.
  if (!user) return { error: "You must be logged in." };
  if (!(await isUnderVisualizeRateLimit(supabase, user.id))) {
    return { error: "Too many visualizations — try again in a bit." };
  }

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
  try {
    await recordVisualizeAttempt(supabase, user.id);
    const data = await provider.generateVisualization(
      bytes,
      file.type,
      prompt.trim(),
    );
    return { data };
  } catch (err) {
    console.error("generateVisualizationAction failed:", err);
    return { error: "Couldn't generate that visualization. Try again." };
  }
}
