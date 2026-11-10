import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listDailyChallengesBetween, type DailyChallenge } from "@/lib/db/daily";
import { addDays, dailyDateKey, weekdayOf } from "@/lib/daily/day";
import { WEEKDAY_ROTATION } from "@/lib/daily/rotation";
import { AdminDailySchedule, type ScheduleDay } from "@/features/daily/admin-daily-schedule";

// Two months: sponsors book their day weeks ahead.
const DAYS_AHEAD = 60;

/** The next two weeks of Sorza Daily. Each day shows what will run: the
 * challenge an admin scheduled, or the weekday rotation if nobody did. */
export default async function AdminDailyPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const today = dailyDateKey();
  const last = addDays(today, DAYS_AHEAD - 1);

  let scheduled: DailyChallenge[] = [];
  let available = true;
  try {
    scheduled = await listDailyChallengesBetween(supabase, today, last);
  } catch {
    available = false;
  }
  const covers = await getMediaByIds(
    supabase,
    scheduled.flatMap((c) => [c.cover_media_id, c.sponsor_logo_media_id]).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const coverUrlById = new Map(covers.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const byDate = new Map(scheduled.map((c) => [c.challenge_date, c]));

  const days: ScheduleDay[] = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const dateKey = addDays(today, i);
    const row = byDate.get(dateKey);
    const fallback = WEEKDAY_ROTATION[weekdayOf(dateKey)];
    return {
      dateKey,
      isToday: i === 0,
      isCustom: Boolean(row?.created_by),
      title: row?.title ?? fallback.title,
      description: row?.description ?? fallback.description,
      icon: row?.icon ?? fallback.icon,
      coverMediaId: row?.cover_media_id ?? null,
      coverUrl: row?.cover_media_id ? (coverUrlById.get(row.cover_media_id) ?? null) : null,
      // Undefined until 0109 is applied, hence the ?? null.
      sponsorName: row?.sponsor_name ?? null,
      sponsorUrl: row?.sponsor_url ?? null,
      sponsorLogoMediaId: row?.sponsor_logo_media_id ?? null,
      sponsorLogoUrl: row?.sponsor_logo_media_id ? (coverUrlById.get(row.sponsor_logo_media_id) ?? null) : null,
      prize: row?.prize ?? null,
    };
  });

  return (
    <PageShell width="2xl">
      <PageHeader
        title="Sorza Daily"
        back={{ href: "/admin", label: "Admin" }}
        description="Days nobody schedules run the weekday rotation. Editing today changes it right away and keeps the entries already in. Sponsors and prizes are set per day."
      />
      {available && user ? (
        <AdminDailySchedule days={days} adminId={user.id} />
      ) : (
        <p className="text-[0.875rem] text-muted">Apply migration 0103 to schedule challenges.</p>
      )}
    </PageShell>
  );
}
