import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listSavedPosts } from "@/lib/db/saves";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { PostCard } from "@/features/feed/post-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BookmarkIcon } from "@/components/ui/icons";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/saved");

  const supabase = await createClient();
  const posts = await listSavedPosts(supabase, user.id);
  const cards = await composePostCards(supabase, posts, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <p className="text-[0.8125rem] font-medium text-muted">
        {cards.length === 0 ? "Nothing yet" : `${cards.length} ${cards.length === 1 ? "post" : "posts"}`}
      </p>
      <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Saved</h1>

      {cards.length === 0 ? (
        <EmptyState
          card
          icon={<BookmarkIcon />}
          title="No saved posts"
          body="Tap the bookmark on any post to keep it here."
          action={
            <Link href="/feed">
              <Button className="px-5">Browse the feed</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {cards.map((card) => (
            <PostCard key={card.post.id} data={card} />
          ))}
        </div>
      )}
    </div>
  );
}
