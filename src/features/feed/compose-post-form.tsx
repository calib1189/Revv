"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadVideo } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { createPost } from "@/lib/db/posts";
import { addPostMedia } from "@/lib/db/post-media";
import {
  validateImageFile,
  validateVideoFile,
  validateVideoDuration,
} from "@/lib/validation/media";
import { validateCaption, validatePhotoCount } from "@/lib/validation/post";
import { trackEvent } from "@/lib/analytics/track";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { Vehicle } from "@/lib/db/vehicles";

type Mode = "photo" | "video";

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

interface SelectedVideo {
  file: File;
  previewUrl: string;
}

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video."));
    };
    video.src = url;
  });
}

export function ComposePostForm({
  userId,
  vehicles,
}: {
  userId: string;
  vehicles: Vehicle[];
}) {
  const [mode, setMode] = useState<Mode>("photo");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [caption, setCaption] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function switchMode(next: Mode) {
    setError(null);
    setMode(next);
    if (next === "photo" && video) {
      URL.revokeObjectURL(video.previewUrl);
      setVideo(null);
    }
    if (next === "video" && photos.length > 0) {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      setPhotos([]);
    }
  }

  function handleSelectPhotos(files: FileList) {
    const next: SelectedPhoto[] = [...photos];
    for (const file of Array.from(files)) {
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSelectVideo(file: File) {
    setError(null);
    const fileError = validateVideoFile(file);
    if (fileError) return setError(fileError);

    try {
      const durationSeconds = await readVideoDurationSeconds(file);
      const durationError = validateVideoDuration(durationSeconds);
      if (durationError) return setError(durationError);
    } catch {
      return setError("Couldn't read that video file.");
    }

    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo({ file, previewUrl: URL.createObjectURL(file) });
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "photo") {
      const photoError = validatePhotoCount(photos.length);
      if (photoError) return setError(photoError);
    } else if (!video) {
      return setError("Choose a video.");
    }
    const captionError = validateCaption(caption);
    if (captionError) return setError(captionError);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        post_type: mode,
        caption: caption.trim() || null,
      });

      if (mode === "photo") {
        let position = 0;
        for (const photo of photos) {
          const uploaded = await uploadImage(supabase, userId, photo.file);
          const media = await createMedia(supabase, {
            owner_id: userId,
            storage_path: uploaded.storagePath,
            kind: "image",
            width: uploaded.width,
            height: uploaded.height,
          });
          await addPostMedia(supabase, post.id, media.id, position);
          position += 1;
        }
      } else if (video) {
        const uploaded = await uploadVideo(supabase, userId, video.file);
        const media = await createMedia(supabase, {
          owner_id: userId,
          storage_path: uploaded.storagePath,
          kind: "video",
          width: uploaded.width,
          height: uploaded.height,
          duration_ms: uploaded.durationMs,
        });
        await addPostMedia(supabase, post.id, media.id, 0);
      }

      await trackEvent(supabase, userId, "post_created", {
        post_id: post.id,
        post_type: mode,
      });

      router.push(`/p/${post.id}`);
    } catch {
      setError("Couldn't publish that post. Try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <div className="inline-flex w-fit rounded-lg border border-border bg-surface p-1">
        {(["photo", "video"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              mode === m
                ? "bg-surface-raised text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "photo" ? (
        <div>
          <Label>Photos</Label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) handleSelectPhotos(e.target.files);
              e.target.value = "";
            }}
          />

          {photos.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => photoInputRef.current?.click()}
          >
            {photos.length > 0 ? "Add more photos" : "Choose photos"}
          </Button>
        </div>
      ) : (
        <div>
          <Label>Video</Label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSelectVideo(file);
              e.target.value = "";
            }}
          />

          {video ? (
            <div className="relative mb-3 aspect-[9/16] max-h-96 w-fit overflow-hidden rounded-lg bg-black">
              <video
                src={video.previewUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
              <button
                type="button"
                onClick={removeVideo}
                aria-label="Remove video"
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
              >
                ×
              </button>
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted">
              MP4, WebM, or MOV — up to 100MB and 3 minutes.
            </p>
          )}

          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={() => videoInputRef.current?.click()}
          >
            {video ? "Choose a different video" : "Choose video"}
          </Button>
        </div>
      )}

      {vehicles.length > 0 && (
        <div>
          <Label htmlFor="vehicle">Tag a vehicle</Label>
          <select
            id="vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none"
          >
            <option value="">None</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <Label htmlFor="caption">Caption</Label>
        <textarea
          id="caption"
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="What's the story?"
          className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
