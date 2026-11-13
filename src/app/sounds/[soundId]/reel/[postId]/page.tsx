import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getSoundById } from "@/lib/db/sounds";
import { listPostsBySound } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { ProfileReelFeed } from "@/features/profile/profile-reel-feed";

/** Every video with a sound, as a reel: the one you tapped first, then
 * the rest in the sound page's order. */
export default async function SoundReelPage({ params }: { params: Promise<{ soundId: string; postId: string }> }) {
  const { soundId, postId } = await params;
  const supabase = await createClient();
  const [sound, currentUser] = await Promise.all([getSoundById(supabase, soundId), getCurrentUser()]);
  if (!sound) notFound();

  const posts = await listPostsBySound(supabase, sound.id, { limit: 60 });
  const target = posts.findIndex((p) => p.id === postId);
  if (target === -1) notFound();
  const ordered = [posts[target], ...posts.slice(0, target), ...posts.slice(target + 1)];
  const cards = await composePostCards(supabase, ordered, currentUser?.id ?? null);

  return <ProfileReelFeed posts={cards} isAuthenticated={Boolean(currentUser)} backHref={`/sounds/${sound.id}`} />;
}
