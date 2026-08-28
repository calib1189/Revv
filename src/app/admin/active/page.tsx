import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listActiveCampaigns, AD_TIERS } from "@/lib/db/ad-campaigns";
import { listAllActiveShopPromotions, SHOP_PROMOTION_TIERS } from "@/lib/db/shop-promotions";
import { listUpcomingMeetups, MEETUP_TIERS } from "@/lib/db/meetups";
import { formatDateTime } from "@/lib/format/date";
import { EndAdCampaignButton } from "@/features/admin/end-ad-campaign-button";

/** Oversight of everything currently live and paid for — companion to
 * the review queues (which only show what's *waiting* on a decision).
 * Ads can be ended early from here (EndAdCampaignButton, behind a
 * confirm step); shop promotions and meetups stay read-only for now. */
export default async function AdminActivePage() {
  const supabase = await createClient();
  const [campaigns, shopPromotions, meetups] = await Promise.all([
    listActiveCampaigns(supabase),
    listAllActiveShopPromotions(supabase),
    listUpcomingMeetups(supabase),
  ]);

  const ownerIds = [
    ...new Set([
      ...campaigns.map((c) => c.advertiser_id),
      ...shopPromotions.map((p) => p.promoter_id),
      ...meetups.map((m) => m.host_id),
    ]),
  ];
  const profiles = await getProfilesByIds(supabase, ownerIds);
  const usernameById = new Map(profiles.map((p) => [p.id, p.username]));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Currently active</h1>
      <p className="mb-8 text-sm text-muted">
        Everything live and paid for right now, across ads, shop promotions, and meetups.
      </p>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted">
          Ads in the feed{campaigns.length > 0 && ` (${campaigns.length})`}
        </h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-muted">No ads currently live.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {campaigns.map((c) => (
              <li key={c.id} className="rounded-2xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{c.headline}</p>
                  <span className="flex-shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                    {AD_TIERS[c.tier].label}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">
                    @{usernameById.get(c.advertiser_id) ?? "unknown"} · ends {formatDateTime(c.ends_at!)}
                  </p>
                  <EndAdCampaignButton campaignId={c.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-muted">
          Promoted shops{shopPromotions.length > 0 && ` (${shopPromotions.length})`}
        </h2>
        {shopPromotions.length === 0 ? (
          <p className="text-sm text-muted">No shop promotions currently active.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {shopPromotions.map((p) => (
              <li key={p.id} className="rounded-2xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-medium">{p.place_name}</p>
                  <span className="flex-shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                    {SHOP_PROMOTION_TIERS[p.tier].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  @{usernameById.get(p.promoter_id) ?? "unknown"} · ends {formatDateTime(p.ends_at!)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted">
          Meetups{meetups.length > 0 && ` (${meetups.length})`}
        </h2>
        {meetups.length === 0 ? (
          <p className="text-sm text-muted">No upcoming meetups.</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {meetups.map((m) => (
              <li key={m.id} className="rounded-2xl border border-border p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/discover/${m.id}`} className="min-w-0 truncate text-sm font-medium hover:underline">
                    {m.title}
                  </Link>
                  <span className="flex-shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
                    {MEETUP_TIERS[m.tier].label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  @{usernameById.get(m.host_id) ?? "unknown"} · {formatDateTime(m.starts_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
