import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FlagIcon } from "@/components/ui/icons";
import { listDailyPlacements, listDailySubmissionsForChallenges, listPastDailyChallenges } from "@/lib/db/daily";
import { composeDailyEntries } from "@/lib/daily/compose";
import { dailyDateKey } from "@/lib/daily/day";
import { formatDayShort } from "@/lib/daily/format";
import { settleDueDailyChallenges } from "@/lib/daily/settle";

export const metadata: Metadata = { title: "Past results · Sorza Daily" };

/** Every finished challenge, newest first, with its winner. */
export default async function DailyResultsPage() {
  await settleDueDailyChallenges().catch(() => undefined);
  const supabase = await createClient();
  const challenges = await listPastDailyChallenges(supabase, dailyDateKey(), 60).catch(() => []);
  const placements = await listDailyPlacements(supabase, challenges.map((c) => c.id)).catch(() => []);
  const winners = placements.filter((p) => p.place === 1);

  const winnerSubmissionIds = new Set(winners.map((w) => w.submission_id));
  const submissions = await listDailySubmissionsForChallenges(
    supabase,
    challenges.map((c) => c.id),
  ).catch(() => []);
  const entryCountByChallenge = new Map<string, number>();
  for (const s of submissions) entryCountByChallenge.set(s.challenge_id, (entryCountByChallenge.get(s.challenge_id) ?? 0) + 1);
  const winnerEntries = await composeDailyEntries(
    supabase,
    submissions.filter((s) => winnerSubmissionIds.has(s.id)),
  );
  const entryById = new Map(winnerEntries.map((e) => [e.id, e]));

  return (
    <PageShell width="2xl">
      <PageHeader title="Past results" back={{ href: "/daily", label: "Daily" }} />
      {challenges.length === 0 ? (
        <EmptyState card icon={<FlagIcon />} title="No finished challenges yet" body="Results show up here once the first day ends." />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {challenges.map((c) => {
            const challengeWinners = winners
              .filter((w) => w.challenge_id === c.id)
              .map((w) => entryById.get(w.submission_id))
              .filter((e) => e !== undefined);
            const lead = challengeWinners[0];
            const entries = entryCountByChallenge.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/daily/results/${c.challenge_date}`}
                  className="pressable glass-raised elev-1 flex items-center gap-3 rounded-[20px] p-2.5 pr-4"
                >
                  <span className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[14px] bg-foreground/[0.06]">
                    {lead?.photoUrl && <Image src={lead.photoUrl} alt="" fill sizes="128px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.75rem] text-muted">{formatDayShort(c.challenge_date)}</span>
                    <span className="block truncate text-[0.9375rem] font-semibold">{c.title}</span>
                    <span className="block truncate text-[0.8125rem] text-muted">
                      {lead
                        ? `${challengeWinners.length > 1 ? "Co-winners" : "Winner"} @${challengeWinners.map((w) => w.username).join(", @")}`
                        : entries === 0
                          ? "No entries"
                          : "No votes, no winner"}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
