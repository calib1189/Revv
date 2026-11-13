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
import { STORY_CAPTION_MAX, STORY_MAX_VIDEO_SECONDS } from "@/lib/stories/tray";
import { CloseIcon, GalleryIcon } from "@/components/ui/icons";

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

/** Post a story: pick a photo or video, add a line of text if you like,
 * share it for 24 hours. It's checked by the same moderation as posts
 * before anything uploads. */
export function StoryComposer({ userId }: { userId: string }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [caption, setCaption] = useState("");
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

  async function share() {
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
      const result = await createStoryAction(mediaId, caption);
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

  const busy = stage !== "idle";

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
          <input type="file" accept="image/*,video/*" className="sr-only" onChange={(e) => void handleFile(e.target.files?.[0])} />
        </label>
        <p className="text-[0.8125rem] text-muted">Videos up to {STORY_MAX_VIDEO_SECONDS} seconds.</p>
        {error && <p className="text-[0.875rem] text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8 pt-4">
      <div className="relative aspect-[9/16] max-h-[68dvh] w-full self-center overflow-hidden rounded-[22px] bg-black">
        {picked.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the picked file
          <img src={picked.previewUrl} alt="Your story" className="h-full w-full object-contain" />
        ) : (
          <video src={picked.previewUrl} className="h-full w-full object-contain" autoPlay loop muted playsInline />
        )}
        {caption.trim() && (
          <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pb-6 pt-12 text-center text-[1rem] font-medium text-white [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
            {caption.trim()}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setPicked(null);
            setCaption("");
            setError(null);
          }}
          disabled={busy}
          aria-label="Choose a different photo or video"
          className="pressable absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, STORY_CAPTION_MAX))}
        placeholder="Add a caption (optional)"
        disabled={busy}
        enterKeyHint="done"
        className="h-12 w-full rounded-2xl bg-foreground/[0.06] px-4 text-[1rem] outline-none ring-1 ring-border placeholder:text-muted focus:ring-accent"
      />

      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className="pressable h-12 w-full rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground disabled:opacity-60"
      >
        {stage === "checking" ? "Checking…" : stage === "uploading" ? "Uploading…" : stage === "sharing" ? "Sharing…" : "Share to your story"}
      </button>
      {error && <p className="text-center text-[0.875rem] text-danger">{error}</p>}
    </div>
  );
}
