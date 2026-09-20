"use client";

import Link from "next/link";
import { MusicIcon, PlayIcon, PauseIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import type { Sound } from "@/lib/db/sounds";

/** One row in a sound list — used both for browsing (Discover's Sounds
 * tab, a plain Link to the sound's own page) and for picking (the post
 * composer's sound sheet, an onSelect callback instead of navigating).
 * Exactly one of href/onSelect is expected to be set by the caller.
 *
 * The play control is a sibling of the link/button, never a child of it.
 * Nesting it inside was invalid HTML: React logged a hydration error on
 * every render of the picker, and a nested button's activation is left
 * to the browser to untangle — which is why tapping play could select
 * the sound instead of previewing it. */
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
  const label = (
    <>
      <p className="truncate text-sm font-medium">{sound.title}</p>
      <p className="truncate text-xs text-muted">
        {sound.artist_name || "Unknown artist"} · {formatCompactNumber(usageCount)} video
        {usageCount === 1 ? "" : "s"}
      </p>
    </>
  );

  const targetClassName =
    "flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2.5 pr-3 text-left transition-colors";

  return (
    <div className="glass-inset flex items-center gap-2 rounded-xl pl-3 transition-colors hover:bg-white/5">
      <button
        type="button"
        onClick={onTogglePlay}
        aria-label={isPlaying ? `Pause ${sound.title}` : `Play ${sound.title}`}
        className="glass-inset flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground"
      >
        {isPlaying ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
      </button>

      {href ? (
        <Link href={href} className={targetClassName}>
          <span className="min-w-0 flex-1">{label}</span>
          <MusicIcon className="h-4 w-4 flex-shrink-0 text-muted" />
        </Link>
      ) : (
        <button type="button" onClick={onSelect} className={targetClassName}>
          <span className="min-w-0 flex-1">{label}</span>
          <MusicIcon className="h-4 w-4 flex-shrink-0 text-muted" />
        </button>
      )}
    </div>
  );
}
