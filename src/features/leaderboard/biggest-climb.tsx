import Link from "next/link";
import Image from "next/image";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { LeaderboardEntry } from "@/lib/leaderboard/compose-leaderboard";

/** The day's biggest mover, called out between the podium and the list:
 * the build that climbed the most places since yesterday. It's the
 * board's one piece of news, and the proof that a re-rate can move you. */
export function BiggestClimbCard({ entry, places, rank }: { entry: LeaderboardEntry; places: number; rank: number }) {
  return (
    <Link
      href={`/garage/${entry.vehicleId}`}
      className="pressable glass-raised elev-1 flex items-center gap-3 overflow-hidden rounded-[20px] p-2.5 pr-4"
    >
      <span className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-[14px] bg-foreground/[0.06]">
        {entry.heroUrl && <Image src={entry.heroUrl} alt="" fill sizes="80px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="micro-label block" style={{ color: "var(--success)" }}>
          Biggest climb today
        </span>
        <span className="mt-0.5 block truncate text-[0.9375rem] font-semibold">{entry.vehicleTitle}</span>
        <span className="flex items-center gap-1 text-[0.8125rem] text-muted">
          <span className="truncate">@{entry.ownerUsername}</span>
          {entry.ownerIsVerified && <VerifiedBadge className="h-3 w-3 flex-shrink-0" />}
        </span>
      </span>
      <span className="flex-shrink-0 text-right">
        <span
          className="numeral flex items-center justify-end gap-1 text-[1.5rem] font-bold leading-none"
          style={{ color: "var(--success)" }}
          aria-label={`Up ${places} places`}
        >
          <svg viewBox="0 0 8 8" className="h-2.5 w-2.5" aria-hidden fill="currentColor">
            <path d="M4 1 7.5 7h-7Z" />
          </svg>
          {places}
        </span>
        <span className="numeral mt-1 block text-[0.75rem] text-muted">to No.&nbsp;{rank}</span>
      </span>
    </Link>
  );
}
