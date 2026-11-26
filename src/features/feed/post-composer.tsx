"use client";

import { useEffect, useRef, useState } from "react";
import {
  BackIcon,
  CloseIcon,
  HashtagIcon,
  MusicIcon,
  WheelIcon,
  UsersIcon,
  ChevronRightIcon,
  BellIcon,
  PlayIcon,
  ShareIcon,
  CheckIcon,
  DraftsIcon,
  PlusIcon,
  VolumeIcon,
} from "@/components/ui/icons";
import { Callout } from "@/components/ui/callout";
import { SoundPickerSheet } from "@/features/sounds/sound-picker-sheet";
import { SoundTrimSheet } from "@/features/sounds/sound-trim-sheet";
import { SoundCover } from "@/features/sounds/sound-cover";
import { addHashtag, captionTags, removeHashtag } from "@/features/feed/caption-tags";
import { SOUND_CLIP_MS } from "@/lib/validation/sound";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Crew } from "@/lib/db/crews";
import type { Sound } from "@/lib/db/sounds";

const MAX_CAPTION_LENGTH = 2200;

/** One-tap tags under the caption. A starting point, not a taxonomy — the
 * caption takes any tag typed into it. */
const SUGGESTED_TAGS = [
  "carsofsorza",
  "projectcar",
  "jdm",
  "euro",
  "musclecar",
  "stance",
  "turbo",
  "offroad",
  "trackday",
  "carmeet",
  "builtnotbought",
];

