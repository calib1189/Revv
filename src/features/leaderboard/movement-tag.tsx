import type { RankMovement } from "@/lib/leaderboard/movement";

/** How many places a build moved since yesterday: a small up or down
 * triangle and the count, or "New" for a build first rated since. No
 * tag at all when it held its place, so the board only marks change.
 * `onMedia` is for the photo cards, where it sits on a dark pill. */
export function MovementTag({ movement, onMedia = false }: { movement: RankMovement | undefined; onMedia?: boolean }) {
  if (!movement) return null;
  const pill = onMedia ? "rounded-full bg-black/55 px-1.5 py-0.5 backdrop-blur-sm" : "";

  if (movement.kind === "new") {
    return (
      <span className={`text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent ${pill}`}>New</span>
    );
  }

  // A climb is news and gets colour; a slip is quiet grey. A new build
  // above moves everyone under it down a place, and a column of red for
  // that would make the whole board read as bad news.
  const up = movement.kind === "up";
  return (
    <span
      className={`numeral inline-flex items-center gap-0.5 text-[0.6875rem] font-semibold leading-none ${
        up ? "" : onMedia ? "text-white/70" : "text-muted"
      } ${pill}`}
      style={up ? { color: "var(--success)" } : undefined}
      aria-label={`${up ? "Up" : "Down"} ${movement.places} since yesterday`}
    >
      <svg viewBox="0 0 8 8" className="h-[7px] w-[7px]" aria-hidden fill="currentColor">
        {up ? <path d="M4 1 7.5 7h-7Z" /> : <path d="M4 7 .5 1h7Z" />}
      </svg>
      {movement.places}
    </span>
  );
}
