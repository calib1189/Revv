import Link from "next/link";
import { CheckIcon, ChevronRightIcon, FlameIcon, GemIcon, StarIcon } from "@/components/ui/icons";
import { StreakTrack } from "@/features/daily/streak-track";
import { ChestOpener } from "@/features/daily/chest-opener";
import { PushNudge } from "@/features/push/push-nudge";
import { StreakRestoreCard } from "@/features/daily/streak-restore-card";
import { StreakSteps, type StreakStep } from "@/features/daily/streak-steps";
import type { RepairOffer } from "@/lib/streak/repair";
import type { Streak } from "@/lib/daily/streak";

export interface TodayProgress {
  entered: boolean;
  voted: boolean;
  ratedRides: boolean;
  /** Cars in today's Rate the Ride round. */
  rideTotal: number;
  /** There's a Build Battle today (its vote counts for the streak too). */
  battleOpen: boolean;
  battleVoted: boolean;
}

/** Your day at a glance: streak, points, and the three things you can do
 * today. Every number here is your own real activity. */
export function DailyProgress({
  streak,
  todayKey,
  readyChest,
  repairOffer,
  points,
  today,
}: {
  streak: Streak;
  /** Today's Sorza day, so the week row can name real weekdays. */
  todayKey: string;
  /** An earned chest you haven't opened yet, and who you are (for the
   * reveal's preview of a cosmetic on you). */
  readyChest: { chestDate: string; username: string; avatarUrl: string | null } | null;
  /** A lost streak that can still be restored. */
  repairOffer: RepairOffer | null;
  points: number;
  today: TodayProgress;
}) {
  const cars = `${today.rideTotal} ${today.rideTotal === 1 ? "car" : "cars"}`;
  const steps: StreakStep[] = [
    {
      key: "battle",
      title: "Build Battle",
      hint: "Pick which build wins",
      action: "Vote in the Build Battle",
      effort: "One tap keeps your streak",
      doneText: "You voted in the Build Battle",
      href: "/battle",
      done: today.battleVoted,
      available: today.battleOpen,
    },
    {
      key: "vote",
      title: "Vote on an entry",
      hint: "Pick your favorite in today's challenge",
      action: "Vote on today's challenge",
      effort: "One tap keeps your streak",
      doneText: "You voted on today's challenge",
      href: "#daily-vote",
      done: today.voted,
      available: true,
    },
    {
      key: "rate",
      title: "Rate the Ride",
      hint: `Rate ${cars}`,
      action: "Rate today's rides",
      effort: `Rate ${cars} to keep your streak`,
      doneText: "You rated today's rides",
      href: "/daily/rate",
      done: today.ratedRides,
      available: today.rideTotal > 0,
    },
    {
      key: "enter",
      title: "Enter today's challenge",
      hint: "Post a photo of your car",
      action: "Enter today's challenge",
      effort: "Post your car to keep your streak",
      doneText: "You entered today's challenge",
      href: "#daily-challenge",
      done: today.entered,
      available: true,
    },
  ];
  const lit = streak.activeToday && streak.current > 0;
  const status = lit
    ? "day streak"
    : streak.atRisk
      ? "Missed yesterday. Play today"
      : streak.current > 0
        ? "Play today to keep it"
        : "Start a streak today";

  return (
    <div className="glass-raised elev-1 flex flex-col gap-5 rounded-[24px] p-5">
      {/* The streak, big: the flame (lit once you've played today) and the
          count, with your points tucked to one side. */}
      <div className="flex items-center gap-3.5">
        <span
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${
            lit ? "bg-accent/15 text-accent" : "bg-foreground/[0.06] text-muted"
          }`}
        >
          <FlameIcon className={`h-8 w-8 ${lit ? "flame-flicker" : ""}`} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="numeral text-[2.25rem] font-bold leading-none tracking-[-0.03em]">{streak.current}</p>
          <p className={`mt-1 text-[0.8125rem] font-medium ${lit || streak.current === 0 ? "text-muted" : "text-accent"}`}>
            {status}
          </p>
        </div>
        <Link
          href="/store"
          className="pressable numeral flex flex-shrink-0 items-center gap-1 self-start rounded-full bg-foreground/[0.06] py-1.5 pl-2.5 pr-2 text-[0.8125rem] font-semibold"
          aria-label={`${points} points`}
        >
          <GemIcon className="h-3.5 w-3.5 text-accent" />
          {points.toLocaleString()}
          <ChevronRightIcon className="h-3 w-3 text-muted" />
        </Link>
      </div>
      {repairOffer && <StreakRestoreCard offer={repairOffer} balance={points} />}
      {readyChest && (
        <ChestOpener chestDate={readyChest.chestDate} username={readyChest.username} avatarUrl={readyChest.avatarUrl} />
      )}
      <StreakTrack streak={streak} todayKey={todayKey} />
      <PushNudge />
      <StreakSteps steps={steps} todayKey={todayKey} />
    </div>
  );
}

/** The way into Rate the Ride from the Daily page. */
export function RideEntryCard({ total, rated }: { total: number; rated: number }) {
  const done = total > 0 && rated >= total;
  const subtitle =
    total === 0
      ? "You've rated every car so far"
      : done
        ? "Done for today. New rides tomorrow"
        : rated === 0
          ? `${total} ${total === 1 ? "ride is" : "rides are"} waiting for your rating`
          : `${rated} of ${total} rated`;
  return (
    <Link href="/daily/rate" className="pressable glass-raised elev-1 flex items-center gap-4 rounded-[22px] p-4">
      <span
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] ${
          done ? "bg-accent/15 text-accent" : "bg-accent text-white"
        }`}
      >
        {done ? <CheckIcon className="h-6 w-6" /> : <StarIcon className="h-6 w-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold">Rate the Ride</span>
        <span className="block text-[0.8125rem] text-muted">{subtitle}</span>
      </span>
      <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
    </Link>
  );
}
