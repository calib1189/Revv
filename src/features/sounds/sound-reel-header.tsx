import Link from "next/link";
import { MusicIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import type { Sound } from "@/lib/db/sounds";
import { SoundCredit } from "@/features/sounds/sound-credit";

/** The info bar shown at the top of a sound's own reel page (see
 * ProfileReelFeed's headerContent slot) — name/artist/usage count plus the
 * "Use this sound" deep link into the composer, pre-attaching this sound.
 * A licensed track's credit sits just under it. */
export function SoundReelHeader({ sound, usageCount }: { sound: Sound; usageCount: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="glass flex items-center gap-3 rounded-full px-3 py-2 text-white">
        <MusicIcon className="h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{sound.title}</p>
          <p className="truncate text-xs text-white/70">
            {sound.artist_name || "Unknown artist"} · {formatCompactNumber(usageCount)} video
            {usageCount === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/feed/new?soundId=${sound.id}`}
          className="flex-shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground"
        >
          Use this sound
        </Link>
      </div>
      <SoundCredit sound={sound} className="px-3 text-white/70 [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]" />
    </div>
  );
}
