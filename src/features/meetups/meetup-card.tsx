import Link from "next/link";
import Image from "next/image";
import { PinIcon, CompassIcon, TimerIcon, GemIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format/date";
import { formatDistance } from "@/lib/geo/distance";
import { MEETUP_TIERS, type Meetup, type MeetupTier } from "@/lib/db/meetups";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";

// Same silver/gold/diamond palette as components/ui/tier-picker.tsx —
// reused for color only, no functional link to the rank system.
const TIER_METAL_COLORS: Record<MeetupTier, string> = {
  standard: RANK_TEXT_COLORS.silver,
  promoted: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

export interface MeetupCardData {
  meetup: Meetup;
  hostUsername: string;
  photoUrl: string | null;
  photoCount: number;
  distanceMiles: number | null;
  /** True for the first card in the list — it's the one that ends up
   * as the page's Largest Contentful Paint, so it should load eagerly
   * instead of lazily like every card below the fold. */
  priority?: boolean;
}

export function MeetupCard({
  meetup,
  hostUsername,
  photoUrl,
  photoCount,
  distanceMiles,
  priority,
}: MeetupCardData) {
  const start = new Date(meetup.starts_at);

  return (
    <Link
      href={`/discover/${meetup.id}`}
      className="pressable glass-raised elev-2 block overflow-hidden rounded-[24px]"
    >
      <div className="relative aspect-[16/10] w-full bg-neutral-900">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 640px) 600px, 100vw"
            className="object-cover"
          />
        ) : (
          // No photo yet — every meetup still gets the same visual
          // anchor instead of a blank gap where the image would be.
          <div className="flex h-full items-center justify-center">
            <CompassIcon className="h-8 w-8 text-white/30" />
          </div>
        )}

        {/* Calendar-style date tile, the way an invite shows its day. */}
        <div
          className="absolute left-3 top-3 flex w-[52px] flex-col items-center overflow-hidden rounded-[12px] bg-white text-center shadow-lg"
          suppressHydrationWarning
        >
          <span className="w-full bg-accent py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white" suppressHydrationWarning>
            {start.toLocaleString("en-US", { month: "short" })}
          </span>
          <span className="numeral py-0.5 text-[1.375rem] leading-tight text-neutral-900" suppressHydrationWarning>
            {start.getDate()}
          </span>
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          {meetup.tier !== "standard" && (
            <span
              className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide backdrop-blur-md"
              style={{ color: TIER_METAL_COLORS[meetup.tier] }}
            >
              <GemIcon className="h-3 w-3" />
              {MEETUP_TIERS[meetup.tier].label}
            </span>
          )}
          {photoCount > 1 && (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
              +{photoCount - 1}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <p className="line-clamp-2 text-[1.1875rem] font-bold leading-snug tracking-[-0.015em]">{meetup.title}</p>

        <div className="mt-2.5 flex flex-col gap-1.5 text-[0.875rem] text-muted">
          <p className="flex items-center gap-2" suppressHydrationWarning>
            <TimerIcon className="h-4 w-4 flex-shrink-0" />
            {formatDateTime(meetup.starts_at)}
          </p>
          <p className="flex items-center gap-2">
            <PinIcon className="h-4 w-4 flex-shrink-0" />
            <span className="min-w-0 flex-1 truncate">{meetup.location_name}</span>
            {distanceMiles != null && (
              <span className="flex-shrink-0 font-semibold text-accent">{formatDistance(distanceMiles)}</span>
            )}
          </p>
        </div>

        {meetup.description && (
          <p className="mt-3 line-clamp-2 text-[0.9375rem] leading-relaxed">{meetup.description}</p>
        )}

        <p className="mt-3 border-t border-border pt-3 text-[0.8125rem] text-muted">
          Hosted by <span className="font-semibold text-foreground">@{hostUsername}</span>
        </p>
      </div>
    </Link>
  );
}