function formatClock(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SelectedMedia {
  file: File;
  previewUrl: string;
}

export interface PublishState {
  /** "finishing": the edited video is still rendering. */
  stage: "finishing" | "checking" | "uploading" | "publishing" | "done";
  /** Files uploaded so far, during "uploading". */
  done: number;
  total: number;
  /** 0-1 within the stage, where it can be measured (the render, a
   * video's bytes going up). */
  ratio?: number;
  /** Points a promo paid for this post (lib/promo), on "done". */
  bonusPoints?: number;
}

function vehicleName(vehicle: Vehicle): string {
  return vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

/** The post screen — the last stop after shooting and editing, laid out
 * the way TikTok's is: the caption first and biggest, the post itself as
 * a cover beside it, then the few things worth attaching (sound, car,
 * crew), and one Post button pinned in thumb reach. */
export function PostComposer({
  mode,
  photos,
  video,
  videoCover = null,
  videoProgress = null,
  videoError = null,
  vehicles,
  crews,
  caption,
  onCaptionChange,
  vehicleId,
  onVehicleIdChange,
  crewId,
  onCrewIdChange,
  sound,
  soundChosenInEditor,
  onSoundChange,
  soundStartMs,
  onSoundStartMsChange,
  onBack,
  onRemovePhoto,
  onAddPhotos,
  onSubmit,
  publish,
  error,
  canAnnounce = false,
  announce = false,
  onAnnounceChange = () => {},
  onSaveDraft,
  draftState = "idle",
}: {
  mode: "photo" | "video";
  photos: SelectedMedia[];
  /** Null while an edited video is still rendering (see videoProgress). */
  video: SelectedMedia | null;
  /** A still of the edit, shown until the video itself is ready. */
  videoCover?: string | null;
  /** 0-1 while the edited video renders; null once it's ready. */
  videoProgress?: number | null;
  videoError?: string | null;
  vehicles: Vehicle[];
  crews: Crew[];
  caption: string;
  onCaptionChange: (value: string) => void;
  vehicleId: string;
  onVehicleIdChange: (value: string) => void;
  crewId: string;
  onCrewIdChange: (value: string) => void;
  /** Read-only here when it was chosen in the editor (every video, and a
   * photo that went through the photo editor): sounds are picked while
   * editing, not on the way out. Only a photo set picked straight from
   * the library, which has no editing step, picks one on this screen. */
  sound: Sound | null;
  soundChosenInEditor: boolean;
  onSoundChange: (sound: Sound | null) => void;
  soundStartMs: number;
  onSoundStartMsChange: (startMs: number) => void;
  onBack: () => void;
  onRemovePhoto: (index: number) => void;
  /** Opens the library to add more photos to a photo post. */
  onAddPhotos?: () => void;
  onSubmit: (e: React.FormEvent) => void;
  publish: PublishState | null;
  error: string | null;
  /** The support account and admins can make this post a pop-up (0137). */
  canAnnounce?: boolean;
  announce?: boolean;
  onAnnounceChange?: (value: boolean) => void;
  /** Saves everything here as a draft on this phone. */
  onSaveDraft?: () => void;
  draftState?: "idle" | "saving" | "saved";
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const tags = captionTags(caption);
  const isPublishing = publish !== null;

  const cover = mode === "photo" ? photos[0]?.previewUrl : (video?.previewUrl ?? videoCover ?? undefined);
  const videoReady = mode !== "video" || !!video;

  function insertHashSign() {
    const el = captionRef.current;
    const next = caption.replace(/\s+$/, "") + (caption.trim() ? " #" : "#");
    onCaptionChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.length, next.length);
    });
  }

  function toggleTag(tag: string) {
    onCaptionChange(tags.has(tag) ? removeHashtag(caption, tag) : addHashtag(caption, tag));
  }

  return (
    <div className="animate-studio-in fixed inset-0 z-50 flex flex-col bg-[#0c0c0d] text-white">
      <div className="grid flex-shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center px-2 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          disabled={isPublishing}
          aria-label="Back to editing"
          className="pressable flex h-11 w-11 items-center justify-center rounded-full text-white disabled:opacity-40"
        >
          <BackIcon className="h-[22px] w-[22px]" />
        </button>
        <h1 className="text-center text-[1.0625rem] font-semibold tracking-[-0.01em]">New post</h1>
        <span />
      </div>

      <form id="post-form" onSubmit={onSubmit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Caption beside its cover — what you're saying, next to what
            you're saying it about. */}
        <div className="flex gap-3 px-4 pt-2">
          <div className="min-w-0 flex-1">
            <textarea
              ref={captionRef}
              id="caption"
              rows={5}
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              maxLength={MAX_CAPTION_LENGTH}
              placeholder="Write a caption. What's done, what's next?"
              aria-label="Caption"
              className="h-[9.5rem] w-full resize-none bg-transparent text-[1.0625rem] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!videoReady}
            aria-label={videoReady ? "Preview your post" : "Your video is finishing"}
            className="pressable relative h-[9.5rem] w-[6.75rem] flex-shrink-0 overflow-hidden rounded-[16px] bg-white/[0.06] ring-1 ring-white/10"
          >
            {cover &&
              (mode === "video" && video ? (
                <video src={cover} autoPlay loop muted playsInline className="animate-fade-in h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ))}
            {!videoReady && !videoError && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/45">
                <ProgressRing ratio={videoProgress ?? 0} />
                <span className="numeral text-[0.6875rem] font-semibold">{Math.round((videoProgress ?? 0) * 100)}%</span>
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-[0.6875rem] font-semibold">
              {videoReady ? "Preview" : videoError ? "Not finished" : "Finishing"}
            </span>
            {mode === "photo" && photos.length > 1 && (
              <span className="numeral absolute right-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[0.625rem] font-semibold backdrop-blur-md">
                1/{photos.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between px-4 pb-1 pt-2">
          <button
            type="button"
            onClick={insertHashSign}
            className="pressable flex h-8 items-center gap-1.5 rounded-full bg-white/[0.08] px-3 text-[0.8125rem] font-semibold text-white"
          >
            <HashtagIcon className="h-3.5 w-3.5" />
            Hashtags
          </button>
          <span className="numeral text-[0.75rem] text-white/35">
            {caption.length}/{MAX_CAPTION_LENGTH}
          </span>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 pt-2">
          {SUGGESTED_TAGS.map((tag) => {
            const on = tags.has(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={on}
                className={`pressable h-8 flex-shrink-0 rounded-full px-3 text-[0.8125rem] font-medium transition-colors duration-200 ${
                  on ? "bg-accent/15 text-accent ring-1 ring-accent/40" : "bg-white/[0.05] text-white/65"
                }`}
              >
                #{tag}
              </button>
            );
          })}
        </div>

        {mode === "photo" && (photos.length > 1 || onAddPhotos) && (
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-4">
            {photos.map((photo, i) => (
              <div
                key={photo.previewUrl}
                className="animate-rise-in relative h-[76px] w-[60px] flex-shrink-0 overflow-hidden rounded-[12px] ring-1 ring-white/12"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
                <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
                <span className="numeral absolute bottom-1 left-1.5 text-[0.625rem] font-semibold text-white drop-shadow">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => onRemovePhoto(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md"
                >
                  <CloseIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
            {onAddPhotos && photos.length < 10 && (
              <button
                type="button"
                onClick={onAddPhotos}
                aria-label="Add more photos"
                className="pressable flex h-[76px] w-[60px] flex-shrink-0 items-center justify-center rounded-[12px] border border-dashed border-white/25 text-white/60"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* What's attached to the post, as one grouped card. */}
        <div className="mx-4 mb-4 mt-5 flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-[18px] bg-white/[0.045] empty:hidden">
          <SoundRow
            mode={mode}
            chosenInEditor={soundChosenInEditor}
            sound={sound}
            soundStartMs={soundStartMs}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenTrim={() => setTrimOpen(true)}
            onRemove={() => onSoundChange(null)}
          />

          {vehicles.length > 0 && (
            <ChipSection icon={<WheelIcon className="h-[18px] w-[18px]" />} label="Tag your ride">
              <Chip active={vehicleId === ""} onClick={() => onVehicleIdChange("")}>
                None
              </Chip>
              {vehicles.map((v) => (
                <Chip key={v.id} active={vehicleId === v.id} onClick={() => onVehicleIdChange(v.id)}>
                  {vehicleName(v)}
                </Chip>
              ))}
            </ChipSection>
          )}

          {crews.length > 0 && (
            <ChipSection icon={<UsersIcon className="h-[18px] w-[18px]" />} label="Share to a crew">
              <Chip active={crewId === ""} onClick={() => onCrewIdChange("")}>
                None
              </Chip>
              {crews.map((c) => (
                <Chip key={c.id} active={crewId === c.id} onClick={() => onCrewIdChange(c.id)}>
                  {c.name}
                </Chip>
              ))}
            </ChipSection>
          )}
        </div>

        {canAnnounce && (
          <div className="mx-4 mb-4">
            <button
              type="button"
              role="switch"
              aria-checked={announce}
              onClick={() => onAnnounceChange(!announce)}
              className="pressable flex w-full items-center gap-3 rounded-[18px] bg-white/[0.045] px-4 py-3.5 text-left"
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                  announce ? "bg-accent/15 text-accent" : "bg-white/[0.07] text-white/70"
                }`}
              >
                <BellIcon className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-semibold">Pop-up for everyone</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-snug text-white/55">
                  Shows once to everyone who opens SORZA this week.
                </span>
              </span>
              <span
                aria-hidden
                className={`relative h-[30px] w-[50px] flex-shrink-0 rounded-full transition-colors duration-200 ${
                  announce ? "bg-accent" : "bg-white/[0.16]"
                }`}
              >
                <span
                  className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.35)] transition-transform duration-200 ease-[var(--ease-ios)] ${
                    announce ? "translate-x-[23px]" : "translate-x-[3px]"
                  }`}
                />
              </span>
            </button>
          </div>
        )}

        {(error || videoError) && (
          <div className="animate-rise-in px-4 pb-4">
            <Callout tone="danger">{error ?? videoError}</Callout>
          </div>
        )}
      </form>

      <div className="flex flex-shrink-0 gap-2.5 border-t border-white/[0.06] bg-[#0c0c0d] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        {onSaveDraft ? (
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isPublishing || draftState !== "idle"}
            className="pressable flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[1rem] font-semibold text-white disabled:opacity-60"
          >
            {draftState === "saved" ? (
              <>
                <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
                Saved
              </>
            ) : (
              <>
                <DraftsIcon className="h-[18px] w-[18px]" />
                {draftState === "saving" ? "Saving…" : "Drafts"}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={isPublishing || !videoReady}
            className="pressable flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[1rem] font-semibold text-white disabled:opacity-40"
          >
            <PlayIcon className="h-4 w-4" />
            Preview
          </button>
        )}
        <button
          type="submit"
          form="post-form"
          disabled={isPublishing || !!videoError}
          className="pressable flex h-[52px] flex-[2] items-center justify-center gap-2 rounded-full bg-accent text-[1rem] font-semibold text-white shadow-[0_12px_28px_-14px_rgb(255_68_51/0.9)] disabled:opacity-60"
        >
          <ShareIcon className="h-[18px] w-[18px] -rotate-12" />
          Post
        </button>
      </div>

      {previewOpen && cover && videoReady && (
        <PostPreview
          mode={mode}
          photos={photos}
          video={video}
          caption={caption}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {publish && <PublishOverlay publish={publish} cover={cover ?? null} isVideo={mode === "video" && !!video} />}

      {pickerOpen && (
        <SoundPickerSheet
          onSelect={(selected) => {
            onSoundChange(selected);
            setPickerOpen(false);
            // Straight into picking the part — no reason to make someone
            // find their way back to "choose this part" right after they
            // just chose a sound.
            setTrimOpen(true);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {trimOpen && sound && (
        <SoundTrimSheet
          sound={sound}
          initialStartMs={soundStartMs}
          onConfirm={(startMs) => {
            onSoundStartMsChange(startMs);
            setTrimOpen(false);
          }}
          onClose={() => setTrimOpen(false)}
        />
      )}
    </div>
  );
}

function ChipSection({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-3">
      <p className="flex items-center gap-2.5 px-4 pb-2.5 text-[0.9375rem] font-medium text-white">
        <span className="text-white/60">{icon}</span>
        {label}
      </p>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`pressable flex h-9 flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition-colors duration-200 ${
        active ? "bg-white text-black" : "bg-white/[0.07] text-white/75"
      }`}
    >
      {active && <CheckIcon className="h-3.5 w-3.5" strokeWidth={2.5} />}
      {children}
    </button>
  );
}

/** When the sound was chosen in the editor this row is a receipt for it
 * rather than a control (and a photo with none shows nothing). A photo
 * set picked straight from the library never saw an editor, so this is
 * where it gets one. */
function SoundRow({
  mode,
  chosenInEditor,
  sound,
  soundStartMs,
  onOpenPicker,
  onOpenTrim,
  onRemove,
}: {
  mode: "photo" | "video";
  chosenInEditor: boolean;
  sound: Sound | null;
  soundStartMs: number;
  onOpenPicker: () => void;
  onOpenTrim: () => void;
  onRemove: () => void;
}) {
  if (chosenInEditor) {
    if (!sound && mode === "photo") return null;
    return (
      <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
        {sound ? (
          <SoundCover seed={sound.id} size="sm" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/[0.06] text-white/60">
            <VolumeIcon className="h-[18px] w-[18px]" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-medium">{sound ? sound.title : "Original sound"}</p>
          <p className="truncate text-[0.8125rem] text-white/45">
            {sound ? (sound.artist_name ? `${sound.artist_name} · Added in the editor` : "Added in the editor") : "Your clip's own audio"}
          </p>
        </div>
      </div>
    );
  }

  if (sound) {
    return (
      <div className="flex min-h-[60px] items-center gap-3 px-4 py-2">
        <button type="button" onClick={onOpenTrim} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <SoundCover seed={sound.id} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium">{sound.title}</span>
            <span className="block tabular-nums truncate text-[0.8125rem] text-white/45">
              {sound.artist_name ? `${sound.artist_name} · ` : ""}
              {formatClock(soundStartMs)}–{formatClock(Math.min(sound.duration_ms, soundStartMs + SOUND_CLIP_MS))}
            </span>
          </span>
          <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/35" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove sound"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/70"
        >
          <CloseIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      id="sound-picker-launcher"
      type="button"
      onClick={onOpenPicker}
      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2 text-left active:bg-white/[0.04]"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/[0.06] text-white/70">
        <MusicIcon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium">Add sound</span>
        <span className="block text-[0.8125rem] text-white/45">Plays while people view your photos</span>
      </span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-white/35" />
    </button>
  );
}

/** Full-screen look at the post before it goes out — the media the way it
 * fills a phone in the feed, with the caption over it. */
function PostPreview({
  mode,
  photos,
  video,
  caption,
  onClose,
}: {
  mode: "photo" | "video";
  photos: SelectedMedia[];
  video: SelectedMedia | null;
  caption: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="animate-fade-in fixed inset-0 z-[70] bg-black">
      {mode === "video" && video ? (
        <PreviewVideo src={video.previewUrl} />
      ) : (
        <div
          ref={scrollerRef}
          onScroll={() => {
            const el = scrollerRef.current;
            if (el && el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
          className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto"
        >
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
            <img key={p.previewUrl} src={p.previewUrl} alt="" className="h-full w-full flex-shrink-0 snap-center object-cover" />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-24">
        {caption.trim() && (
          <p className="line-clamp-4 max-w-[85%] whitespace-pre-line text-[0.9375rem] leading-snug text-white">
            {caption}
          </p>
        )}
        {mode === "photo" && photos.length > 1 && (
          <div className="mt-3 flex gap-1.5">
            {photos.map((p, i) => (
              <span
                key={p.previewUrl}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? "w-4 bg-white" : "w-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="pressable absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-xl"
      >
        <CloseIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

/** The finished clip, full screen, with its sound. The preview opens from
 * a tap, but the video mounts after it, so a browser can still refuse to
 * start it with sound — and a bare `autoPlay` refused that way just sat
 * black. It plays muted instead, with a tap to bring the sound in. */
function PreviewVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundBlocked, setSoundBlocked] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.play().catch((err: unknown) => {
      if (!(err instanceof DOMException && err.name === "NotAllowedError")) return;
      el.muted = true;
      setSoundBlocked(true);
      el.play().catch(() => {});
    });
  }, [src]);

  function enableSound() {
    const el = videoRef.current;
    setSoundBlocked(false);
    if (!el) return;
    el.muted = false;
    el.play().catch(() => {});
  }

  return (
    <>
      <video ref={videoRef} src={src} loop playsInline className="h-full w-full object-cover" />
      {soundBlocked && (
        <button
          type="button"
          onClick={enableSound}
          className="pressable absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] flex h-11 items-center gap-1.5 rounded-full bg-black/40 px-4 text-[0.875rem] font-semibold text-white backdrop-blur-xl"
        >
          <VolumeIcon muted className="h-4 w-4" />
          Tap for sound
        </button>
      )}
    </>
  );
}

/** What publishing is doing, step by step, over the cover — moderation,
 * then each upload, then the post itself — so a slow connection reads as
 * progress rather than a frozen button. */
function PublishOverlay({
  publish,
  cover,
  isVideo,
}: {
  publish: PublishState;
  cover: string | null;
  /** The cover is the finished video rather than a still. */
  isVideo: boolean;
}) {
  const uploaded =
    publish.ratio !== undefined ? publish.ratio : publish.total ? publish.done / publish.total : 0;
  const fraction =
    publish.stage === "finishing"
      ? 0.3 * (publish.ratio ?? 0)
      : publish.stage === "checking"
        ? 0.33
        : publish.stage === "uploading"
          ? 0.36 + 0.56 * uploaded
          : publish.stage === "publishing"
            ? 0.95
            : 1;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const label =
    publish.stage === "finishing"
      ? "Finishing your video"
      : publish.stage === "checking"
      ? "Checking your post"
      : publish.stage === "uploading"
        ? publish.total > 1
          ? `Uploading ${Math.min(publish.done + 1, publish.total)} of ${publish.total}`
          : "Uploading"
        : publish.stage === "publishing"
          ? "Publishing"
          : "Posted";

  return (
    <div className="animate-fade-in fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-black/80 backdrop-blur-md">
      <div className="relative h-[13.5rem] w-[9.5rem] overflow-hidden rounded-[20px] ring-1 ring-white/15">
        {cover &&
          (isVideo ? (
            <video src={cover} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ))}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90" aria-hidden>
            <circle cx="42" cy="42" r={radius} fill="none" stroke="rgb(255 255 255 / 0.2)" strokeWidth="5" />
            <circle
              cx="42"
              cy="42"
              r={radius}
              fill="none"
              stroke="#ffffff"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              style={{ transition: "stroke-dashoffset 500ms var(--ease-ios)" }}
            />
          </svg>
          {publish.stage === "done" && (
            <span className="animate-like-beat absolute flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
              <CheckIcon className="h-6 w-6" strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1.5" aria-live="polite">
        <p key={label} className="animate-rise-in text-[1rem] font-semibold text-white">
          {label}
        </p>
        {publish.stage === "done" && (publish.bonusPoints ?? 0) > 0 && (
          <p className="animate-rise-in numeral text-[1.375rem] font-bold tracking-[-0.02em] text-accent">
            +{publish.bonusPoints} points
          </p>
        )}
      </div>
    </div>
  );
}

/** A small progress ring for the cover while the video finishes. */
function ProgressRing({ ratio }: { ratio: number }) {
  const r = 13;
  const c = 2 * Math.PI * r;
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="-rotate-90" aria-hidden>
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgb(255 255 255 / 0.25)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, ratio)))}
        style={{ transition: "stroke-dashoffset 300ms linear" }}
      />
    </svg>
  );
}
