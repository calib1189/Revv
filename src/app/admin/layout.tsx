import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listOpenReports } from "@/lib/db/reports";
import { listPendingVerifications } from "@/lib/db/vehicles";
import { listPendingBusinessVerifications } from "@/lib/db/business-profiles";
import { listPendingReviewCampaigns } from "@/lib/db/ad-campaigns";
import { listPendingReviewMeetups } from "@/lib/db/meetups";
import { AdminNav } from "@/features/admin/admin-nav";

/** Single admin auth gate + persistent nav for every /admin/* route —
 * previously each page independently redirected on its own and rendered
 * its own copy of AdminNav, so adding a section meant touching every
 * existing page and there was no shared "what needs attention right
 * now" view across the whole admin surface. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const [reports, verifications, ads, meetups] = await Promise.all([
    listOpenReports(supabase),
    listPendingVerifications(supabase),
    listPendingReviewCampaigns(supabase),
    listPendingReviewMeetups(supabase),
  ]);

  // Degrade gracefully if the business_profiles migration hasn't been
  // applied yet — same reasoning as header.tsx's messaging fetch. This is
  // the whole admin section's shared layout, so a missing table here
  // would otherwise take down every /admin/* page, not just the new one.
  let businessVerifications: Awaited<ReturnType<typeof listPendingBusinessVerifications>> = [];
  try {
    businessVerifications = await listPendingBusinessVerifications(supabase);
  } catch {
    businessVerifications = [];
  }

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav
        counts={{
          reports: reports.length,
          verifications: verifications.length,
          businessVerifications: businessVerifications.length,
          ads: ads.length,
          meetups: meetups.length,
        }}
      />
      {children}
    </div>
  );
}
