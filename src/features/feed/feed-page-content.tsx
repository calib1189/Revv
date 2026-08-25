import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listFeedPosts } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { SwipeFeed } from "@/features/feed/swipe-feed";

export async function FeedPageContent() {
  const supabase = await createClient();
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listFeedPosts(supabase, { limit: 8 }),
  ]);
  const cards = await composePostCards(supabase, posts, user?.id ?? null);

  return <SwipeFeed initialPosts={cards} isAuthenticated={Boolean(user)} />;
}
