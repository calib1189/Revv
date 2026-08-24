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
import { VideoEditor } from "@/features/editor/video-editor";
import { PhotoEditor } from "@/features/editor/photo-editor";
import { CameraRecorder } from "@/features/editor/camera-recorder";
import { CameraIcon, UploadIcon } from "@/components/ui/icons";
import type { Vehicle } from "@/lib/db/vehicles";

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
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [videoEditorSource, setVideoEditorSource] = useState<File | null>(null);
  const [photoEditorSource, setPhotoEditorSource] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [caption, setCaption] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const morePhotosInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const mode: "photo" | "video" | null = video ? "video" : photos.length > 0 ? "photo" : null;

  function clearVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  }

  function handleSelectPhotos(files: FileList) {
    setError(null);
    clearVideo();
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

  function handleImportFiles(files: FileList) {
    setError(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length === 1) {
      const file = fileArray[0];
      if (file.type.startsWith("video/")) {
        clearPhotos();
        setVideoEditorSource(file);
      } else if (file.type.startsWith("image/")) {
        setPhotoEditorSource(file);
      } else {
        setError("Choose a photo or a video.");
      }
      return;
    }

    // Multiple files at once only makes sense as a photo set — a post is
    // either one video or a set of photos, never mixed.
    const nonImages = fileArray.filter((f) => !f.type.startsWith("image/"));
    if (nonImages.length > 0) {
      setError("When picking more than one file, they all need to be photos.");
      return;
    }
    handleSelectPhotos(files);
  }

  function handleCameraCaptured(file: File, kind: "photo" | "video") {
    setIsRecording(false);
    setError(null);
    if (kind === "video") {
      clearPhotos();
      setVideoEditorSource(file);
    } else {
      setPhotoEditorSource(file);
    }
  }

  async function handleVideoEditorExported(file: File) {
    setVideoEditorSource(null);
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

    clearVideo();
    setVideo({ file, previewUrl: URL.createObjectURL(file) });
  }

  function handlePhotoEditorExported(file: File) {
    setPhotoEditorSource(null);
    setError(null);
    const fileError = validateImageFile(file);
    if (fileError) return setError(fileError);

    clearVideo();
    setPhotos((prev) => [...prev, { file, previewUrl: URL.createObjectURL(file) }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "photo") {
      const photoError = validatePhotoCount(photos.length);
      if (photoError) return setError(photoError);
    } else if (mode === "video" && !video) {
      return setError("Add a video.");
    } else if (!mode) {
      return setError("Record or import a photo or video first.");
    }
    const captionError = validateCaption(caption);
    if (captionError) return setError(captionError);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        post_type: mode!,
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
        post_type: mode!,
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

      <input
        ref={importInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleImportFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={morePhotosInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleSelectPhotos(e.target.files);
          e.target.value = "";
        }}
      />

      {mode === null && (
        <div>
          <Label>Photo or video</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIsRecording(true)}
              className="glass flex flex-col items-center gap-2 rounded-2xl py-8 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <CameraIcon className="h-6 w-6" />
              Record
            </button>
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="glass flex flex-col items-center gap-2 rounded-2xl py-8 text-sm font-medium transition-opacity hover:opacity-90"
            >
              <UploadIcon className="h-6 w-6" />
              Import from device
            </button>
          </div>
        </div>
      )}

      {mode === "photo" && (
        <div>
          <Label>Photos</Label>
          <div className="mb-3 grid grid-cols-3 gap-2">
            {photos.map((photo, i) => (
              <div key={i} className="group relative aspect-square overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              className="px-3 py-1.5 text-sm"
              onClick={() => morePhotosInputRef.current?.click()}
            >
              Add more photos
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="px-3 py-1.5 text-sm"
              onClick={clearPhotos}
            >
              Start over
            </Button>
          </div>
        </div>
      )}

      {mode === "video" && video && (
        <div>
          <Label>Video</Label>
          <div className="relative mb-3 aspect-[9/16] max-h-96 w-fit overflow-hidden rounded-lg bg-black">
            <video
              src={video.previewUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              onClick={clearVideo}
              aria-label="Remove video"
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
            >
              ×
            </button>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-1.5 text-sm"
            onClick={clearVideo}
          >
            Choose a different video
          </Button>
        </div>
      )}

      {videoEditorSource && (
        <VideoEditor
          source={videoEditorSource}
          onCancel={() => setVideoEditorSource(null)}
          onExported={handleVideoEditorExported}
        />
      )}

      {photoEditorSource && (
        <PhotoEditor
          source={photoEditorSource}
          onCancel={() => setPhotoEditorSource(null)}
          onExported={handlePhotoEditorExported}
        />
      )}

      {isRecording && <CameraRecorder onClose={() => setIsRecording(false)} onCaptured={handleCameraCaptured} />}

      {vehicles.length > 0 && (
        <div>
          <Label htmlFor="vehicle">Tag a vehicle</Label>
          <select
            id="vehicle"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
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
          className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={isSubmitting || !mode} className="self-start">
        {isSubmitting ? "Publishing…" : "Publish"}
      </Button>
    </form>
  );
}
