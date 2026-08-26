import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { isAdBillingConfigured } from "@/lib/billing/config";
import {
  listCampaignsByAdvertiser,
  getEventCountsForCampaign,
  AD_TIERS,
} from "@/lib/db/ad-campaigns";
import { AdCampaignForm } from "@/features/ads/ad-campaign-form";
import { Callout } from "@/components/ui/callout";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  pending_review: "In review",
  active: "Live",
  rejected: "Not approved",
  ended: "Ended",
};

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
  const eventCountsById = new Map(eventCounts);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Advertise on REVV</h1>
      <p className="mb-6 text-sm text-muted">
        Put your shop, brand, or product in front of real car builders. Every
        ad is clearly labeled &ldquo;Sponsored&rdquo; and reviewed before it
        goes live.
      </p>

      {success && (
        <div className="mb-6">
          <Callout tone="muted">
            Payment received — your ad is now waiting on review. It&apos;ll
            appear in the feed once approved.
          </Callout>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-sm font-medium text-muted">Your campaigns</h2>
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {campaigns.map((campaign) => {
              const counts = eventCountsById.get(campaign.id);
              return (
                <div key={campaign.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{campaign.headline}</p>
                    <p className="text-xs text-muted">
                      {STATUS_LABELS[campaign.status] ?? campaign.status} ·{" "}
                      {AD_TIERS[campaign.tier].label}
                      {counts && ` · ${counts.impressions} views · ${counts.clicks} clicks`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isAdBillingConfigured() ? (
        <Callout tone="muted">
          Ad billing isn&apos;t set up yet. Add{" "}
          <code className="text-foreground">STRIPE_SECRET_KEY</code> to enable
          it.
        </Callout>
      ) : (
        <AdCampaignForm userId={user.id} />
      )}

      <Link href="/feed" className="mt-8 inline-block text-sm text-muted hover:text-foreground">
        ← Back to REVV
      </Link>
    </div>
  );
}
