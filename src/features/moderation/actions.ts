"use server";

import { requireConfirmedUser as requireUser } from "@/lib/auth/require-confirmed-user";
import { getModerationProvider } from "@/lib/providers/get-moderation-provider";

export interface ModerationCheckResult {
  allowed: boolean;
  reason?: string;
  /** The check itself couldn't run (the service errored or timed out) —
   * the photo was never judged, so trying again can work. */
  unavailable?: boolean;
}

/**
 * Screens one image before it's allowed to publish — called from
 * compose-post-form.tsx for every photo (and, for a video post, one
 * captured frame — see features/moderation/capture-video-frame.ts)
 * before any Supabase writes happen at all, so a flagged upload never
 * creates a post/media row that would need to be rolled back.
 *
 * Fails CLOSED: if the moderation call itself errors (network issue,
 * malformed response), the photo isn't let through unchecked — a
 * moderation gate that quietly waves things through on its own failure
 * isn't a moderation gate. That comes back as `unavailable` rather than
 * a throw: in production a thrown Server Action error reaches the
 * browser as an opaque digest, so every upload failure used to read the
 * same "try again" with the real cause nowhere. It's logged here instead,
 * where Vercel's function logs keep it.
 *
 * Callers send a small copy of the photo (checkCopyOf), not the photo.
 */
export async function moderateMediaAction(formData: FormData): Promise<ModerationCheckResult> {
  await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { allowed: false, reason: "Couldn't read that file." };
  }

  const bytes = await file.arrayBuffer();
  let result;
  try {
    result = await getModerationProvider().moderateImage(bytes, file.type);
  } catch (err) {
    console.error(`moderateMediaAction: check failed (${file.type}, ${file.size}B):`, err);
    return {
      allowed: false,
      unavailable: true,
      reason: "We couldn't check that photo just now. Try again in a moment.",
    };
  }

  if (result.flagged) {
    return { allowed: false, reason: result.reason ?? "This doesn't meet our content guidelines." };
  }
  return { allowed: true };
}
