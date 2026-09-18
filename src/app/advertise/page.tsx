import { redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/grouped-list";
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
    <PageShell>
      <PageHeader
        title="Advertise"
        back={{ href: "/settings", label: "Settings" }}
        description="Put your shop, brand, or product in front of real car builders. Every ad is clearly labeled Sponsored and reviewed before it goes live."
      />

      {success && (
        <div className="mb-6">
          <Callout tone="muted">
            Payment received — your ad is now waiting on review. It&apos;ll
            appear in the feed once approved.
          </Callout>
        </div>
      )}

      {campaigns.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Your campaigns</SectionTitle>
          <div className="flex flex-col gap-3">
            {campaigns.map((campaign) => {
              const counts = eventCountsById.get(campaign.id);
              const ctr =
                counts && counts.impressions > 0
                  ? `${((counts.clicks / counts.impressions) * 100).toFixed(1)}%`
                  : null;
              const live = campaign.status === "active";
              return (
                <div key={campaign.id} className="glass-raised elev-1 rounded-[22px] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-[0.9375rem] font-semibold">{campaign.headline}</p>
                    <span className="flex-shrink-0 rounded-full bg-accent/12 px-2.5 py-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-accent">
                      {AD_TIERS[campaign.tier].label}
                    </span>
                  </div>
                  <p className={`mt-1 flex items-center gap-1.5 text-[0.8125rem] ${live ? "text-success" : "text-muted"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-success" : "bg-muted"}`} />
                    {STATUS_LABELS[campaign.status] ?? campaign.status}
                  </p>

                  {counts && (
                    <div className="mt-3 flex items-stretch border-t border-border pt-3">
                      {[
                        { label: "Views", value: formatCompactNumber(counts.impressions), icon: EyeIcon },
                        { label: "Clicks", value: formatCompactNumber(counts.clicks), icon: PointerIcon },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="min-w-0 flex-1">
                          <p className="numeral text-[1.25rem] leading-none">{value}</p>
                          <p className="mt-1 flex items-center gap-1 text-[0.75rem] text-muted">
                            <Icon className="h-3 w-3" />
                            {label}
                          </p>
                        </div>
                      ))}
                      {ctr && (
                        <div className="min-w-0 flex-1">
                          <p className="numeral text-[1.25rem] leading-none">{ctr}</p>
                          <p className="mt-1 text-[0.75rem] text-muted">Click rate</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!isAdBillingConfigured() ? (
        <Callout tone="muted">
          Ad billing isn&apos;t set up yet. Add{" "}
          <code className="text-foreground">STRIPE_SECRET_KEY</code> to enable
          it.
        </Callout>
      ) : (
        <section>
          <SectionTitle>{campaigns.length > 0 ? "New campaign" : "Create a campaign"}</SectionTitle>
          <AdCampaignForm userId={user.id} />
        </section>
      )}
    </PageShell>
  );
}
