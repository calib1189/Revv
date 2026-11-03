import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listOpenReports } from "@/lib/db/reports";
import { listPendingVerifications } from "@/lib/db/vehicles";
import { listPendingBusinessVerifications } from "@/lib/db/business-profiles";
import { listPendingReviewCampaigns } from "@/lib/db/ad-campaigns";
import { listPendingReviewMeetups } from "@/lib/db/meetups";

export interface AdminQueueCounts {
  reports: number;
  verifications: number;
  businessVerifications: number;
  ads: number;
  meetups: number;
  /** Everything above, together — "how much is waiting on me". */
  total: number;
}

/** How many items sit in each admin review queue right now. One place for
 * it, so the admin sidebar, the dashboard and the Settings badge can't
 * disagree. Admin-only in practice: RLS hides these rows from everyone
 * else, so for anyone else every count is just zero. */
export async function getAdminQueueCounts(supabase: SupabaseClient<Database>): Promise<AdminQueueCounts> {
  const [reports, verifications, ads, meetups] = await Promise.all([
    listOpenReports(supabase),
    listPendingVerifications(supabase),
    listPendingReviewCampaigns(supabase),
    listPendingReviewMeetups(supabase),
  ]);
  // Its own try: a not-yet-applied business_profiles migration shouldn't
  // take the rest of the admin area down with it.
  let businessVerifications = 0;
  try {
    businessVerifications = (await listPendingBusinessVerifications(supabase)).length;
  } catch {
    businessVerifications = 0;
  }

  const counts = {
    reports: reports.length,
    verifications: verifications.length,
    businessVerifications,
    ads: ads.length,
    meetups: meetups.length,
  };
  return { ...counts, total: Object.values(counts).reduce((sum, n) => sum + n, 0) };
}
