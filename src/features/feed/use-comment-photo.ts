"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadErrorMessage } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { validateImageFile } from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";

/** Comment photos show small, so they're compressed harder than gallery
 * photos: less to upload, less to serve. */
const COMMENT_PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export type CommentPhotoState =
  | { status: "empty" }
  | { status: "uploading"; previewUrl: string }
  | { status: "ready"; previewUrl: string; mediaId: string }
  | { status: "error"; previewUrl: string | null; message: string };

/** A photo for a comment: shown at once from the file, uploaded straight
 * away in the background (screened by the same image check as posts
 * before it reaches storage) while you write a caption, so sending is
 * instant. */
export function useCommentPhoto(userId: string | null) {
  const [state, setState] = useState<CommentPhotoState>({ status: "empty" });
  // Which pick is current, so a slow upload from a photo you've since
  // swapped or removed can't land on top of the new one.
  const pickRef = useRef(0);
  const previewRef = useRef<string | null>(null);

  const revokePreview = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
  };
  useEffect(() => revokePreview, []);

  async function pick(raw: File) {
    if (!userId) return;
    const id = ++pickRef.current;
    revokePreview();
    const previewUrl = URL.createObjectURL(raw);
    previewRef.current = previewUrl;
    setState({ status: "uploading", previewUrl });
    try {
      const file = await compressImageIfNeeded(raw, COMMENT_PHOTO_MAX_BYTES);
      const invalid = validateImageFile(file);
      if (invalid) throw new Error(invalid);
      const supabase = createClient();
      const uploaded = await uploadImage(supabase, userId, file, { moderate: true });
      const media = await createMedia(supabase, {
        owner_id: userId,
        storage_path: uploaded.storagePath,
        kind: "image",
        width: uploaded.width,
        height: uploaded.height,
      });
      if (id === pickRef.current) setState({ status: "ready", previewUrl, mediaId: media.id });
    } catch (err) {
      if (id !== pickRef.current) return;
      const message = err instanceof Error && err.message.startsWith("Please") ? err.message : uploadErrorMessage(err, "Couldn't add that photo. Try again.");
      setState({ status: "error", previewUrl, message });
    }
  }

  function clear() {
    pickRef.current++;
    revokePreview();
    setState({ status: "empty" });
  }

  return { state, pick, clear };
}
