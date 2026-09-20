"use client";

import { useState } from "react";
import {
  BackIcon,
  HashtagIcon,
  CloseIcon,
  VolumeIcon,
  MusicIcon,
  WheelIcon,
  UsersIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { RowIcon } from "@/components/ui/grouped-list";
import { SoundPickerSheet } from "@/features/sounds/sound-picker-sheet";
import { SoundTrimSheet } from "@/features/sounds/sound-trim-sheet";
import { SOUND_CLIP_MS } from "@/lib/validation/sound";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Crew } from "@/lib/db/crews";
import type { Sound } from "@/lib/db/sounds";

function formatClock(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

interface SelectedVideo {
  file: File;
  previewUrl: string;
}

export function parseHashtags(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((t) => t.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .map((t) => `#${t}`);
}

/** Post composer: the screen you land on right after recording/importing
 * and (for a video) finishing the editor.
 *
 * The media is shown twice — once blown up and blurred as the screen's
 * own backdrop, and once contained at its true aspect ratio in front of
 * it. The backdrop means every post is composed against its own colour
 * rather than against flat black, and containing the preview is the part
 * that actually matters: the old full-bleed `object-cover` cropped the
 * preview to the phone's shape, so a 9:16 clip or a 4:5 photo was
 * composed against a frame that wasn't the one being posted. */
export function PostComposer({
  mode,
  photos,
  video,
  vehicles,
  crews,
  caption,
  onCaptionChange,
  hashtags,
  onHashtagsChange,
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
  onSubmit,
  isSubmitting,
  error,
}: {
  mode: "photo" | "video";
  photos: SelectedPhoto[];
  video: SelectedVideo | null;
  vehicles: Vehicle[];
  crews: Crew[];
  caption: string;
  onCaptionChange: (value: string) => void;
  hashtags: string;
  onHashtagsChange: (value: string) => void;
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
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [trimOpen, setTrimOpen] = useState(false);
  const hashtagChips = parseHashtags(hashtags);
  // Starts muted so the backdrop can autoplay the instant this screen
  // mounts — unmuted autoplay without a fresh tap gets blocked on iOS.
  const [isMuted, setIsMuted] = useState(true);

  const firstPreview = mode === "photo" ? photos[0]?.previewUrl : video?.previewUrl;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedCrew = crews.find((c) => c.id === crewId);
  const captionCount = caption.trim().length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black">
      {/* Ambient backdrop: the media itself, blown past the edges and
          blurred to a wash of its own colour. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {firstPreview &&
          (mode === "video" ? (
            <video
              src={firstPreview}
              autoPlay
              loop
              muted
              playsInline
              className="h-full w-full scale-[1.3] object-cover opacity-55 blur-3xl"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
            <img
              src={firstPreview}
              alt=""
              className="h-full w-full scale-[1.3] object-cover opacity-55 blur-3xl"
            />
          ))}
        <div className="absolute inset-0 bg-black/45" />
      </div>

      <div className="relative z-10 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-1 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to camera"
          className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <p className="micro-label text-center text-white/70">
          {mode === "video" ? "New clip" : photos.length > 1 ? `${photos.length} photos` : "New photo"}
        </p>
        {mode === "video" ? (
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-xl"
          >
            <VolumeIcon muted={isMuted} className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* The post as it will actually be framed. */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-8 py-3">
        {/* The frame goes on the media element itself, not a wrapper: a
            wrapper stretches to the flex line's width and letterboxes the
            media inside it, so the rounded edge stops tracing the post
            and starts tracing a box around it. */}
        {firstPreview &&
          (mode === "video" ? (
            <video
              src={firstPreview}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              className="max-h-full w-auto max-w-full rounded-[18px] object-contain shadow-[0_24px_60px_-20px_rgb(0_0_0/0.85)] ring-1 ring-white/12"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
            <img
              src={firstPreview}
              alt=""
              className="max-h-full w-auto max-w-full rounded-[18px] object-contain shadow-[0_24px_60px_-20px_rgb(0_0_0/0.85)] ring-1 ring-white/12"
            />
          ))}
      </div>

      {mode === "photo" && photos.length > 1 && (
        <div className="no-scrollbar relative z-10 flex gap-2 px-4 pb-1 overflow-x-auto">
          {photos.map((photo, i) => (
            <div
              key={photo.previewUrl}
              className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-[13px] ring-1 ring-white/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <span className="numeral absolute bottom-0.5 left-1 text-[0.625rem] text-white drop-shadow">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md"
              >
                <CloseIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="animate-sheet-up glass-raised relative z-10 flex max-h-[72vh] flex-col rounded-t-[28px]"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2.5">
          <div className="mx-auto h-[5px] w-9 shrink-0 rounded-full bg-foreground/20" />

          {error && <Callout tone="danger">{error}</Callout>}

          <div>
            <textarea
              id="caption"
              rows={3}
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Say something about this build…"
              aria-label="Caption"
              className="w-full resize-none bg-transparent text-[1.0625rem] leading-relaxed text-foreground placeholder:text-muted/70 focus:outline-none"
            />
            {hashtagChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-1">
                {hashtagChips.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-accent/12 px-2.5 py-1 text-[0.75rem] font-semibold text-accent"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="glass-inset overflow-hidden rounded-[18px] [&>*+*]:before:absolute [&>*+*]:before:left-[3.625rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
            <label htmlFor="hashtags" className="relative flex min-h-[52px] items-center gap-3 px-4">
              <RowIcon color="#0a84ff">
                <HashtagIcon />
              </RowIcon>
              <input
                id="hashtags"
                value={hashtags}
                onChange={(e) => onHashtagsChange(e.target.value)}
                placeholder="turbo jdm track"
                className="min-w-0 flex-1 bg-transparent py-3 text-[0.9375rem] text-foreground placeholder:text-muted focus:outline-none"
              />
            </label>

            {vehicles.length > 0 && (
              <label htmlFor="vehicle" className="relative flex min-h-[52px] items-center gap-3 px-4">
                <RowIcon color="#ff9f0a">
                  <WheelIcon />
                </RowIcon>
                <span className="flex-shrink-0 text-[0.9375rem]">Vehicle</span>
                <span className="min-w-0 flex-1 truncate text-right text-[0.9375rem] text-muted">
                  {selectedVehicle
                    ? selectedVehicle.nickname ||
                      `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
                    : "None"}
                </span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
                {/* The native select sits invisibly over the row so the
                    OS picker opens on tap, while the row shows the value. */}
                <select
                  id="vehicle"
                  value={vehicleId}
                  onChange={(e) => onVehicleIdChange(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="">None</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.nickname || `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {crews.length > 0 && (
              <label htmlFor="crew" className="relative flex min-h-[52px] items-center gap-3 px-4">
                <RowIcon color="#bf5af2">
                  <UsersIcon />
                </RowIcon>
                <span className="flex-shrink-0 text-[0.9375rem]">Crew</span>
                <span className="min-w-0 flex-1 truncate text-right text-[0.9375rem] text-muted">
                  {selectedCrew ? selectedCrew.name : "None"}
                </span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
                <select
                  id="crew"
                  value={crewId}
                  onChange={(e) => onCrewIdChange(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                >
                  <option value="">None</option>
                  {crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <SoundRow
              mode={mode}
              sound={sound}
              soundStartMs={soundStartMs}
              onOpenPicker={() => setPickerOpen(true)}
              onOpenTrim={() => setTrimOpen(true)}
              onRemove={() => onSoundChange(null)}
            />
          </div>
        </div>

        {/* Share stays pinned under the scrolling options, in thumb
            reach, however long the sheet gets. */}
        <div className="border-t border-border px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3">
          <Button type="submit" disabled={isSubmitting} className="h-[52px] w-full text-[1.0625rem] font-semibold">
            {isSubmitting ? "Publishing…" : captionCount > 0 ? "Share post" : "Share"}
          </Button>
        </div>
      </form>

      {pickerOpen && (
        <SoundPickerSheet
          onSelect={(selected) => {
            onSoundChange(selected);
            setPickerOpen(false);
            // Straight into picking the part — no reason to make someone
            // find their way back to a "choose this part" affordance
            // right after they just chose a sound.
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
      <div className="relative flex min-h-[52px] items-center gap-3 px-4">
        <RowIcon color="#ff375f">
          <MusicIcon />
        </RowIcon>
        <span className="flex-shrink-0 text-[0.9375rem]">Sound</span>
        <span className="min-w-0 flex-1 truncate text-right text-[0.9375rem] text-muted">
          {sound ? sound.title : "Add one in the editor"}
        </span>
      </div>
    );
  }

  if (sound) {
    return (
      <div className="relative flex min-h-[52px] items-center gap-3 px-4 py-2">
        <RowIcon color="#ff375f">
          <MusicIcon />
        </RowIcon>
        <button type="button" onClick={onOpenTrim} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[0.9375rem] font-medium">{sound.title}</p>
          <p className="numeral truncate text-[0.8125rem] text-muted">
            {sound.artist_name ? `${sound.artist_name} · ` : ""}
            {formatClock(soundStartMs)}–
            {formatClock(Math.min(sound.duration_ms, soundStartMs + SOUND_CLIP_MS))}
          </p>
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove sound"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground/10 text-muted"
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
      className="relative flex min-h-[52px] w-full items-center gap-3 px-4 text-left active:bg-foreground/[0.06]"
    >
      <RowIcon color="#ff375f">
        <MusicIcon />
      </RowIcon>
      <span className="min-w-0 flex-1 text-[0.9375rem]">Add sound</span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
    </button>
  );
}
