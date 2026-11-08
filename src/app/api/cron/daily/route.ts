import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron/authorize";
import { ensureDailyChallenge } from "@/lib/db/daily";
import { dailyDateKey } from "@/lib/daily/day";
import { settleDueDailyChallenges } from "@/lib/daily/settle";
import { sendDueDailyPushes } from "@/lib/daily/notify";

// Settling plus a push fan-out; generous so a growing user base fits.
export const maxDuration = 60;

/** Sorza Daily's hourly job, called by Supabase pg_cron (0107). Every
 * step is safe to repeat: today's challenge is created only if missing,
 * a challenge is settled only once, and each push is claimed in
 * daily_push_log before it's sent. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = await ensureDailyChallenge(dailyDateKey());
  const settled = await settleDueDailyChallenges();
  const pushed = await sendDueDailyPushes(today);

  return NextResponse.json({
    challenge: today.challenge_date,
    settled: settled.map((s) => ({ date: s.challenge.challenge_date, placed: s.placements.length })),
    pushed,
  });
}
