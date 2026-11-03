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
  PlayIcon,
  ShareIcon,
  CheckIcon,
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
  stage: "checking" | "uploading" | "publishing" | "done";
  /** Files uploaded so far, during "uploading". */
  done: number;
  total: number;
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
  vehicles,
  crews,
  caption,
  onCaptionChange,
  vehicleId,
  onVehicleIdChange,
  crewId,
  onCrewIdChange,
  sound,
  onSoundChange,
  soundStartMs,
  onSoundStartMsChange,
  onBack,
  onRemovePhoto,
  onAddPhotos,
  onSubmit,
  publish,
  error,
}: {
  mode: "photo" | "video";
  photos: SelectedMedia[];
  video: SelectedMedia | null;
  vehicles: Vehicle[];
  crews: Crew[];
  caption: string;
  onCaptionChange: (value: string) => void;
  vehicleId: string;
  onVehicleIdChange: (value: string) => void;
  crewId: string;
  onCrewIdChange: (value: string) => void;
  /** On a video this is read-only here: the sound was chosen in the
   * editor, where it was mixed into the exported file itself. Only a
   * photo post picks one at this stage, because a photo's sound really
   * is played by a separate audio element at view time. */
  sound: Sound | null;
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
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const tags = captionTags(caption);
  const isPublishing = publish !== null;

  const cover = mode === "photo" ? photos[0]?.previewUrl : video?.previewUrl;

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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0c0d] text-white">
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
              placeholder="Describe your post. What's done, what's next?"
              aria-label="Caption"
              className="h-[8.5rem] w-full resize-none bg-transparent text-[1.0625rem] leading-relaxed text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label="Preview your post"
            className="pressable relative h-[8.5rem] w-24 flex-shrink-0 overflow-hidden rounded-[14px] bg-white/[0.06] ring-1 ring-white/10"
          >
            {cover &&
              (mode === "video" ? (
                <video src={cover} autoPlay loop muted playsInline className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ))}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-[0.6875rem] font-semibold">
              Preview
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

        <div className="mx-4 mt-5 h-px bg-white/[0.07]" />

        <div className="flex flex-col py-2">
          <SoundRow
            mode={mode}
            sound={sound}
            soundStartMs={soundStartMs}
            onOpenPicker={() => setPickerOpen(true)}
            onOpenTrim={() => setTrimOpen(true)}
            onRemove={() => onSoundChange(null)}
          />

          {vehicles.length > 0 && (
            <ChipSection icon={<WheelIcon className="h-[18px] w-[18px]" />} label="Tag your car">
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

        {error && (
          <div className="animate-rise-in px-4 pb-4">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
      </form>

      <div className="flex flex-shrink-0 gap-2.5 border-t border-white/[0.06] bg-[#0c0c0d] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          disabled={isPublishing}
          className="pressable flex h-[52px] flex-1 items-center justify-center gap-2 rounded-full bg-white/[0.08] text-[1rem] font-semibold text-white disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" />
          Preview
        </button>
        <button
          type="submit"
          form="post-form"
          disabled={isPublishing}
          className="pressable flex h-[52px] flex-[2] items-center justify-center gap-2 rounded-full bg-accent text-[1rem] font-semibold text-white shadow-[0_12px_28px_-14px_rgb(255_68_51/0.9)] disabled:opacity-60"
        >
          <ShareIcon className="h-[18px] w-[18px] -rotate-12" />
          Post
        </button>
      </div>

      {previewOpen && cover && (
        <PostPreview
          mode={mode}
          photos={photos}
          video={video}
          caption={caption}
          onClose={() => setPreviewOpen(false)}
        />
      )}

      {publish && <PublishOverlay publish={publish} cover={cover ?? null} mode={mode} />}

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

/** A video's sound is already part of its exported audio, so this row is
 * a receipt for what the editor did rather than a control. A photo's
 * sound is genuinely attached at this stage, so it stays editable. */
function SoundRow({
  mode,
  sound,
  soundStartMs,
  onOpenPicker,
  onOpenTrim,
  onRemove,
}: {
  mode: "photo" | "video";
  sound: Sound | null;
  soundStartMs: number;
  onOpenPicker: () => void;
  onOpenTrim: () => void;
  onRemove: () => void;
}) {
  if (mode === "video") {
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
            {sound ? "Mixed into your clip in the editor" : "Add a sound from the editor"}
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
  mode,
}: {
  publish: PublishState;
  cover: string | null;
  mode: "photo" | "video";
}) {
  const fraction =
    publish.stage === "checking"
      ? 0.08
      : publish.stage === "uploading"
        ? 0.12 + 0.76 * (publish.total ? publish.done / publish.total : 0)
        : publish.stage === "publishing"
          ? 0.94
          : 1;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const label =
    publish.stage === "checking"
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
          (mode === "video" ? (
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
      <p key={label} className="animate-rise-in text-[1rem] font-semibold text-white" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
