import { DAILY_POINTS } from "@/lib/points/values";

/** The most an admin can put on one day's winner (0128's check). */
export const MAX_WINNER_POINTS = 10_000;

type WithWinnerPoints = { winner_points?: number | null; prize?: string | null };

/** What first place pays: the day's own amount if an admin set one,
 * otherwise the usual. */
export function winnerPoints(challenge: WithWinnerPoints): number {
  return challenge.winner_points ?? DAILY_POINTS.place[1];
}

/** A day whose winner gets more than usual: worth shouting about. */
export function isBoostedDay(challenge: WithWinnerPoints): boolean {
  return winnerPoints(challenge) > DAILY_POINTS.place[1];
}

/** "250 points", or "a $50 gift card plus 250 points" with a prize. */
export function winnerTakes(challenge: WithWinnerPoints): string {
  const points = `${winnerPoints(challenge).toLocaleString("en-US")} points`;
  return challenge.prize ? `${challenge.prize} plus ${points}` : points;
}

/** The admin form's field: blank is the usual amount (null). */
export function parseWinnerPoints(input: string): { value: number | null } | { error: string } {
  const text = input.trim().replace(/,/g, "");
  if (text === "") return { value: null };
  if (!/^\d+$/.test(text)) return { error: "Winner's points must be a whole number." };
  const n = Number(text);
  if (n < 1 || n > MAX_WINNER_POINTS) return { error: `Winner's points must be between 1 and ${MAX_WINNER_POINTS.toLocaleString("en-US")}.` };
  // The usual amount is stored as blank, so a later change to it applies.
  return { value: n === DAILY_POINTS.place[1] ? null : n };
}

/** The Daily's pushes on a boosted day, leading with the points: the
 * morning "it's live" (also sent to yesterday's players once results are
 * in) and the evening last call. Null on an ordinary day, which keeps its
 * usual copy. */
export function boostedPushCopy(
  moment: "live" | "results" | "reminder",
  challenge: WithWinnerPoints & { title: string; sponsor_name?: string | null },
): { title: string; body: string } | null {
  if (!isBoostedDay(challenge)) return null;
  const points = `${winnerPoints(challenge).toLocaleString("en-US")} points`;
  const by = challenge.sponsor_name ? `, presented by ${challenge.sponsor_name}` : "";
  const takes = winnerTakes(challenge);
  switch (moment) {
    case "live":
      return {
        title: `${points} up for grabs today`,
        body: `Today's Sorza Daily is ${challenge.title}${by}. Enter your car now, get the votes, and take ${takes}.`,
      };
    case "results":
      return {
        title: `${points} up for grabs today`,
        body: `Yesterday's winner is crowned. Today it's ${challenge.title}${by}, and the winner takes ${takes}. Enter now.`,
      };
    case "reminder":
      return {
        title: `Last call for ${points}`,
        body: `${challenge.title} closes tonight and the winner takes ${takes}. Enter your car before the clock runs out.`,
      };
  }
}
