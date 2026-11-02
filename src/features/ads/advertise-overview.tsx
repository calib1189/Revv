import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/grouped-list";
import { AD_TIERS, type AdCampaign, type AdTier } from "@/lib/db/ad-campaigns";
import { CreateAdButton } from "@/features/ads/create-ad-button";
import { SponsoredPreview } from "@/features/ads/sponsored-preview";
import { Callout } from "@/components/ui/callout";
import { EyeIcon, GemIcon, PointerIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  pending_review: "In review",
  active: "Live",
  rejected: "Not approved",
  ended: "Ended",
};

const TIER_ORDER: AdTier[] = ["starter", "standard", "featured"];
/** Same silver/gold/diamond palette the builder's TierPicker uses. */
const TIER_COLORS: Record<AdTier, string> = {
  starter: RANK_TEXT_COLORS.silver,
  standard: RANK_TEXT_COLORS.gold,
  featured: RANK_TEXT_COLORS.diamond,
};

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/** "3, 7 or 14 days" — read from AD_TIERS so the copy can't drift from
 * what's actually sold. */
function durationsSentence(): string {
  const days = TIER_ORDER.map((t) => AD_TIERS[t].durationDays);
  return `${days.slice(0, -1).join(", ")} or ${days[days.length - 1]} days`;
}

/** The overview someone lands on from Settings → Advertise on SORZA:
 * what an ad is, where it shows, how the process goes and what it costs,
 * before anything asks for a photo or a card. The builder itself lives at
 * /advertise/new. Returning advertisers see their campaigns here too. */
export function AdvertiseOverview({
  campaigns,
  eventCountsById,
  success,
  billingReady,
}: {
  campaigns: AdCampaign[];
  /** Views/clicks, only for campaigns that have actually run. */
  eventCountsById: Map<string, { impressions: number; clicks: number }>;
  /** Just back from a completed Stripe checkout. */
  success: boolean;
  billingReady: boolean;
}) {
  const lowestPriceCents = Math.min(...TIER_ORDER.map((t) => AD_TIERS[t].priceCents));

  const steps = [
    {
      title: "Build your ad",
      body: "Add a photo, a headline and the link people should land on. The preview shows exactly how it will look in the feed.",
    },
    {
      title: "Choose how long it runs",
      body: `Your ad stays in the For You feed for ${durationsSentence()}.`,
    },
    {
      title: "SORZA reviews it",
      body: "Every ad is checked before it goes live. You'll get a notification the moment it's approved.",
    },
    {
      title: "Watch the results",
      body: "Views, clicks and click rate for each campaign show up right here.",
    },
  ];

  return (
    <PageShell width="2xl">
      <PageHeader back={{ href: "/settings", label: "Settings" }} className="mb-3" />

      {success && (
        <div className="mb-6">
          <Callout tone="muted">
            Payment received — your ad is now waiting on review. It&apos;ll
            appear in the feed once approved.
          </Callout>
        </div>
      )}

      <section className="animate-section-rise grid items-center gap-9 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10">
        <div>
          <p className="micro-label text-accent">SORZA Ads</p>
          <h1 className="mt-2 text-balance text-[2.25rem] font-bold leading-[1.04] tracking-[-0.035em] sm:text-[2.875rem]">
            Put your brand in front of car builders
          </h1>
          <p className="mt-3 max-w-md text-[1rem] leading-relaxed text-muted">
            Your ad plays full-screen in the For You feed, right between real builds. It&apos;s
            always labeled Sponsored, and SORZA checks every one before it goes live.
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:items-start">
            {billingReady ? (
              <>
                <CreateAdButton className="sm:min-w-[13rem]" />
                <p className="web-only text-center text-[0.8125rem] text-muted sm:text-left">
                  From {dollars(lowestPriceCents)}. You only pay once you&apos;ve built your ad and
                  seen how it looks.
                </p>
              </>
            ) : (
              <Callout tone="muted">
                Ad billing isn&apos;t set up yet. Add{" "}
                <code className="text-foreground">STRIPE_SECRET_KEY</code> to enable it.
              </Callout>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <SponsoredPreview
            badge="Example"
            headline="Your headline goes here"
            caption="A line or two about what you're offering."
            className="w-[214px] -rotate-[1.5deg] sm:w-[236px]"
            media={
              <video
                src="/video/auth-bg.mp4"
                autoPlay
                muted
                loop
                playsInline
                aria-hidden
                className="h-full w-full object-cover"
              />
            }
          />
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="mt-12">
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

      <section className="mt-12">
        <SectionTitle>How it works</SectionTitle>
        <ol className="glass-raised elev-1 overflow-hidden rounded-[22px]">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-3.5 px-4 py-4">
              {i > 0 && <span aria-hidden className="absolute left-[3.75rem] right-0 top-0 h-px bg-border" />}
              <span className="numeral flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-[0.875rem] text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-[0.9375rem] font-semibold leading-tight">{step.title}</p>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="web-only mt-12">
        <SectionTitle>Plans</SectionTitle>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const { label, priceCents, durationDays } = AD_TIERS[tier];
            const color = TIER_COLORS[tier];
            return (
              <div
                key={tier}
                className="glass-raised elev-1 flex items-center gap-3 rounded-[20px] p-4 sm:flex-col sm:items-start sm:gap-4"
              >
                <span
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${color}26`, color }}
                >
                  <GemIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold" style={{ color }}>
                    {label}
                  </p>
                  <p className="text-[0.8125rem] text-muted">{durationDays} days in the feed</p>
                </div>
                <p className="text-[1.375rem] font-bold tabular-nums leading-none">{dollars(priceCents)}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-3 px-1 text-[0.8125rem] leading-relaxed text-muted">
          Plans only differ in how long your ad runs. It&apos;s one card payment through Stripe, with
          no subscription.
        </p>
      </section>

      {billingReady && (
        <section className="glass-raised elev-1 mt-12 flex flex-col items-center gap-4 rounded-[26px] px-5 py-7 text-center">
          <div>
            <p className="text-[1.125rem] font-semibold tracking-[-0.01em]">Build it, see it, then decide</p>
            <p className="web-only mt-1 text-[0.875rem] text-muted">Nothing is charged until the last step.</p>
          </div>
          <CreateAdButton className="w-full sm:w-auto sm:min-w-[13rem]" />
        </section>
      )}
    </PageShell>
  );
}
