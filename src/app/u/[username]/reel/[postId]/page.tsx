import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { listPostsByAuthor } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { ProfileReelFeed } from "@/features/profile/profile-reel-feed";

export default async function ProfileReelPage({
  params,
}: {
  params: Promise<{ username: string; postId: string }>;
}) {
  const { username, postId } = await params;
  const supabase = await createClient();

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(supabase, username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const posts = await listPostsByAuthor(supabase, profile.id);
  const targetIndex = posts.findIndex((p) => p.id === postId);
  if (targetIndex === -1) notFound();

  // Tapped post plays first; the rest of this profile's posts follow in
  // their normal order, so swiping continues through the rest of their feed.
  const ordered = [
    posts[targetIndex],
    ...posts.slice(0, targetIndex),
    ...posts.slice(targetIndex + 1),
  ];
  const cards = await composePostCards(supabase, ordered, currentUser?.id ?? null);

  return (
    <ProfileReelFeed
      posts={cards}
      isAuthenticated={Boolean(currentUser)}
      backHref={`/u/${username}`}
    />
  );
}
