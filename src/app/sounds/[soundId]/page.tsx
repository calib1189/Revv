import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSoundById, getSoundUsageCount, publicSoundUrl } from "@/lib/db/sounds";
import { listPostsBySound } from "@/lib/db/posts";
import { composeThumbnails } from "@/lib/feed/compose-thumbnails";
import { PostThumbnailGrid } from "@/features/profile/post-thumbnail-grid";
import { SoundCredit } from "@/features/sounds/sound-credit";
import { SoundBackButton, SoundPreview } from "@/features/sounds/sound-preview";
import { MusicIcon } from "@/components/ui/icons";
import { formatCompactNumber } from "@/lib/format/compact-number";

/**
 * A sound's own page, opened from the spinning disc on a video: the
 * sound (tap the cover to hear it), how many videos use it, a button to
 * make your own with it, and every video that has, newest first. Tapping
 * one plays them all in a reel from there.
 */
export default async function SoundPage({ params }: { params: Promise<{ soundId: string }> }) {
  const { soundId } = await params;
  const supabase = await createClient();

  const sound = await getSoundById(supabase, soundId);
  if (!sound) notFound();

  const [posts, usageCount] = await Promise.all([
    listPostsBySound(supabase, sound.id, { limit: 60 }),
    getSoundUsageCount(supabase, sound.id),
  ]);
  const thumbnails = await composeThumbnails(supabase, posts);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 pb-16 pt-3">
      <div className="px-4">
        <SoundBackButton />

        <header className="mt-2 flex items-center gap-4">
          <SoundPreview soundId={sound.id} url={publicSoundUrl(supabase, sound.storage_path)} title={sound.title} />
          <div className="min-w-0">
            <h1 className="line-clamp-2 text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">{sound.title}</h1>
            <p className="mt-0.5 truncate text-[0.9375rem] text-muted">{sound.artist_name || "Unknown artist"}</p>
            <p className="mt-1.5 text-[0.8125rem] text-muted">
              <span className="numeral font-semibold text-foreground">{formatCompactNumber(usageCount)}</span>{" "}
              {usageCount === 1 ? "video" : "videos"}
            </p>
          </div>
        </header>

        <SoundCredit sound={sound} className="mt-3 text-muted" />

        <Link
          href={`/feed/new?soundId=${sound.id}`}
          className="pressable mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[0.9375rem] font-semibold text-accent-foreground"
        >
          <MusicIcon className="h-[18px] w-[18px]" />
          Make a video with this sound
        </Link>
      </div>

      {thumbnails.length > 0 ? (
        <section className="mt-7" aria-label="Videos with this sound">
          <h2 className="mb-2.5 px-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-muted">Videos</h2>
          <PostThumbnailGrid posts={thumbnails} hrefFor={(post) => `/sounds/${sound.id}/reel/${post.postId}`} />
        </section>
      ) : (
        <p className="mt-10 px-4 text-center text-[0.9375rem] text-muted">No videos use this sound yet. Be the first.</p>
      )}
    </div>
  );
}
