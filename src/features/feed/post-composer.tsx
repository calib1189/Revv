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

export function parseHashtags(raw: string): string[] {
  return raw
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));
}

/** Post composer: the screen you land on right after recording/importing
 * and (for a video) finishing the trim/filter/text editor — full-bleed
 * media behind a frosted glass sheet, so you're composing while still
 * looking straight through at the car, not at a plain form. */
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
  sound: Sound | null;
  onSoundChange: (sound: Sound | null) => void;
  onBack: () => void;
  onRemovePhoto: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const hashtagChips = parseHashtags(hashtags);
  // Starts muted so the background preview can autoplay the instant this
  // screen mounts — unmuted autoplay without a fresh tap gets blocked on
  // iOS. The toggle below lets you actually hear it here instead of only
  // finding out once it's posted.
  const [isMuted, setIsMuted] = useState(true);

  const firstPreview = mode === "photo" ? photos[0]?.previewUrl : video?.previewUrl;
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
  const selectedCrew = crews.find((c) => c.id === crewId);
  // Inset hairline between option rows, starting at the text edge
  // (16px pad + 30px icon + 12px gap).
  const rowDivider = "absolute left-[3.625rem] right-0 top-0 h-px bg-border";

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black">
      {/* The media stays full-bleed behind everything, dimmed slightly
          so the sheet reads as the foreground. */}
      <div className="absolute inset-0">
        {mode === "video" && video && (
          <video
            src={video.previewUrl}
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="h-full w-full object-cover"
          />
        )}
        {mode === "photo" && photos[0] && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
          <img src={photos[0].previewUrl} alt="" className="h-full w-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/55 to-transparent" />
      </div>

      <div className="relative z-10 grid grid-cols-[2.5rem_1fr_2.5rem] items-center px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to camera"
          className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        <p className="text-center text-[1.0625rem] font-semibold text-white drop-shadow">New Post</p>
        {mode === "video" ? (
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            className="pressable flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl"
          >
            <VolumeIcon muted={isMuted} className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span />
        )}
      </div>

      {mode === "photo" && photos.length > 1 && (
        <div className="no-scrollbar relative z-10 flex gap-2 overflow-x-auto px-4 pt-1">
          {photos.map((photo, i) => (
            <div
              key={photo.previewUrl}
              className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-[14px] ring-2 ring-white/25"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <span className="numeral absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 text-[0.625rem] text-white">
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
        </div>
      )}

      <div className="flex-1" />

      <form
        onSubmit={onSubmit}
        className="animate-sheet-up glass-raised relative z-10 flex max-h-[76vh] flex-col rounded-t-[28px]"
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-2.5">
          <div className="mx-auto h-[5px] w-9 shrink-0 rounded-full bg-foreground/20" />

          {error && <Callout tone="danger">{error}</Callout>}

          {/* Caption beside a thumbnail of what's being posted. */}
          <div className="flex gap-3">
            {firstPreview && (
              <div className="relative h-[92px] w-[70px] flex-shrink-0 overflow-hidden rounded-[12px] bg-neutral-900">
                {mode === "video" ? (
                  <video src={firstPreview} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset
                  <img src={firstPreview} alt="" className="h-full w-full object-cover" />
                )}
              </div>
            )}
            <textarea
              id="caption"
              rows={4}
              value={caption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Write a caption…"
              aria-label="Caption"
              className="min-w-0 flex-1 resize-none bg-transparent py-1 text-[1rem] leading-relaxed text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>

          <div className="glass-inset overflow-hidden rounded-[18px]">
            <label htmlFor="hashtags" className="relative flex min-h-[50px] items-center gap-3 px-4">
              <RowIcon color="#0a84ff">
                <HashtagIcon />
              </RowIcon>
              <input
                id="hashtags"
                value={hashtags}
                onChange={(e) => onHashtagsChange(e.target.value)}
                placeholder="Hashtags: turbo jdm track"
                className="min-w-0 flex-1 bg-transparent py-3 text-foreground placeholder:text-muted focus:outline-none"
              />
            </label>

            {vehicles.length > 0 && (
              <label htmlFor="vehicle" className="relative flex min-h-[50px] items-center gap-3 px-4">
                <span className={rowDivider} />
                <RowIcon color="#ff9f0a">
                  <WheelIcon />
                </RowIcon>
                <span className="flex-shrink-0 text-[0.9375rem]">Tag vehicle</span>
                <span className="min-w-0 flex-1 truncate text-right text-[0.9375rem] text-muted">
                  {selectedVehicle
                    ? selectedVehicle.nickname || `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
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
              <label htmlFor="crew" className="relative flex min-h-[50px] items-center gap-3 px-4">
                <span className={rowDivider} />
                <RowIcon color="#bf5af2">
                  <UsersIcon />
                </RowIcon>
                <span className="flex-shrink-0 text-[0.9375rem]">Post to crew</span>
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

            {sound ? (
              <div className="relative flex min-h-[50px] items-center gap-3 px-4 py-2">
                <span className={rowDivider} />
                <RowIcon color="#ff375f">
                  <MusicIcon />
                </RowIcon>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium">{sound.title}</p>
                  {sound.artist_name && (
                    <p className="truncate text-[0.8125rem] text-muted">{sound.artist_name}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSoundChange(null)}
                  aria-label="Remove sound"
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-foreground/10 text-muted"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="sound-picker-launcher"
                type="button"
                onClick={() => setPickerOpen(true)}
                className="relative flex min-h-[50px] w-full items-center gap-3 px-4 text-left active:bg-foreground/[0.06]"
              >
                <span className={rowDivider} />
                <RowIcon color="#ff375f">
                  <MusicIcon />
                </RowIcon>
                <span className="min-w-0 flex-1 text-[0.9375rem]">Add sound</span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
              </button>
            )}
          </div>

          {hashtagChips.length > 0 && (
            <div className="-mt-1 flex flex-wrap gap-1.5 px-1">
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

        {/* Publish stays pinned under the scrolling options, in thumb
            reach, however long the sheet gets. */}
        <div className="border-t border-border px-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] pt-3">
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full text-[1rem] font-semibold">
            {isSubmitting ? "Publishing…" : "Share"}
          </Button>
        </div>
      </form>

      {pickerOpen && (
        <SoundPickerSheet
          onSelect={(selected) => {
            onSoundChange(selected);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
