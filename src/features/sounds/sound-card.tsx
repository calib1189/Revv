"use client";

import Link from "next/link";
import { MusicIcon, PlayIcon, PauseIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import type { Sound } from "@/lib/db/sounds";

/** One row in a sound list — used both for browsing (Discover's Sounds
 * tab, a plain Link to the sound's own page) and for picking (the post
 * composer's sound sheet, an onSelect callback instead of navigating).
 * Exactly one of href/onSelect is expected to be set by the caller. */
export function SoundCard({
  sound,
  usageCount,
  isPlaying,
  onTogglePlay,
  href,
  onSelect,
}: {
  sound: Sound;
  usageCount: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  href?: string;
  onSelect?: () => void;
}) {
  const body = (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onTogglePlay();
        }}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
        className="glass-inset flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{sound.title}</p>
        <p className="truncate text-xs text-muted">
          {sound.artist_name || "Unknown artist"} · {formatCompactNumber(usageCount)} video
          {usageCount === 1 ? "" : "s"}
        </p>
      </div>
      <MusicIcon className="h-4 w-4 flex-shrink-0 text-muted" />
    </>
  );

  const className =
    "glass-inset flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/5";

  if (href) {
    return (
      <Link href={href} className={className}>
        {body}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onSelect} className={className}>
      {body}
    </button>
  );
}
