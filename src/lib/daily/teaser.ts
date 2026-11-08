import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { ensureDailyChallenge, listDailySubmissions } from "@/lib/db/daily";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { dailyDateKey, isChallengeOpen } from "@/lib/daily/day";
import { hasDailyActivityOn } from "@/lib/db/daily-activity";
import type { ChallengeIcon } from "@/lib/daily/rotation";

export interface DailyTeaser {
  title: string;
  description: string;
  icon: ChallengeIcon;
  coverUrl: string | null;
  endsAt: string;
  entryCount: number;
  /** Up to three real entry photos, newest first. */
  entryPhotos: string[];
  tookPartToday: boolean;
}

/** Today's challenge in brief, for the Feed slide, the Garage card and
 * the Leaderboard link. All three panels render in one request, so it's
 * cached per request: one lookup, not three. Null when Daily isn't
 * available (tables missing) or the day has closed, so those surfaces
 * simply don't show it. */
export const loadDailyTeaser = cache(async (userId: string | null): Promise<DailyTeaser | null> => {
  try {
    const supabase = await createClient();
    const today = dailyDateKey();
    const challenge = await ensureDailyChallenge(today);
    if (!isChallengeOpen(challenge)) return null;
    const [submissions, tookPart] = await Promise.all([
      listDailySubmissions(supabase, challenge.id),
      userId ? hasDailyActivityOn(supabase, userId, today).catch(() => false) : Promise.resolve(false),
    ]);
    const recent = [...submissions].reverse().slice(0, 3);
    const media = await getMediaByIds(
      supabase,
      [...recent.map((s) => s.media_id), challenge.cover_media_id].filter((id): id is string => Boolean(id)),
    );
    const urlById = new Map(media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
    return {
      title: challenge.title,
      description: challenge.description,
      icon: challenge.icon,
      coverUrl: challenge.cover_media_id ? (urlById.get(challenge.cover_media_id) ?? null) : null,
      endsAt: challenge.ends_at,
      entryCount: submissions.length,
      entryPhotos: recent.map((s) => urlById.get(s.media_id)).filter((u): u is string => Boolean(u)),
      tookPartToday: tookPart || Boolean(userId && submissions.some((s) => s.user_id === userId)),
    };
  } catch {
    return null;
  }
});
