import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listVideoPosts } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { DiscoverFeed } from "@/features/discover/discover-feed";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listVideoPosts(supabase, { limit: 6 }),
  ]);
  const cards = await composePostCards(supabase, posts, user?.id ?? null);

  return <DiscoverFeed initialPosts={cards} />;
}
