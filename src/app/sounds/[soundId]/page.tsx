import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getSoundById, getSoundUsageCount } from "@/lib/db/sounds";
import { listPostsBySound } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { ProfileReelFeed } from "@/features/profile/profile-reel-feed";
import { SoundReelHeader } from "@/features/sounds/sound-reel-header";
import { MusicIcon } from "@/components/ui/icons";

export default async function SoundPage({
  params,
}: {
  params: Promise<{ soundId: string }>;
}) {
  const { soundId } = await params;
  const supabase = await createClient();

  const [sound, currentUser] = await Promise.all([
    getSoundById(supabase, soundId),
    getCurrentUser(),
  ]);
  if (!sound) notFound();

  const [posts, usageCount] = await Promise.all([
    listPostsBySound(supabase, sound.id, { limit: 50 }),
    getSoundUsageCount(supabase, sound.id),
  ]);

  if (posts.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
        <MusicIcon className="h-10 w-10 text-muted" />
        <div>
          <p className="text-lg font-semibold">{sound.title}</p>
          <p className="text-sm text-muted">{sound.artist_name || "Unknown artist"}</p>
        </div>
        <p className="text-sm text-muted">No videos use this sound yet — be the first.</p>
        <Link
          href={`/feed/new?soundId=${sound.id}`}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Use this sound
        </Link>
      </div>
    );
  }

  const cards = await composePostCards(supabase, posts, currentUser?.id ?? null);

  return (
    <ProfileReelFeed
      posts={cards}
      isAuthenticated={Boolean(currentUser)}
      backHref="/discover"
      headerContent={<SoundReelHeader sound={sound} usageCount={usageCount} />}
    />
  );
}
