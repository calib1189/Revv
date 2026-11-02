import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { isAdBillingConfigured } from "@/lib/billing/config";
import { listCampaignsByAdvertiser, getEventCountsForCampaign } from "@/lib/db/ad-campaigns";
import { AdvertiseOverview } from "@/features/ads/advertise-overview";

export default async function AdvertisePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/advertise");

  const { success } = await searchParams;
  const supabase = await createClient();
  const campaigns = await listCampaignsByAdvertiser(supabase, user.id);
  const eventCounts = await Promise.all(
    campaigns
      .filter((c) => c.status === "active" || c.status === "ended")
      .map(async (c) => [c.id, await getEventCountsForCampaign(supabase, c.id)] as const),
  );

  return (
    <AdvertiseOverview
      campaigns={campaigns}
      eventCountsById={new Map(eventCounts)}
      success={Boolean(success)}
      billingReady={isAdBillingConfigured()}
    />
  );
}
