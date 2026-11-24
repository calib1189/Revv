import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listRankedFeedPosts } from "@/lib/ranking/ranked-feed";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { listActiveCampaigns } from "@/lib/db/ad-campaigns";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { SwipeFeed } from "@/features/feed/swipe-feed";
import { loadDailyTeaser } from "@/lib/daily/teaser";
import { loadStoryTray, type TrayPerson } from "@/lib/stories/load";
import type { SponsoredSlideData } from "@/features/feed/sponsored-slide";
import { isNewViewer, loadJustRated, loadTopBuilds, type JustRatedSlideData } from "@/lib/feed/just-rated";
import { loadFeedDrop } from "@/lib/merch/feed-drop";
import { getProfileByUserId } from "@/lib/db/profiles";

export async function FeedPageContent() {
  const supabase = await createClient();
  // One ad slot, not a real rotation/pacing system — picking whichever
  // active campaign happens to be first is an honest reflection of that
  // rather than pretending there's inventory management behind it. It
  // doesn't depend on the viewer or the posts, so it loads alongside them
  // instead of after them.
  const adPromise = listActiveCampaigns(supabase).then(async (campaigns): Promise<SponsoredSlideData | null> => {
    const campaign = campaigns[0] ?? null;
    if (!campaign) return null;
    const media = await getMediaById(supabase, campaign.media_id);
    return {
      campaignId: campaign.id,
      headline: campaign.headline,
      caption: campaign.caption,
      destinationUrl: campaign.destination_url,
      photoUrl: media ? publicMediaUrl(supabase, media.storage_path) : null,
    };
  // Best-effort, and caught here rather than at the await: an ad failing
  // to load is never a reason for the feed itself to fail.
  }).catch(() => null);
  const user = await getCurrentUser();
  const profilePromise = user ? getProfileByUserId(supabase, user.id) : Promise.resolve(null);
  const [{ items }, dailyTeaser, storyTray, justRated, drop, topBuilds] = await Promise.all([
    listRankedFeedPosts(supabase, { viewerId: user?.id ?? null, limit: 8 }),
    loadDailyTeaser(user?.id ?? null),
    user ? loadStoryTray(supabase, user.id).catch(() => [] as TrayPerson[]) : Promise.resolve([] as TrayPerson[]),
    // Like the ad: extra, so failing to load is never the feed failing.
    loadJustRated(supabase, user?.id ?? null).catch(() => [] as JustRatedSlideData[]),
    // Likewise extra. Admins see a drop before tees are switched on for everyone.
    user
      ? profilePromise.then((p) => loadFeedDrop(supabase, user.id, p?.is_admin ?? false)).catch(() => null)
      : Promise.resolve(null),
    // Someone new opens on the best builds on SORZA, so the first thing
    // they see is the bar, not however few posts went up this week.
    profilePromise
      .then((p) => ((user ? p !== null && isNewViewer(p.created_at) : true) ? loadTopBuilds(supabase) : []))
      .catch(() => [] as JustRatedSlideData[]),
  ]);
  const [cards, ad] = await Promise.all([
    composePostCards(supabase, items.map((item) => item.post), user?.id ?? null),
    adPromise,
  ]);
  const cardsWithCursor = cards.map((card, i) => ({ ...card, rankCursor: items[i].cursor }));

  // Today's challenge leads the feed until you've taken part today.
  const daily = dailyTeaser && !dailyTeaser.tookPartToday ? dailyTeaser : null;

  return (
    <SwipeFeed
      initialPosts={cardsWithCursor}
      ad={ad}
      daily={daily}
      justRated={justRated.filter((j) => !topBuilds.some((t) => t.vehicleId === j.vehicleId))}
      topBuilds={topBuilds}
      drop={drop}
      isAuthenticated={Boolean(user)}
      storyTray={storyTray}
    />
  );
}
