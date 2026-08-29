import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listRankedFeedPosts } from "@/lib/ranking/ranked-feed";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { listActiveCampaigns } from "@/lib/db/ad-campaigns";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { SwipeFeed } from "@/features/feed/swipe-feed";
import type { SponsoredSlideData } from "@/features/feed/sponsored-slide";

export async function FeedPageContent() {
  const supabase = await createClient();
  const [user, activeCampaigns] = await Promise.all([
    getCurrentUser(),
    listActiveCampaigns(supabase),
  ]);
  const { items } = await listRankedFeedPosts(supabase, { viewerId: user?.id ?? null, limit: 8 });
  const cards = await composePostCards(supabase, items.map((item) => item.post), user?.id ?? null);
  const cardsWithCursor = cards.map((card, i) => ({ ...card, rankCursor: items[i].cursor }));

  // One ad slot, not a real rotation/pacing system — picking whichever
  // active campaign happens to be first is an honest reflection of that
  // rather than pretending there's inventory management behind it.
  const campaign = activeCampaigns[0] ?? null;
  let ad: SponsoredSlideData | null = null;
  if (campaign) {
    const media = await getMediaById(supabase, campaign.media_id);
    ad = {
      campaignId: campaign.id,
      headline: campaign.headline,
      caption: campaign.caption,
      destinationUrl: campaign.destination_url,
      photoUrl: media ? publicMediaUrl(supabase, media.storage_path) : null,
    };
  }

  return <SwipeFeed initialPosts={cardsWithCursor} ad={ad} isAuthenticated={Boolean(user)} />;
}
