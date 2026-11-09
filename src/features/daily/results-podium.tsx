import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/features/feed/avatar";
import type { PodiumEntry } from "@/lib/daily/results";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { FlagIcon } from "@/components/ui/icons";
import { DailyEmpty } from "@/features/daily/daily-empty";

const ORDINAL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

function placeLabel(place: number, tied: boolean): string {
  return tied ? `Tied ${ORDINAL[place]}` : ORDINAL[place];
}

function votesLabel(votes: number): string {
  return votes === 1 ? "1 vote" : `${votes} votes`;
}

/** A finished challenge's results: the winner (or co-winners) large,
 * the rest of the podium beneath. Every number is a real vote count. */
export function ResultsPodium({
  podium,
  entryCount,
  voteTotal,
}: {
  podium: PodiumEntry[];
  entryCount: number;
  voteTotal: number;
}) {
  if (entryCount === 0) {
    return <DailyEmpty icon={<FlagIcon />} title="No entries" body="Nobody entered this one." />;
  }
  if (podium.length === 0) {
    return (
      <DailyEmpty
        icon={<FlagIcon />}
        title="No winner"
        body={`${entryCount === 1 ? "1 entry" : `${entryCount} entries`} and no votes cast, so no winner this time.`}
      />
    );
  }

  const winners = podium.filter((p) => p.place === 1);
  const rest = podium.filter((p) => p.place > 1);

  return (
    <div className="flex flex-col gap-2.5">
      {winners.map((p) => (
        <WinnerCard key={p.entry.id} podium={p} />
      ))}
      {rest.length > 0 && (
        <ul className="grid grid-cols-2 gap-2.5">
          {rest.map((p) => (
            <li key={p.entry.id}>
              <Link
                href={`/u/${p.entry.username}`}
                className="pressable relative block aspect-[4/5] overflow-hidden rounded-[20px] bg-foreground/[0.06]"
              >
                {p.entry.photoUrl && (
                  <Image src={p.entry.photoUrl} alt="" fill sizes="(min-width: 768px) 320px, 50vw" className="object-cover" />
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.75rem] font-bold text-white backdrop-blur-md">
                  {placeLabel(p.place, p.tied)}
                </span>
                <span className="absolute inset-x-0 bottom-0 p-3">
                  <span className="block truncate text-[0.8125rem] font-semibold text-white">@{p.entry.username}</span>
                  <span className="numeral block text-[0.75rem] text-white/70">{votesLabel(p.votes)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="px-1 text-[0.75rem] text-muted">
        {entryCount === 1 ? "1 entry" : `${entryCount} entries`} · {voteTotal === 1 ? "1 vote" : `${voteTotal} votes`} cast
      </p>
    </div>
  );
}

function WinnerCard({ podium }: { podium: PodiumEntry }) {
  const { entry } = podium;
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-neutral-950 elev-3">
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/10]">
        {entry.photoUrl && (
          <Image src={entry.photoUrl} alt="" fill sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
        )}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/70 to-transparent" />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
        <span className="absolute left-4 top-4 flex items-center gap-2">
          <span className="rounded-full bg-accent px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.08em] text-white">
            {podium.tied ? "Co-winner" : "Winner"}
          </span>
          <span className="numeral rounded-full bg-black/60 px-3 py-1 text-[0.75rem] font-semibold text-white backdrop-blur-md">
            {votesLabel(podium.votes)}
          </span>
        </span>
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <Link href={`/u/${entry.username}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar username={entry.username} avatarUrl={entry.avatarUrl} className="h-11 w-11 text-base" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate text-[1.0625rem] font-bold text-white">
                @{entry.username}
                {entry.isVerified && <VerifiedBadge onMedia className="h-4 w-4" />}
              </span>
              {entry.vehicleTitle && <span className="block truncate text-[0.8125rem] text-white/75">{entry.vehicleTitle}</span>}
            </span>
          </Link>
          {entry.vehicleId && (
            <Link
              href={`/garage/${entry.vehicleId}`}
              className="flex-shrink-0 rounded-full bg-white/15 px-3.5 py-2 text-[0.8125rem] font-semibold text-white backdrop-blur-md"
            >
              View car
            </Link>
          )}
        </div>
      </div>
      {entry.caption && <p className="px-4 py-3 text-[0.875rem] leading-relaxed text-white/85">{entry.caption}</p>}
    </div>
  );
}
