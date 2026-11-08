import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import {
  ensureDailyChallenge,
  getDailyChallengeByDate,
  getDailyVoteTotal,
  getMyDailyEntryVotes,
  getMyDailyVote,
  listDailySubmissions,
  type DailyChallenge,
} from "@/lib/db/daily";
import { addDays, dailyDateKey, isChallengeOpen } from "@/lib/daily/day";
import { formatDayLong } from "@/lib/daily/format";
import { composeDailyEntries, listGaragePhotos } from "@/lib/daily/compose";
import { loadChallengeResults, type ChallengeResults } from "@/lib/daily/results";
import { settleDueDailyChallenges } from "@/lib/daily/settle";
import { ChallengeVisual } from "@/features/daily/challenge-visual";
import { Countdown } from "@/features/daily/countdown";
import { MyEntry } from "@/features/daily/my-entry";
import { EntriesGallery } from "@/features/daily/entries-gallery";
import { ResultsPodium } from "@/features/daily/results-podium";
import { DailyProgress, RideEntryCard, type TodayProgress } from "@/features/daily/daily-progress";
import { listDailyActivity, STREAK_KINDS } from "@/lib/db/daily-activity";
import { getPointsBalance } from "@/lib/db/points";
import { getOrCreateRideRound } from "@/lib/daily/ride-server";
import { computeStreak, type Streak } from "@/lib/daily/streak";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/grouped-list";
import { FlagIcon, ChevronRightIcon } from "@/components/ui/icons";

/** The Sorza Daily screen: today's challenge with its countdown, your
 * entry, today's entries to vote on, and yesterday's results. */
