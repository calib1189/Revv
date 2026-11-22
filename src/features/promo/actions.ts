"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getPostById } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { insertAdminGrant } from "@/lib/db/points";
import { isPostBonusLive, POST_BONUS } from "@/lib/promo/post-bonus";

/** Pays the weekend post bonus (lib/promo/post-bonus.ts) for a post just
 * published: the caller's own, made while the offer runs, with a photo
 * or video on it. Once per person, by the ledger's unique key. Returns
 * the points paid, or 0 (not eligible, already paid, or it failed: the
 * post itself is never affected). */
export async function claimPostBonusAction(postId: string): Promise<number> {
  try {
    if (!isPostBonusLive(new Date())) return 0;
    const user = await getCurrentUser();
    if (!user) return 0;
    const supabase = await createClient();
    const post = await getPostById(supabase, postId);
    if (!post || post.author_id !== user.id || !isPostBonusLive(new Date(post.created_at))) return 0;
    const media = await listPostMediaForPosts(supabase, [post.id]);
    if (media.length === 0) return 0;
    const paid = await insertAdminGrant(createServiceRoleClient(), user.id, POST_BONUS.id, POST_BONUS.points);
    return paid ? POST_BONUS.points : 0;
  } catch {
    return 0;
  }
}
