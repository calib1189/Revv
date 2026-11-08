"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { voteForDailyEntryAction } from "@/features/daily/actions";
import { DailySheet } from "@/features/daily/daily-sheet";
import { ReportButton } from "@/features/feed/report-button";
import { Avatar } from "@/features/feed/avatar";
import type { DailyEntry } from "@/lib/daily/compose";
import { CheckIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";

/** Today's entries, two across, each with a one-tap vote. Tapping the
 * photo opens it full size with the owner, the car and the caption.
 * Vote counts stay hidden until the challenge ends (0104). */
export function EntriesGallery({
  entries,
  viewerId,
  initialVote,
  isOpen,
  loginHref,
}: {
  entries: DailyEntry[];
  viewerId: string | null;
  initialVote: string | null;
  isOpen: boolean;
  loginHref: string;
}) {
  const [vote, setVote] = useState<string | null>(initialVote);
  const [viewing, setViewing] = useState<DailyEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleVote(entry: DailyEntry) {
    if (!viewerId) {
      router.push(loginHref);
      return;
    }
    const previous = vote;
    setVote(previous === entry.id ? null : entry.id);
    setError(null);
    startTransition(async () => {
      const result = await voteForDailyEntryAction(entry.id);
      if (result.error) {
        setVote(previous);
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      {error && <p className="mb-3 px-1 text-[0.8125rem] text-danger">{error}</p>}
      <ul className="grid grid-cols-2 gap-2.5">
        {entries.map((entry) => {
          const isOwn = entry.userId === viewerId;
          const isVoted = vote === entry.id;
          return (
            <li key={entry.id} className="relative">
              <button
                type="button"
                onClick={() => setViewing(entry)}
                className="pressable group relative block aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-foreground/[0.06] text-left"
                aria-label={`Entry by @${entry.username}`}
              >
                {entry.photoUrl && (
                  <Image src={entry.photoUrl} alt="" fill sizes="(min-width: 768px) 320px, 50vw" className="object-cover" />
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
                  <span className="flex items-center gap-1 truncate text-[0.8125rem] font-semibold text-white">
                    @{entry.username}
                    {entry.isVerified && <VerifiedBadge onMedia className="h-3 w-3" />}
                  </span>
                  {entry.vehicleTitle && (
                    <span className="truncate text-[0.75rem] text-white/70">{entry.vehicleTitle}</span>
                  )}
                </span>
              </button>
              {isOpen && !isOwn && (
                <button
                  type="button"
                  onClick={() => toggleVote(entry)}
                  disabled={isPending}
                  aria-pressed={isVoted}
                  className={`absolute right-2 top-2 flex h-8 items-center gap-1 rounded-full px-3 text-[0.75rem] font-semibold backdrop-blur-md transition-colors ${
                    isVoted ? "bg-accent text-white" : "bg-black/55 text-white"
                  }`}
                >
                  {isVoted && <CheckIcon className="h-3.5 w-3.5" />}
                  {isVoted ? "Voted" : "Vote"}
                </button>
              )}
              {isOwn && (
                <span className="absolute right-2 top-2 rounded-full bg-black/55 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
                  You
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <DailySheet open={viewing !== null} onClose={() => setViewing(null)} title={viewing ? `@${viewing.username}` : ""}>
        {viewing && (
          <EntryDetail
            entry={viewing}
            isOwn={viewing.userId === viewerId}
            isVoted={vote === viewing.id}
            canVote={isOpen}
            viewerId={viewerId}
            pending={isPending}
            onVote={() => toggleVote(viewing)}
          />
        )}
      </DailySheet>
    </>
  );
}

function EntryDetail({
  entry,
  isOwn,
  isVoted,
  canVote,
  viewerId,
  pending,
  onVote,
}: {
  entry: DailyEntry;
  isOwn: boolean;
  isVoted: boolean;
  canVote: boolean;
  viewerId: string | null;
  pending: boolean;
  onVote: () => void;
}) {
  const ratio =
    entry.photoWidth && entry.photoHeight ? Math.min(Math.max(entry.photoWidth / entry.photoHeight, 0.6), 1.6) : 0.8;
  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full overflow-hidden rounded-[20px] bg-foreground/[0.06]" style={{ aspectRatio: ratio }}>
        {entry.photoUrl && <Image src={entry.photoUrl} alt="" fill sizes="(min-width: 640px) 480px, 100vw" className="object-cover" />}
      </div>

      <div className="flex items-center gap-3">
        <Link href={`/u/${entry.username}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar username={entry.username} avatarUrl={entry.avatarUrl} className="h-10 w-10 text-sm" />
          <span className="min-w-0">
            <span className="flex items-center gap-1 truncate text-[0.9375rem] font-semibold">
              @{entry.username}
              {entry.isVerified && <VerifiedBadge className="h-3.5 w-3.5" />}
            </span>
            {entry.vehicleTitle && <span className="block truncate text-[0.8125rem] text-muted">{entry.vehicleTitle}</span>}
          </span>
        </Link>
        {entry.vehicleId && (
          <Link
            href={`/garage/${entry.vehicleId}`}
            className="flex-shrink-0 rounded-full bg-foreground/[0.08] px-3.5 py-2 text-[0.8125rem] font-semibold"
          >
            View car
          </Link>
        )}
      </div>

      {entry.caption && <p className="text-[0.9375rem] leading-relaxed">{entry.caption}</p>}

      {entry.aiScore !== null && (
        <p className="text-[0.75rem] text-muted">
          SORZA AI rating <span className="numeral text-foreground">{entry.aiScore.toFixed(2)}</span> · votes decide
          the challenge, not the AI
        </p>
      )}

      {canVote && !isOwn && (
        <button
          type="button"
          onClick={onVote}
          disabled={pending}
          aria-pressed={isVoted}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold ${
            isVoted ? "bg-foreground/[0.08] text-foreground" : "bg-accent text-accent-foreground"
          }`}
        >
          {isVoted && <CheckIcon className="h-4 w-4 text-accent" />}
          {isVoted ? "Your vote. Tap to take it back" : "Vote for this build"}
        </button>
      )}

      {viewerId && !isOwn && (
        <div className="text-[0.8125rem] text-muted">
          <ReportButton targetType="daily_submission" targetId={entry.id} />
        </div>
      )}
    </div>
  );
}
