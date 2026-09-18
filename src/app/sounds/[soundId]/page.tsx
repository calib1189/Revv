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
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-16 pt-12 text-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-[26px] bg-gradient-to-br from-accent to-[#ff8a5c] text-white elev-3">
          <MusicIcon className="h-12 w-12" />
        </span>
        <h1 className="mt-5 text-[1.75rem] font-bold leading-tight tracking-[-0.025em]">{sound.title}</h1>
        <p className="mt-0.5 text-[1rem] text-muted">{sound.artist_name || "Unknown artist"}</p>
        <p className="mt-6 text-[0.9375rem] text-muted">No videos use this sound yet. Be the first.</p>
        <Link
          href={`/feed/new?soundId=${sound.id}`}
          className="pressable mt-5 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-accent text-[1rem] font-semibold text-accent-foreground"
        >
          <MusicIcon className="h-4 w-4" />
          Use This Sound
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
