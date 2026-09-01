"use client";

import { useState } from "react";
import { BackIcon, HashtagIcon, CloseIcon, VolumeIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import type { Vehicle } from "@/lib/db/vehicles";
import type { Crew } from "@/lib/db/crews";

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
  onBack: () => void;
  onRemovePhoto: (index: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const hashtagChips = parseHashtags(hashtags);
  // Starts muted so the background preview can autoplay the instant this
  // screen mounts — unmuted autoplay without a fresh tap gets blocked on
  // iOS. The toggle below lets you actually hear it here instead of only
  // finding out once it's posted.
  const [isMuted, setIsMuted] = useState(true);

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-black">
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
      </div>

      <div className="relative z-10 flex items-center justify-between p-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-white"
        >
          <BackIcon className="h-5 w-5" />
        </button>
        {mode === "photo" && photos.length > 1 && (
          <span className="glass rounded-full px-3 py-1.5 text-xs font-medium text-white">
            {photos.length} photos
          </span>
        )}
        {mode === "video" && (
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            aria-label={isMuted ? "Unmute preview" : "Mute preview"}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-white"
          >
            <VolumeIcon muted={isMuted} className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {mode === "photo" && photos.length > 1 && (
        <div className="no-scrollbar relative z-10 flex gap-2 overflow-x-auto px-4">
          {photos.map((photo, i) => (
            <div
              key={photo.previewUrl}
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/15"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview, not an optimizable remote asset */}
              <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePhoto(i)}
                aria-label="Remove photo"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
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
        className="glass-raised relative z-10 flex max-h-[72vh] flex-col gap-4 overflow-y-auto rounded-t-[2rem] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full bg-white/15" />

        {error && <Callout tone="danger">{error}</Callout>}

        <div>
          <Label htmlFor="caption">Caption</Label>
          <textarea
            id="caption"
            rows={3}
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="What's the story?"
            className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted transition-colors focus:border-accent/60 focus:outline-none"
          />
        </div>

        <div>
          <Label htmlFor="hashtags">Hashtags</Label>
          <div className="glass-inset flex items-center gap-2 rounded-xl px-3.5 py-2.5">
            <HashtagIcon className="h-4 w-4 shrink-0 text-muted" />
            <input
              id="hashtags"
              value={hashtags}
              onChange={(e) => onHashtagsChange(e.target.value)}
              placeholder="turbo jdm track"
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
            />
          </div>
          {hashtagChips.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hashtagChips.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {vehicles.length > 0 && (
          <div>
            <Label htmlFor="vehicle">Tag a vehicle</Label>
            <select
              id="vehicle"
              value={vehicleId}
              onChange={(e) => onVehicleIdChange(e.target.value)}
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

        {crews.length > 0 && (
          <div>
            <Label htmlFor="crew">Post to a crew</Label>
            <select
              id="crew"
              value={crewId}
              onChange={(e) => onCrewIdChange(e.target.value)}
              className="glass-inset w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
            >
              <option value="">None</option>
              {crews.map((crew) => (
                <option key={crew.id} value={crew.id}>
                  {crew.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="mt-1 w-full py-3 text-base">
          {isSubmitting ? "Publishing…" : "Publish"}
        </Button>
      </form>
    </div>
  );
}
