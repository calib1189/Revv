"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadVideo } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { MAX_IMAGE_BYTES, validateImageFile, validateVideoFile } from "@/lib/validation/media";
import { checkImage } from "@/features/moderation/check-image";
import { captureVideoFrame } from "@/features/moderation/capture-video-frame";
import { createStoryAction } from "@/features/stories/actions";
import { STORY_MAX_VIDEO_SECONDS } from "@/lib/stories/tray";
import type { StoryDesign } from "@/lib/stories/design";
import { StoryEditor } from "@/features/stories/editor/story-editor";
import { GalleryIcon } from "@/components/ui/icons";

interface Picked {
  file: File;
  kind: "image" | "video";
  previewUrl: string;
}

function readVideoSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Timed out reading that video."));
    }, 15000);
    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that video."));
    };
    video.src = url;
  });
}

/** Post a story: pick a photo or video, dress it up in the story editor,
 * share it for 24 hours. It's checked by the same moderation as posts
 * before anything uploads. */
export function StoryComposer({ userId, me }: { userId: string; me: { username: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [stage, setStage] = useState<"idle" | "checking" | "uploading" | "sharing">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.previewUrl);
  }, [picked]);

  async function handleFile(raw: File | undefined) {
    if (!raw) return;
    setError(null);
    try {
      if (raw.type.startsWith("video/")) {
        const invalid = validateVideoFile(raw);
        if (invalid) return setError(invalid);
        const seconds = await readVideoSeconds(raw).catch(() => NaN);
        if (Number.isFinite(seconds) && seconds > STORY_MAX_VIDEO_SECONDS + 0.5) {
          return setError(`Stories can be up to ${STORY_MAX_VIDEO_SECONDS} seconds. Trim it and try again.`);
        }
        setPicked({ file: raw, kind: "video", previewUrl: URL.createObjectURL(raw) });
      } else {
        const file = await compressImageIfNeeded(raw, MAX_IMAGE_BYTES);
        const invalid = validateImageFile(file);
        if (invalid) return setError(invalid);
        setPicked({ file, kind: "image", previewUrl: URL.createObjectURL(file) });
      }
    } catch {
      setError("Couldn't open that file. Try a different one.");
    }
  }

  async function share(design: StoryDesign) {
    if (!picked) return;
    setError(null);
    try {
      setStage("checking");
      const still = picked.kind === "image" ? picked.file : await captureVideoFrame(picked.file);
      const check = await checkImage(still);
      if (!check.allowed) {
        setStage("idle");
        return setError(check.reason ?? "That doesn't meet our community guidelines.");
      }

      setStage("uploading");
      const supabase = createClient();
      let mediaId: string;
      if (picked.kind === "image") {
        const up = await uploadImage(supabase, userId, picked.file);
        mediaId = (await createMedia(supabase, { owner_id: userId, storage_path: up.storagePath, kind: "image", width: up.width, height: up.height })).id;
      } else {
        const up = await uploadVideo(supabase, userId, picked.file);
        mediaId = (
          await createMedia(supabase, {
            owner_id: userId,
            storage_path: up.storagePath,
            kind: "video",
            width: up.width,
            height: up.height,
            duration_ms: up.durationMs,
          })
        ).id;
      }

      setStage("sharing");
      const result = await createStoryAction(mediaId, design);
      if (!result.ok) {
        setStage("idle");
        return setError(result.error);
      }
      router.replace("/friends");
      router.refresh();
    } catch (err) {
      console.error("Story not shared:", err);
      setStage("idle");
      setError("Couldn't share your story. Check your connection and try again.");
    }
  }

  if (!picked) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-[-0.02em]">New story</h1>
          <p className="mt-2 text-[0.9375rem] text-muted">A photo or video your followers can see for 24 hours.</p>
        </div>
        <label className="pressable flex h-12 cursor-pointer items-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground">
          <GalleryIcon className="h-5 w-5" />
          Choose a photo or video
          <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              // Picking the same file again after backing out still opens it.
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-[0.8125rem] text-muted">Videos up to {STORY_MAX_VIDEO_SECONDS} seconds.</p>
        {error && <p className="text-[0.875rem] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <StoryEditor
      media={{ url: picked.previewUrl, kind: picked.kind }}
      me={me}
      sharing={stage === "checking" ? "Checking…" : stage === "uploading" ? "Uploading…" : stage === "sharing" ? "Sharing…" : null}
      error={error}
      onCancel={() => {
        setPicked(null);
        setError(null);
      }}
      onShare={(design) => void share(design)}
    />
  );
}
