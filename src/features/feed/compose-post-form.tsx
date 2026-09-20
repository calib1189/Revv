"use client";

import { useEffect, useRef, useState } from "react";
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
  MAX_IMAGE_BYTES,
} from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { validateCaption, validatePhotoCount } from "@/lib/validation/post";
import { clampSoundStartMs } from "@/lib/validation/sound";
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
import type { Crew } from "@/lib/db/crews";
import type { Sound } from "@/lib/db/sounds";

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
// video-editor.tsx's own load-metadata effect, fixed the same way.
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
      // already applied in video-editor.tsx.
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
  crews,
  initialSound = null,
}: {
  userId: string;
  vehicles: Vehicle[];
  crews: Crew[];
  /** Pre-attached when arriving via a sound's own "Use this sound" button
   * (/feed/new?soundId=X) — skips the picker, shows the chip immediately. */
  initialSound?: Sound | null;
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
  const [crewId, setCrewId] = useState("");
  const [sound, setSound] = useState<Sound | null>(initialSound);
  const [soundStartMs, setSoundStartMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const mode: "photo" | "video" | null = video ? "video" : photos.length > 0 ? "photo" : null;

  // Every preview here is a blob: URL held open by the browser until it's
  // explicitly revoked. Backing out of the composer with media selected
  // used to leak all of them for the lifetime of the tab — long sessions
  // of shooting and discarding clips added up to real memory.
  const liveUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    liveUrlsRef.current = [
      ...photos.map((p) => p.previewUrl),
      ...(video ? [video.previewUrl] : []),
    ];
  }, [photos, video]);
  useEffect(() => {
    return () => liveUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // A previously-chosen trim point is meaningless for a different (or no)
  // sound, so every real sound change — a new pick or removing it —
  // resets back to the start rather than silently carrying an offset
  // that belongs to a different track.
  function handleSoundChange(next: Sound | null) {
    setSound(next);
    setSoundStartMs(0);
  }

  function clearVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  }

  async function handleSelectPhotos(files: FileList) {
    setError(null);
    clearVideo();
    const next: SelectedPhoto[] = [...photos];
    let rejected: string | null = null;
    for (const rawFile of Array.from(files)) {
      // Caught at pick time rather than at publish: filling the tray past
      // the limit and only being told once you hit Share means redoing
      // the whole selection, and the extra previews are decoded and held
      // in memory the entire time.
      const countError = validatePhotoCount(next.length + 1);
      if (countError) {
        rejected = countError;
        break;
      }
      const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
      const fileError = validateImageFile(file);
      if (fileError) {
        rejected = fileError;
        continue;
      }
      next.push({ file, previewUrl: URL.createObjectURL(file) });
    }
    setPhotos(next);
    if (rejected) setError(rejected);
  }

  function removePhoto(index: number) {
    // Both the revoke and the step change used to live inside the
    // updater, which React is free to call more than once — the revoke
    // ran twice and the step change was a second component's state being
    // set mid-update. Computed here instead, with the updater left pure.
    const removedUrl = photos[index]?.previewUrl;
    const next = photos.filter((_, i) => i !== index);
    if (removedUrl) URL.revokeObjectURL(removedUrl);
    setPhotos(next);
    if (next.length === 0) setStep("camera");
  }

  async function handleImportFiles(files: FileList) {
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
    await handleSelectPhotos(files);
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

  async function handleVideoEditorExported(
    file: File,
    editorSound: Sound | null,
    editorSoundStartMs: number,
  ) {
    setVideoEditorSource(null);
    setError(null);
    // A video's sound is chosen in the editor, where it gets mixed into
    // the exported file itself. What comes back here is only the catalog
    // row to credit the post to.
    setSound(editorSound);
    setSoundStartMs(editorSound ? editorSoundStartMs : 0);
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

  async function handlePhotoEditorExported(rawFile: File) {
    setPhotoEditorSource(null);
    setError(null);
    const file = await compressImageIfNeeded(rawFile, MAX_IMAGE_BYTES);
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

      // Every byte is uploaded and every media row created BEFORE the
      // post row exists. The order used to be the other way round, which
      // meant a failure partway through publishing — one photo of three
      // failing to upload, the connection dropping — left a post already
      // visible in the feed with no media attached to it and no way for
      // the author to finish it. An upload that fails now leaves only
      // orphaned media rows, which nothing renders.
      const mediaIds: string[] = [];
      if (mode === "photo") {
        for (const photo of photos) {
          const uploaded = await uploadImage(supabase, userId, photo.file);
          const media = await createMedia(supabase, {
            owner_id: userId,
            storage_path: uploaded.storagePath,
            kind: "image",
            width: uploaded.width,
            height: uploaded.height,
          });
          mediaIds.push(media.id);
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
        mediaIds.push(media.id);
      }

      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        crew_id: crewId || null,
        sound_id: sound?.id || null,
        sound_start_ms: sound ? clampSoundStartMs(soundStartMs, sound.duration_ms) : 0,
        post_type: mode!,
        caption: finalCaption || null,
      });

      for (let position = 0; position < mediaIds.length; position += 1) {
        await addPostMedia(supabase, post.id, mediaIds[position], position);
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
          crews={crews}
          caption={caption}
          onCaptionChange={setCaption}
          hashtags={hashtags}
          onHashtagsChange={setHashtags}
          vehicleId={vehicleId}
          onVehicleIdChange={setVehicleId}
          crewId={crewId}
          onCrewIdChange={setCrewId}
          sound={sound}
          onSoundChange={handleSoundChange}
          soundStartMs={soundStartMs}
          onSoundStartMsChange={setSoundStartMs}
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
          initialSound={initialSound}
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
