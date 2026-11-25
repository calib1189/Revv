"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, uploadVideo } from "@/lib/storage/upload";
import { createMedia } from "@/lib/db/media";
import { createPost } from "@/lib/db/posts";
import { claimPostBonusAction } from "@/features/promo/actions";
import { addPostMedia } from "@/lib/db/post-media";
import {
  validateImageFile,
  validateVideoFile,
  MAX_IMAGE_BYTES,
} from "@/lib/validation/media";
import { compressImageIfNeeded } from "@/lib/validation/compress-image";
import { validateCaption, validatePhotoCount } from "@/lib/validation/post";
import { clampSoundStartMs } from "@/lib/validation/sound";
import { trackEvent } from "@/lib/analytics/track";
import { notifyCrewPostAction } from "@/features/crews/actions";
import { checkImage } from "@/features/moderation/check-image";
import { captureVideoFrame } from "@/features/moderation/capture-video-frame";
import { Callout } from "@/components/ui/callout";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { deleteSound, publicSoundUrl } from "@/lib/db/sounds";
import { createOriginalSound, extractOriginalSound } from "@/features/sounds/original-sound";
import { SoundPickerSheet } from "@/features/sounds/sound-picker-sheet";
import { VideoEditor, type EditedVideo } from "@/features/editor/video-editor";
import { CancelledError } from "@/features/editor/video-job";
import type { EditState } from "@/features/editor/types";
import { PhotoEditor, type PhotoEditState } from "@/features/editor/photo-editor";
import { CameraRecorder } from "@/features/editor/camera-recorder";
import { ClipCombiner } from "@/features/editor/clip-combiner";
import { PostComposer, type PublishState } from "@/features/feed/post-composer";
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

/** How long publishing waits on pulling a video's own audio out before
 * posting without it. The first time it loads ffmpeg, which is the slow
 * part; usually the upload alone takes longer. */
const ORIGINAL_SOUND_TIMEOUT_MS = 25000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/** Runs one file through the server-side moderation check — a photo
 * directly, or (for video) one captured frame, since there's no
 * frame-by-frame video scanning. Called before any Supabase writes
 * happen, so a flagged upload never leaves a post/media row that would
 * need to be cleaned up. */
async function checkMedia(file: File): Promise<{ allowed: boolean; reason?: string }> {
  return checkImage(file);
}

