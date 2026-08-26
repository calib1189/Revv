import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listFeedPosts } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { listActiveCampaigns } from "@/lib/db/ad-campaigns";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { SwipeFeed } from "@/features/feed/swipe-feed";
import type { SponsoredSlideData } from "@/features/feed/sponsored-slide";

export async function FeedPageContent() {
  const supabase = await createClient();
  const [user, posts, activeCampaigns] = await Promise.all([
    getCurrentUser(),
    listFeedPosts(supabase, { limit: 8 }),
    listActiveCampaigns(supabase),
  ]);
  const cards = await composePostCards(supabase, posts, user?.id ?? null);

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

  return <SwipeFeed initialPosts={cards} ad={ad} isAuthenticated={Boolean(user)} />;
}
