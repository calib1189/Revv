"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listVideoPosts } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import type { PostCardData } from "@/features/feed/post-card";

export async function loadMoreDiscoverPostsAction(
  before: string,
): Promise<PostCardData[]> {
  const supabase = await createClient();
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listVideoPosts(supabase, { before, limit: 6 }),
  ]);

  return composePostCards(supabase, posts, user?.id ?? null);
}
