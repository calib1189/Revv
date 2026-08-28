"use server";

import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getModerationProvider } from "@/lib/providers/get-moderation-provider";

export interface ModerationCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Screens one image before it's allowed to publish — called from
 * compose-post-form.tsx for every photo (and, for a video post, one
 * captured frame — see features/moderation/capture-video-frame.ts)
 * before any Supabase writes happen at all, so a flagged upload never
 * creates a post/media row that would need to be rolled back.
 *
 * Fails CLOSED: if the moderation call itself errors (network issue,
 * malformed response), this throws rather than letting the post
 * through unchecked — the caller shows a "try again" error. A
 * moderation gate that quietly waves things through on its own failure
 * isn't a moderation gate.
 */
export async function moderateMediaAction(formData: FormData): Promise<ModerationCheckResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { allowed: false, reason: "Couldn't read that file." };
  }

  const bytes = await file.arrayBuffer();
  const result = await getModerationProvider().moderateImage(bytes, file.type);

  if (result.flagged) {
    return { allowed: false, reason: result.reason ?? "This doesn't meet our content guidelines." };
  }
  return { allowed: true };
}
