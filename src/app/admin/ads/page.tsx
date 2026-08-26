import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listPendingReviewCampaigns, AD_TIERS } from "@/lib/db/ad-campaigns";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { AdminNav } from "@/features/admin/admin-nav";
import { AdCampaignRow, type AdCampaignRowData } from "@/features/admin/ad-campaign-row";

export default async function AdminAdsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/ads");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const campaigns = await listPendingReviewCampaigns(supabase);
  const advertisers = await Promise.all(
    campaigns.map((c) => getProfileByUserId(supabase, c.advertiser_id)),
  );
  const usernameByAdvertiserId = new Map(
    advertisers.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  const media = await getMediaByIds(supabase, campaigns.map((c) => c.media_id));
  const photoUrlByMediaId = new Map(
    media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const rows: AdCampaignRowData[] = campaigns.map((campaign) => ({
    campaignId: campaign.id,
    headline: campaign.headline,
    caption: campaign.caption,
    destinationUrl: campaign.destination_url,
    advertiserUsername: usernameByAdvertiserId.get(campaign.advertiser_id) ?? "unknown",
    tierLabel: AD_TIERS[campaign.tier].label,
    priceCents: campaign.price_cents,
    photoUrl: photoUrlByMediaId.get(campaign.media_id) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Ad review</h1>
        <AdminNav current="/admin/ads" />
      </div>
      <p className="mb-6 text-sm text-muted">
        Paid and waiting on you — approving puts it live in the feed
        immediately, labeled &ldquo;Sponsored,&rdquo; for its paid duration
        starting now.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing waiting on review.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <AdCampaignRow key={row.campaignId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