export function ComposePostForm({
  userId,
  username,
  vehicles,
  crews,
  initialSound = null,
  initialSoundUrl = null,
}: {
  userId: string;
  /** Where the finished post opens — the author's own full-screen reel,
   * starting on the post that was just published. */
  username: string | null;
  vehicles: Vehicle[];
  crews: Crew[];
  /** Pre-attached when arriving via a sound's own "Use this sound" button
   * (/feed/new?soundId=X) — skips the picker, shows the chip immediately. */
  initialSound?: Sound | null;
  /** Resolved on the server alongside initialSound, so the camera can
   * play it from the first frame without building a client during render. */
  initialSoundUrl?: string | null;
}) {
  const [step, setStep] = useState<Step>("camera");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [video, setVideo] = useState<SelectedVideo | null>(null);
  const [videoEditorSource, setVideoEditorSource] = useState<File | null>(null);
  const [photoEditorSource, setPhotoEditorSource] = useState<File | null>(null);
  const [multiClipSources, setMultiClipSources] = useState<File[] | null>(null);
  const [caption, setCaption] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [crewId, setCrewId] = useState("");
  const [sound, setSound] = useState<Sound | null>(initialSound);
  const [soundStartMs, setSoundStartMs] = useState(0);
  /** Whether the photos went through the editor, where their sound is
   * chosen. A set picked straight from the library never does. */
  const [photoEdited, setPhotoEdited] = useState(false);
  // The last photo through the editor, as it went in and how it was
  // edited, so Back from the post screen can reopen that edit.
  const photoEditRef = useRef<{ source: File; state: PhotoEditState } | null>(null);
  const [resumePhoto, setResumePhoto] = useState<PhotoEditState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publish, setPublish] = useState<PublishState | null>(null);
  // The edited video while it renders in the background, and how far
  // along it is (null once it's done, or when there's none).
  const [videoEdit, setVideoEdit] = useState<EditedVideo | null>(null);
  const videoEditRef = useRef<EditedVideo | null>(null);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  // An edit being picked back up from the post screen.
  const [resumeEdit, setResumeEdit] = useState<{ state: EditState; sound: Sound | null } | null>(null);
  const [cameraSoundPickerOpen, setCameraSoundPickerOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);
  // Resolved once per sound rather than on every render of the camera.
  const [soundUrl, setSoundUrl] = useState<string | null>(initialSoundUrl);
  const router = useRouter();

  const mode: "photo" | "video" | null = video || videoEdit ? "video" : photos.length > 0 ? "photo" : null;
  const editorOpen = Boolean(videoEditorSource || photoEditorSource || multiClipSources);

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
    setSoundUrl(next ? publicSoundUrl(createBrowserClient(), next.storage_path) : null);
  }

  function clearVideo() {
    if (video) URL.revokeObjectURL(video.previewUrl);
    setVideo(null);
    const edit = videoEditRef.current;
    if (edit) {
      edit.job.cancel();
      if (edit.cover) URL.revokeObjectURL(edit.cover);
    }
    videoEditRef.current = null;
    setVideoEdit(null);
    setVideoProgress(null);
    setVideoError(null);
  }

  /** Back from the post screen: a video goes back into its edit, as it
   * was; anything else goes back to the camera. */
  function backFromCompose() {
    const edit = videoEditRef.current;
    if (edit) {
      setResumeEdit({ state: edit.state, sound: edit.sound });
      setVideoEditorSource(edit.source);
      clearVideo();
    } else if (photoEdited && photos.length === 1 && photoEditRef.current) {
      // A single edited photo goes back into its edit too.
      setResumePhoto(photoEditRef.current.state);
      setPhotoEditorSource(photoEditRef.current.source);
      clearPhotos();
    }
    setStep("camera");
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setPhotoEdited(false);
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
    if (next.length === 0) {
      setPhotoEdited(false);
      setStep("camera");
    }
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

  function handleVideoEditorDone(result: EditedVideo) {
    setVideoEditorSource(null);
    setResumeEdit(null);
    setError(null);
    // A video's sound is chosen in the editor, where it gets mixed into
    // the file itself. What comes back here is only the catalog row to
    // credit the post to.
    setSound(result.sound);
    setSoundStartMs(result.sound ? result.soundStartMs : 0);
    setSoundUrl(result.sound ? publicSoundUrl(createBrowserClient(), result.sound.storage_path) : null);
    clearPhotos();
    clearVideo();

    // On to the post screen straight away; the file finishes behind it.
    videoEditRef.current = result;
    setVideoEdit(result);
    setVideoProgress(result.job.progress());
    const off = result.job.onProgress((p) => {
      if (videoEditRef.current === result) setVideoProgress(p);
    });
    result.job.result
      .then((file) => {
        off();
        if (videoEditRef.current !== result) return;
        const fileError = validateVideoFile(file);
        if (fileError) {
          setVideoError(fileError);
          setVideoProgress(null);
          return;
        }
        setVideo({ file, previewUrl: URL.createObjectURL(file) });
        setVideoProgress(null);
      })
      .catch((err: unknown) => {
        off();
        if (videoEditRef.current !== result || err instanceof CancelledError) return;
        const detail = err instanceof Error ? err.message : String(err);
        setVideoError(`Couldn't finish your video. (${detail}) Go back to the editor and try again.`);
        setVideoProgress(null);
      });
    setStep("compose");
  }

  async function handlePhotoEditorExported(
    rawFile: File,
    editorSound: Sound | null,
    editorSoundStartMs: number,
    editState: PhotoEditState,
  ) {
    if (photoEditorSource) photoEditRef.current = { source: photoEditorSource, state: editState };
    setPhotoEditorSource(null);
    setResumePhoto(null);
    setError(null);
    // A photo's sound is chosen in the editor too, and played beside the
    // photo at view time.
    setSound(editorSound);
    setSoundStartMs(editorSound ? editorSoundStartMs : 0);
    setSoundUrl(editorSound ? publicSoundUrl(createBrowserClient(), editorSound.storage_path) : null);
    setPhotoEdited(true);
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
    } else if (mode === "video" && !video && !videoEdit) {
      return setError("Add a video.");
    } else if (!mode) {
      return setError("Record or import a photo or video first.");
    }
    const finalCaption = caption.trim();
    const captionError = validateCaption(finalCaption);
    if (captionError) return setError(captionError);

    // A video still finishing in the background is waited for here.
    let videoFile = video?.file ?? null;
    const edit = videoEditRef.current;
    if (mode === "video" && !videoFile && edit) {
      setPublish({ stage: "finishing", done: 0, total: 1, ratio: edit.job.progress() });
      const off = edit.job.onProgress((ratio) => setPublish({ stage: "finishing", done: 0, total: 1, ratio }));
      try {
        videoFile = await edit.job.result;
      } catch (err) {
        off();
        setPublish(null);
        if (err instanceof CancelledError) return;
        setError("Couldn't finish your video. Go back to the editor and try again.");
        return;
      }
      off();
      const fileError = validateVideoFile(videoFile);
      if (fileError) {
        setPublish(null);
        return setError(fileError);
      }
    }

    setPublish({ stage: "checking", done: 0, total: mode === "photo" ? photos.length : 1 });
    try {
      // Screened before anything gets written — a flagged photo or video
      // never creates a post/media row at all, so there's nothing to roll
      // back on rejection.
      if (mode === "photo") {
        for (const photo of photos) {
          const check = await checkMedia(photo.file);
          if (!check.allowed) {
            setError(check.reason ?? "This photo doesn't meet our content guidelines.");
            setPublish(null);
            return;
          }
        }
      } else if (videoFile) {
        const frame = await captureVideoFrame(videoFile);
        const check = await checkMedia(frame);
        if (!check.allowed) {
          setError(check.reason ?? "This video doesn't meet our content guidelines.");
          setPublish(null);
          return;
        }
      }

      const supabase = createClient();

      // A video with its own audio, rather than a library sound, gets
      // that audio turned into a sound others can use. Pulled out while
      // the video uploads; anything going wrong just posts it without one.
      const originalAudio =
        mode === "video" && videoFile && !sound
          ? withTimeout(extractOriginalSound(videoFile), ORIGINAL_SOUND_TIMEOUT_MS).catch(() => null)
          : Promise.resolve(null);

      // Every byte is uploaded and every media row created BEFORE the
      // post row exists. The order used to be the other way round, which
      // meant a failure partway through publishing — one photo of three
      // failing to upload, the connection dropping — left a post already
      // visible in the feed with no media attached to it and no way for
      // the author to finish it. An upload that fails now leaves only
      // orphaned media rows, which nothing renders.
      const mediaIds: string[] = [];
      const total = mode === "photo" ? photos.length : 1;
      setPublish({ stage: "uploading", done: 0, total });
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
          setPublish({ stage: "uploading", done: mediaIds.length, total });
        }
      } else if (videoFile) {
        const uploaded = await uploadVideo(supabase, userId, videoFile, (ratio) =>
          setPublish({ stage: "uploading", done: 0, total: 1, ratio }),
        );
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

      setPublish({ stage: "publishing", done: total, total });
      const audio = await originalAudio;
      const originalSound = audio
        ? await createOriginalSound(supabase, userId, username, audio).catch(() => null)
        : null;
      const post = await createPost(supabase, {
        author_id: userId,
        vehicle_id: vehicleId || null,
        crew_id: crewId || null,
        sound_id: sound?.id || originalSound?.id || null,
        sound_start_ms: sound ? clampSoundStartMs(soundStartMs, sound.duration_ms) : 0,
        post_type: mode!,
        caption: finalCaption || null,
      }).catch(async (err: unknown) => {
        // No post to hold it, so no sound either.
        if (originalSound) await deleteSound(supabase, originalSound.id).catch(() => {});
        throw err;
      });

      for (let position = 0; position < mediaIds.length; position += 1) {
        await addPostMedia(supabase, post.id, mediaIds[position], position);
      }

      await trackEvent(supabase, userId, "post_created", {
        post_id: post.id,
        post_type: mode!,
      });

      // Fire-and-forget, deliberately not awaited: this is a notification
      // to OTHER crew members, not something the poster needs to wait on
      // — the post itself already published successfully above.
      if (crewId) void notifyCrewPostAction(crewId, post.id);

      // The weekend post bonus, when it applies: shown on the finished
      // state, and held a little longer so it registers.
      const bonusPoints = await claimPostBonusAction(post.id);
      setPublish({ stage: "done", done: total, total, bonusPoints });
      // A beat on the finished state so "Posted" actually registers, then
      // straight into the post itself. replace, not push: Back from the
      // new post shouldn't land on an empty composer.
      await new Promise((resolve) => setTimeout(resolve, bonusPoints > 0 ? 1600 : 650));
      router.replace(username ? `/u/${username}/reel/${post.id}` : `/p/${post.id}`);
    } catch {
      setError("Couldn't publish that post. Check your connection and try again.");
      setPublish(null);
    }
  }

  return (
    // One fixed layer for the whole flow, above every bit of app chrome,
    // and opted out of the edge swipe-back: a stray swipe from the edge
    // mid-recording shouldn't throw the clip away.
    <div data-no-edge-swipe className="fixed inset-0 z-[60] bg-black">
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
        ref={addPhotosInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleSelectPhotos(e.target.files);
          e.target.value = "";
        }}
      />

      {step === "camera" && (
        <>
          <CameraRecorder
            suspended={editorOpen}
            onClose={() => router.back()}
            onCaptured={handleCameraCaptured}
            onImportRequested={() => importInputRef.current?.click()}
            soundTitle={sound?.title ?? null}
            soundUrl={soundUrl}
            onSoundRequested={() => setCameraSoundPickerOpen(true)}
            onSoundCleared={() => handleSoundChange(null)}
          />
          {error && (
            <div className="animate-rise-in fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-[65]">
              <Callout tone="danger">{error}</Callout>
            </div>
          )}
          {cameraSoundPickerOpen && (
            <SoundPickerSheet
              onSelect={(picked) => {
                handleSoundChange(picked);
                setCameraSoundPickerOpen(false);
              }}
              onClose={() => setCameraSoundPickerOpen(false)}
            />
          )}
        </>
      )}

      {step === "compose" && mode && (
        <PostComposer
          mode={mode}
          photos={photos}
          video={video}
          videoCover={videoEdit?.cover ?? null}
          videoProgress={videoProgress}
          videoError={videoError}
          vehicles={vehicles}
          crews={crews}
          caption={caption}
          onCaptionChange={setCaption}
          vehicleId={vehicleId}
          onVehicleIdChange={setVehicleId}
          crewId={crewId}
          onCrewIdChange={setCrewId}
          sound={sound}
          soundChosenInEditor={mode === "video" || photoEdited}
          onSoundChange={handleSoundChange}
          soundStartMs={soundStartMs}
          onSoundStartMsChange={setSoundStartMs}
          onBack={backFromCompose}
          onRemovePhoto={removePhoto}
          onAddPhotos={mode === "photo" ? () => addPhotosInputRef.current?.click() : undefined}
          onSubmit={handleSubmit}
          publish={publish}
          error={error}
        />
      )}

      {videoEditorSource && (
        <VideoEditor
          source={videoEditorSource}
          initialSound={resumeEdit ? null : sound}
          initialEdit={resumeEdit}
          onCancel={() => {
            setVideoEditorSource(null);
            setResumeEdit(null);
          }}
          onDone={handleVideoEditorDone}
        />
      )}

      {photoEditorSource && (
        <PhotoEditor
          source={photoEditorSource}
          initialSound={sound}
          initialSoundStartMs={soundStartMs}
          initialState={resumePhoto}
          onCancel={() => {
            setPhotoEditorSource(null);
            setResumePhoto(null);
          }}
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
    </div>
  );
}
