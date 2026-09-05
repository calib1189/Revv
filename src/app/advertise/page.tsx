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
import { EyeIcon, PointerIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

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
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Advertise on SORZA</h1>
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
          <div className="flex flex-col gap-2.5">
            {campaigns.map((campaign) => {
              const counts = eventCountsById.get(campaign.id);
              const ctr =
                counts && counts.impressions > 0
                  ? `${((counts.clicks / counts.impressions) * 100).toFixed(1)}% CTR`
                  : null;
              return (
                <div key={campaign.id} className="flex flex-col gap-3 rounded-2xl border border-border p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{campaign.headline}</p>
                    <span className="flex-shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                      {AD_TIERS[campaign.tier].label}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{STATUS_LABELS[campaign.status] ?? campaign.status}</p>

                  {counts && (
                    <div className="flex items-center gap-4 border-t border-border pt-3 text-sm">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <EyeIcon className="h-4 w-4 text-muted" />
                        <span className="font-medium">{formatCompactNumber(counts.impressions)}</span>
                        <span className="text-xs text-muted">views</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-foreground">
                        <PointerIcon className="h-4 w-4 text-muted" />
                        <span className="font-medium">{formatCompactNumber(counts.clicks)}</span>
                        <span className="text-xs text-muted">clicks</span>
                      </span>
                      {ctr && <span className="ml-auto text-xs text-muted">{ctr}</span>}
                    </div>
                  )}
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
        <div className="flex flex-col gap-4">
          {campaigns.length > 0 && (
            <h2 className="text-sm font-medium text-muted">New campaign</h2>
          )}
          <AdCampaignForm userId={user.id} />
        </div>
      )}

      <Link href="/feed" className="mt-8 inline-block text-sm text-muted hover:text-foreground">
        ← Back to SORZA
      </Link>
    </div>
  );
}
