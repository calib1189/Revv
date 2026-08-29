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
import { moderateMediaAction } from "@/features/moderation/actions";
import { captureVideoFrame } from "@/features/moderation/capture-video-frame";
import { Callout } from "@/components/ui/callout";
import { VideoEditor } from "@/features/editor/video-editor";
import { PhotoEditor } from "@/features/editor/photo-editor";
import { CameraRecorder } from "@/features/editor/camera-recorder";
import { ClipCombiner } from "@/features/editor/clip-combiner";
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

/** Runs one file through the server-side moderation check — a photo
 * directly, or (for video) one captured frame, since there's no
 * frame-by-frame video scanning. Called before any Supabase writes
 * happen, so a flagged upload never leaves a post/media row that would
 * need to be cleaned up. */
async function checkMedia(file: File): Promise<{ allowed: boolean; reason?: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return moderateMediaAction(formData);
}

// The durationchange fix-up below had no ceiling at all — if it never
// fired (for any reason: a malformed export, a device-specific decoder
// stall), this promise just hung forever with no error, no way to
// recover, and no diagnostic signal. Same class of bug as
// use-clip-combiner.ts's loadClip, fixed the same way.
const READ_DURATION_TIMEOUT_MS = 15000;

function readVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    // Real (if off-screen) size, not left fully detached from the
    // document — WebKit is documented to stop reliably decoding a
    // <video> element that was never actually attached to the page at
    // all, the same bug already found and fixed twice elsewhere in this
    // feature area (camera-recorder.tsx's preview video, video-editor.tsx's
    // decode video). This was the third instance of it, just never
    // exercised until now.
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:160px;height:160px;";
    document.body.appendChild(video);

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Timed out reading that video's duration."));
    }, READ_DURATION_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      video.remove();
    }

    video.onloadedmetadata = () => {
      if (settled) return;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const duration = video.duration;
        settled = true;
        cleanup();
        resolve(duration);
        return;
      }
      // The file being read here is always a just-exported/recorded
      // clip, which commonly reports a bogus duration (Infinity, NaN)
      // until something forces a seek near the true end — same fix
      // already applied in video-editor.tsx and use-clip-combiner.ts.
      const onFixed = () => {
        if (settled) return;
        video.removeEventListener("durationchange", onFixed);
        const duration = video.duration;
        settled = true;
        cleanup();
        resolve(duration);
      };
      video.addEventListener("durationchange", onFixed);
      video.currentTime = 1e10;
    };
    video.onerror = () => {
      if (settled) return;
      settled = true;
      // Surfaces the browser's own MediaError code/message (e.g.
      // MEDIA_ERR_SRC_NOT_SUPPORTED, MEDIA_ERR_DECODE) instead of a
      // generic string, so a report of this failure actually carries
      // real diagnostic signal instead of another dead end.
      const mediaError = video.error;
      cleanup();
      reject(
        new Error(
          mediaError
            ? `Could not read video (code ${mediaError.code}: ${mediaError.message || "no message"}).`
            : "Could not read video.",
        ),
      );
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
  const [multiClipSources, setMultiClipSources] = useState<File[] | null>(null);
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

    // Multiple videos at once means "stitch these into one clip" — the
    // record studio's own multi-segment recording already produces a
    // single combined file this same way (record, pause, record more),
    // so picking several clips from the camera roll instead of shooting
    // them in-app should end up in the same place.
    const allVideos = fileArray.every((f) => f.type.startsWith("video/"));
    if (allVideos) {
      clearPhotos();
      setMultiClipSources(fileArray);
      return;
    }

    // Otherwise, multiple files at once only makes sense as a photo set —
    // a post is either one video or a set of photos, never mixed.
    const nonImages = fileArray.filter((f) => !f.type.startsWith("image/"));
    if (nonImages.length > 0) {
      setError("When picking more than one file, they all need to be photos, or all need to be videos.");
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
    } catch (err) {
      // The real underlying reason (a MediaError code, a timeout) used
      // to be thrown away here in favor of one generic string — leaving
      // no way to tell a genuinely corrupt export apart from a device-
      // specific decoder stall from a report of "couldn't read that
      // video file" alone. File size is the cheapest possible signal for
      // which failure this actually is: a few KB means the export
      // produced next to nothing (the encoder never really ran); a
      // normal-looking size that still won't decode points at a
      // structurally broken container instead (e.g. a MediaRecorder
      // export whose finalization never completed).
      const detail = err instanceof Error ? err.message : String(err);
      const sizeKb = Math.round(file.size / 1024);
      return setError(`Couldn't read that video file. (${detail}, ${sizeKb}KB)`);
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
      // Screened before anything gets written — a flagged photo or video
      // never creates a post/media row at all, so there's nothing to roll
      // back on rejection.
      if (mode === "photo") {
        for (const photo of photos) {
          const check = await checkMedia(photo.file);
          if (!check.allowed) {
            setError(check.reason ?? "This photo doesn't meet our content guidelines.");
            setIsSubmitting(false);
            return;
          }
        }
      } else if (video) {
        const frame = await captureVideoFrame(video.file);
        const check = await checkMedia(frame);
        if (!check.allowed) {
          setError(check.reason ?? "This video doesn't meet our content guidelines.");
          setIsSubmitting(false);
          return;
        }
      }

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

      {multiClipSources && (
        <ClipCombiner
          sources={multiClipSources}
          onCancel={() => setMultiClipSources(null)}
          onCombined={(file) => {
            setMultiClipSources(null);
            setVideoEditorSource(file);
          }}
        />
      )}
    </>
  );
}
