import Link from "next/link";
import { CheckIcon, ChevronRightIcon, StarIcon } from "@/components/ui/icons";
import type { Streak } from "@/lib/daily/streak";

export interface TodayProgress {
  entered: boolean;
  voted: boolean;
  ratedRides: boolean;
}

/** Your day at a glance: streak, points, and the three things you can do
 * today. Every number here is your own real activity. */
export function DailyProgress({
  streak,
  points,
  today,
}: {
  streak: Streak;
  points: number;
  today: TodayProgress;
}) {
  const items: { label: string; done: boolean }[] = [
    { label: "Enter", done: today.entered },
    { label: "Vote", done: today.voted },
    { label: "Rate rides", done: today.ratedRides },
  ];
  return (
    <div className="glass-raised elev-1 flex flex-col gap-4 rounded-[22px] p-4">
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1">
          <p className="micro-label text-muted">Streak</p>
          <p className="numeral mt-1 text-[1.5rem] font-bold leading-none">
            {streak.current}
            <span className="ml-1 text-[0.875rem] font-medium text-muted">{streak.current === 1 ? "day" : "days"}</span>
          </p>
        </div>
        <div className="mx-4 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <p className="micro-label text-muted">Points</p>
          <Link href="/store" className="numeral mt-1 flex items-center gap-1 text-[1.5rem] font-bold leading-none">
            {points.toLocaleString()}
            <ChevronRightIcon className="h-3.5 w-3.5 text-muted" />
          </Link>
        </div>
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <li
            key={item.label}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-[0.8125rem] font-semibold ${
              item.done ? "bg-accent/15 text-accent" : "bg-foreground/[0.06] text-muted"
            }`}
          >
            {item.done && <CheckIcon className="h-3.5 w-3.5" />}
            {item.label}
          </li>
        ))}
      </ul>
      {streak.atRisk && !streak.activeToday && (
        <p className="text-[0.8125rem] text-muted">You missed yesterday. Take part today to keep your streak.</p>
      )}
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
