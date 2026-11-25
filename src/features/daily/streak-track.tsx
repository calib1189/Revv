import { CheckIcon, GarageIcon } from "@/components/ui/icons";
import { trackSlots, trackDay, TRACK_LENGTH, type TrackSlot } from "@/lib/streak/track";
import { STREAK_POINTS } from "@/lib/points/values";
import { addDays } from "@/lib/daily/day";
import { RARITY_COLOR } from "@/lib/store/rarity";
import type { Streak } from "@/lib/daily/streak";

const STREAK_BLUE = RARITY_COLOR.streak;
const CHEST_FILL = "linear-gradient(135deg, #2563eb, #7cc4ff 60%, #e8f6ff)";
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

function weekdayOf(key: string): string {
  return WEEKDAY[new Date(`${key}T12:00:00Z`).getUTCDay()];
}

/** One day of the week row: a circle that fills when you play. Today is
 * outlined until you do; the seventh is the garage. */
function Day({ slot, label, isToday }: { slot: TrackSlot; label: string; isToday: boolean }) {
  const chest = slot.day === TRACK_LENGTH;
  const done = slot.state === "done";

  let circle: string;
  let style: React.CSSProperties | undefined;
  if (chest && done) {
    circle = "text-white";
    style = { background: CHEST_FILL };
  } else if (chest) {
    circle = isToday ? "ring-2 ring-inset" : "";
    style = {
      color: STREAK_BLUE,
      background: `color-mix(in srgb, ${STREAK_BLUE} 16%, var(--background))`,
      ...(isToday ? { ["--tw-ring-color" as string]: STREAK_BLUE } : {}),
    };
  } else if (done) {
    circle = "bg-accent text-white";
  } else if (isToday) {
    circle = "bg-accent/10 text-accent ring-2 ring-inset ring-accent";
  } else {
    circle = "bg-foreground/[0.08] text-muted";
  }

  return (
    <li className="relative z-[1] flex flex-col items-center gap-1.5">
      <span
        className={`text-[0.6875rem] font-semibold leading-4 ${isToday ? "text-foreground" : "text-muted"}`}
        aria-hidden
      >
        {label}
      </span>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-full ${circle} ${
          slot.claimedToday ? "streak-day-pop" : ""
        }`}
        style={style}
        aria-label={`Day ${slot.streakDay}${chest ? ", garage" : ""}${done ? ", done" : isToday ? ", today" : ""}`}
      >
        {chest ? (
          <GarageIcon className="h-[17px] w-[17px]" />
        ) : done ? (
          <CheckIcon className="h-4 w-4" strokeWidth={2.6} />
        ) : null}
      </span>
    </li>
  );
}

const CHEST_LINE = "points or a cosmetic you can't buy";

/** What today means for you, in one short line. */
function caption(streak: Streak, chestDay: number): string {
  const day = trackDay(streak.current);
  if (streak.activeToday) {
    if (day === TRACK_LENGTH) return `Day ${streak.current} garage unlocked. Next one on day ${streak.current + TRACK_LENGTH}.`;
    const left = chestDay - streak.current;
    return `+${STREAK_POINTS.track[day - 1]} today. ${left === 1 ? "Garage tomorrow" : `${left} days to your garage`}.`;
  }
  const next = day === TRACK_LENGTH ? 1 : day + 1;
  if (next === TRACK_LENGTH) return `Play today to unlock your day-${chestDay} garage: ${CHEST_LINE}.`;
  if (streak.current > 0) return `Play today for +${STREAK_POINTS.track[next - 1]}.`;
  return `Every 7th day unlocks a garage: ${CHEST_LINE}.`;
}

/** The streak's week: seven circles named for the days they fall on,
 * filling in as you play, joined by a line that grows with them. The
 * seventh is the garage (day 7, 14, 21…). */
export function StreakTrack({ streak, todayKey }: { streak: Streak; todayKey: string }) {
  const slots = trackSlots(streak);
  const todayIndex = slots.findIndex((s) => s.state === "today" || s.claimedToday);
  const doneCount = slots.filter((s) => s.state === "done").length;
  // The line joins the centres of the days you've played.
  const fill = doneCount > 1 ? (doneCount - 1) / (TRACK_LENGTH - 1) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* Joins the days you've played, behind their (solid) circles:
            label (16px) + gap (6px) + half a circle (18px) down. */}
        <span
          aria-hidden
          className="absolute top-[39px] h-[3px]"
          style={{ left: `calc(100% / ${TRACK_LENGTH * 2})`, right: `calc(100% / ${TRACK_LENGTH * 2})` }}
        >
          <span
            className="block h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${fill * 100}%` }}
          />
        </span>
        <ol className="grid grid-cols-7" aria-label="This week of your streak">
          {slots.map((slot, i) => (
            <Day
              key={slot.day}
              slot={slot}
              isToday={i === todayIndex}
              label={weekdayOf(addDays(todayKey, i - (todayIndex < 0 ? 0 : todayIndex)))}
            />
          ))}
        </ol>
      </div>
      <p className="text-center text-[0.8125rem] text-muted">{caption(streak, slots[TRACK_LENGTH - 1].streakDay)}</p>
    </div>
  );
}
