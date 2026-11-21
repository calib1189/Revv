import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getDailyChallengeByDate } from "@/lib/db/daily";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { hasSeenAnnouncement } from "@/lib/db/announcement-views";
import { dailyBoostAnnouncement } from "@/lib/announcements";
import { dailyDateKey, isChallengeOpen } from "@/lib/daily/day";
import { isBoostedDay, winnerPoints } from "@/lib/daily/prize";
import type { ChallengeIcon } from "@/lib/daily/rotation";

export interface DailyBoost {
  dateKey: string;
  title: string;
  points: number;
  /** A prize on top of the points, as the admin typed it. */
  prize: string | null;
  sponsorName: string | null;
  endsAt: string;
  icon: ChallengeIcon;
  coverUrl: string | null;
}

/** Today's prize day, for the one-time takeover when the app opens: only
 * while it's open, only to someone who hasn't entered, and only once.
 * Null otherwise, and null when anything can't be read, so a failed
 * lookup never shows it on every launch. */
export async function loadDailyBoost(supabase: SupabaseClient<Database>, userId: string): Promise<DailyBoost | null> {
  try {
    const dateKey = dailyDateKey();
    const challenge = await getDailyChallengeByDate(supabase, dateKey);
    if (!challenge || !isBoostedDay(challenge) || !isChallengeOpen(challenge)) return null;
    const [seen, entry] = await Promise.all([
      hasSeenAnnouncement(supabase, userId, dailyBoostAnnouncement(dateKey)),
      supabase.from("daily_submissions").select("id").eq("challenge_id", challenge.id).eq("user_id", userId).maybeSingle(),
    ]);
    if (seen || entry.error || entry.data) return null;
    const [cover] = challenge.cover_media_id ? await getMediaByIds(supabase, [challenge.cover_media_id]) : [];
    return {
      dateKey,
      title: challenge.title,
      points: winnerPoints(challenge),
      prize: challenge.prize ?? null,
      sponsorName: challenge.sponsor_name ?? null,
      endsAt: challenge.ends_at,
      icon: challenge.icon,
      coverUrl: cover ? publicMediaUrl(supabase, cover.storage_path) : null,
    };
  } catch {
    return null;
  }
}