export async function DailyPageContent() {
  const today = dailyDateKey();
  let challenge: DailyChallenge;
  try {
    challenge = await ensureDailyChallenge(today);
  } catch {
    return (
      <EmptyState
        card
        icon={<FlagIcon />}
        title="Sorza Daily is almost ready"
        body="Today's challenge will show up here soon."
      />
    );
  }

  // Results appear even if the hourly job is running late.
  await settleDueDailyChallenges().catch(() => undefined);

  const supabase = await createClient();
  const user = await getCurrentUser();
  const isOpen = isChallengeOpen(challenge);

  const [submissions, voteTotal, myVote, myEntryVotes, garage, cover, yesterday] = await Promise.all([
    listDailySubmissions(supabase, challenge.id),
    getDailyVoteTotal(supabase, challenge.id).catch(() => 0),
    user ? getMyDailyVote(supabase, challenge.id, user.id).catch(() => null) : null,
    user ? getMyDailyEntryVotes(supabase, challenge.id).catch(() => 0) : 0,
    user ? listGaragePhotos(supabase, user.id).catch(() => ({ cars: [], photos: [] })) : { cars: [], photos: [] },
    challenge.cover_media_id ? getMediaById(supabase, challenge.cover_media_id).catch(() => null) : null,
    getDailyChallengeByDate(supabase, addDays(today, -1)).catch(() => null),
  ]);
  const entries = await composeDailyEntries(supabase, submissions);
  const myEntry = user ? (entries.find((e) => e.userId === user.id) ?? null) : null;
  // Your own entry sits in its own card; everyone else's are the ones to vote on.
  const others = entries.filter((e) => e.userId !== user?.id);

  // Your own day: streak, points, today's checklist and Rate the Ride.
  let personal: { streak: Streak; points: number; today: TodayProgress; ride: { total: number; rated: number } } | null =
    null;
  if (user) {
    personal = await loadPersonalDaily(supabase, user.id, today, {
      entered: Boolean(myEntry),
      voted: Boolean(myVote),
    }).catch(() => null);
  }

  let yesterdayResults: ChallengeResults | null = null;
  if (yesterday) {
    yesterdayResults = await loadChallengeResults(supabase, yesterday).catch(() => null);
  }

  const loginHref = `/login?next=${encodeURIComponent("/daily")}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-5">
        <p className="micro-label text-muted">{formatDayLong(today)}</p>
        <h1 className="mt-1 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Sorza Daily</h1>
      </header>

      {/* Today's challenge */}
      <section className="overflow-hidden rounded-[26px] bg-neutral-950 elev-3">
        <div className="relative aspect-[16/10] w-full">
          <ChallengeVisual
            icon={challenge.icon}
            coverUrl={cover ? publicMediaUrl(supabase, cover.storage_path) : null}
            priority
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 to-transparent" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[0.75rem] font-semibold text-white backdrop-blur-md">
            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? "bg-accent" : "bg-white/40"}`} />
            {isOpen ? <Countdown endsAt={challenge.ends_at} /> : "Closed"}
            {isOpen && <span className="text-white/60">left</span>}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="micro-label text-accent">Today&apos;s challenge</p>
            <h2 className="mt-1 text-balance text-[1.75rem] font-bold leading-[1.1] tracking-[-0.02em] text-white">
              {challenge.title}
            </h2>
          </div>
        </div>
        <div className="flex flex-col gap-4 p-5 pt-3">
          <p className="text-[0.9375rem] leading-relaxed text-white/80">{challenge.description}</p>
          <p className="numeral text-[0.8125rem] text-white/55">
            {entries.length === 1 ? "1 entry" : `${entries.length} entries`} ·{" "}
            {voteTotal === 1 ? "1 vote" : `${voteTotal} votes`} cast · ends midnight CT
          </p>
          <MyEntry
            userId={user?.id ?? null}
            isOpen={isOpen}
            entry={myEntry}
            entryVotes={myEntryVotes}
            garage={garage}
            loginHref={loginHref}
            challengeTitle={challenge.title}
          />
        </div>
      </section>

      {personal && (
        <section className="mt-6 flex flex-col gap-2.5">
          <DailyProgress streak={personal.streak} points={personal.points} today={personal.today} />
          <RideEntryCard total={personal.ride.total} rated={personal.ride.rated} />
        </section>
      )}

      {/* Today's entries */}
      <section className="mt-9">
        <SectionTitle>Vote</SectionTitle>
        <p className="-mt-1 mb-3 px-1 text-[0.8125rem] leading-relaxed text-muted">
          One vote each. Tap again to take it back. Vote counts are revealed when the challenge ends.
        </p>
        {others.length === 0 ? (
          <p className="glass-raised elev-1 rounded-[22px] px-5 py-6 text-center text-[0.875rem] leading-relaxed text-muted">
            {myEntry
              ? "You're the first one in. Entries from everyone else show up here to vote on."
              : "No entries yet today. The first one sets the bar."}
          </p>
        ) : (
          <EntriesGallery
            entries={others}
            viewerId={user?.id ?? null}
            initialVote={myVote?.submission_id ?? null}
            isOpen={isOpen}
            loginHref={loginHref}
          />
        )}
      </section>

      {/* Yesterday's results */}
      {yesterday && yesterdayResults && (
        <section className="mt-9">
          <SectionTitle
            action={
              <Link href="/daily/results" className="flex items-center gap-0.5 text-accent">
                Past results
                <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Yesterday
          </SectionTitle>
          <p className="-mt-1 mb-3 px-1 text-[0.8125rem] text-muted">{yesterday.title}</p>
          <ResultsPodium
            podium={yesterdayResults.podium}
            entryCount={yesterdayResults.entryCount}
            voteTotal={yesterdayResults.voteTotal}
          />
        </section>
      )}

      <p className="mt-12 px-1 text-[0.6875rem] leading-relaxed text-muted/80">
        A new challenge starts every day at midnight Central time. Winners are decided by community votes; ties
        share the place. Prizes are points and badges inside SORZA only. Apple is not a sponsor of, and is not
        involved in, Sorza Daily.
      </p>
    </div>
  );
}

async function loadPersonalDaily(
  supabase: SupabaseClient<Database>,
  userId: string,
  today: string,
  live: { entered: boolean; voted: boolean },
) {
  const [activity, points, round] = await Promise.all([
    listDailyActivity(supabase, userId),
    getPointsBalance(supabase, userId).catch(() => 0),
    getOrCreateRideRound(userId, today).catch(() => [] as string[]),
  ]);
  const { data: myRideRatings } = round.length
    ? await supabase.from("peer_ratings").select("vehicle_id").eq("rater_id", userId).in("vehicle_id", round)
    : { data: [] as { vehicle_id: string }[] };
  const rated = (myRideRatings ?? []).length;
  // Today's ticks come from what's really there (your entry, your vote,
  // your ratings), not only from the activity log, which is written just
  // after the response.
  const todayProgress: TodayProgress = {
    entered: live.entered,
    voted: live.voted,
    ratedRides: round.length > 0 && rated >= round.length,
  };
  const days = activity.filter((a) => STREAK_KINDS.includes(a.kind)).map((a) => a.activity_date);
  if (todayProgress.entered || todayProgress.voted || todayProgress.ratedRides) days.push(today);
  return {
    streak: computeStreak(days, today),
    points,
    today: todayProgress,
    ride: { total: round.length, rated },
  };
}
