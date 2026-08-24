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
import { Callout } from "@/components/ui/callout";
import { VideoEditor } from "@/features/editor/video-editor";
import { PhotoEditor } from "@/features/editor/photo-editor";
import { CameraRecorder } from "@/features/editor/camera-recorder";
import { PostComposer, parseHashtags } from "@/features/feed/post-composer";
import type { Vehicle } from "@/lib/db/vehicles";

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

interface SelectedVideo {
  file: File;
  previewUrl: string;
}

type Step = "camera" | "compose";

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
  const [step, setStep] = useState<Step>("camera");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [videoEditorSource, setVideoEditorSource] = useState<File | null>(null);
  const [photoEditorSource, setPhotoEditorSource] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
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
      const removedUrl = prev[index]?.previewUrl;
      const next = prev.filter((_, i) => i !== index);
      if (removedUrl) URL.revokeObjectURL(removedUrl);
      if (next.length === 0) setStep("camera");
      return next;
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
    setStep("compose");
  }

  function handleCameraCaptured(file: File, kind: "photo" | "video") {
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
    setStep("compose");
  }

  function handlePhotoEditorExported(file: File) {
    setPhotoEditorSource(null);
    setError(null);
    const fileError = validateImageFile(file);
    if (fileError) return setError(fileError);

    clearVideo();
    setPhotos((prev) => [...prev, { file, previewUrl: URL.createObjectURL(file) }]);
    setStep("compose");
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
    const finalCaption = [caption.trim(), parseHashtags(hashtags).join(" ")]
      .filter(Boolean)
      .join("\n\n");
    const captionError = validateCaption(finalCaption);
    if (captionError) return setError(captionError);

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        post_type: mode!,
        caption: finalCaption || null,
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
    <>
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

      {step === "camera" && (
        <>
          <CameraRecorder
            onClose={() => router.back()}
            onCaptured={handleCameraCaptured}
            onImportRequested={() => importInputRef.current?.click()}
          />
          {error && (
            <div className="fixed inset-x-4 z-[60] top-[calc(4.5rem+env(safe-area-inset-top))]">
              <Callout tone="danger">{error}</Callout>
            </div>
          )}
        </>
      )}

      {step === "compose" && mode && (
        <PostComposer
          mode={mode}
          photos={photos}
          video={video}
          vehicles={vehicles}
          caption={caption}
          onCaptionChange={setCaption}
          hashtags={hashtags}
          onHashtagsChange={setHashtags}
          vehicleId={vehicleId}
          onVehicleIdChange={setVehicleId}
          onBack={() => setStep("camera")}
          onRemovePhoto={removePhoto}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          error={error}
        />
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
    </>
  );
}
