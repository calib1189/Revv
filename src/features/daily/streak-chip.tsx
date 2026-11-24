import { FlameIcon, GiftIcon } from "@/components/ui/icons";

/** A streak at a glance: the flame and the day count. Lit once you've
 * shown up today; grey while today is still to play, which is the nudge.
 * Nothing at all with no run going. */
export function StreakChip({
  streak,
  chestReady = false,
  onMedia = false,
  className = "",
}: {
  streak: { current: number; activeToday: boolean } | null;
  /** A chest waiting to be opened: shown as a blue gift beside the count. */
  chestReady?: boolean;
  onMedia?: boolean;
  className?: string;
}) {
  if (chestReady) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <StreakChip streak={streak} onMedia={onMedia} />
        <GiftIcon className="chest-idle h-[1.1em] w-[1.1em]" style={{ color: "#6fb4ff" }} aria-label="Chest ready to open" />
      </span>
    );
  }
  if (!streak || streak.current <= 0) return null;
  const lit = streak.activeToday;
  return (
    <span
      className={`numeral inline-flex items-center gap-0.5 font-semibold ${
        lit ? "text-accent" : onMedia ? "text-white/60" : "text-muted"
      } ${className}`}
      aria-label={`${streak.current}-day streak${lit ? "" : ", play today to keep it"}`}
    >
      <FlameIcon className="h-[1.05em] w-[1.05em]" />
      {streak.current}
    </span>
  );
}
