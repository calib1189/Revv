import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listSavedPosts } from "@/lib/db/saves";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { PostCard } from "@/features/feed/post-card";
import { Button } from "@/components/ui/button";

export default async function SavedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/saved");

  const supabase = await createClient();
  const posts = await listSavedPosts(supabase, user.id);
  const cards = await composePostCards(supabase, posts, user.id);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Saved</h1>

      {cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border py-24 text-center">
          <p className="text-lg font-medium">No saved posts</p>
          <p className="max-w-xs text-sm text-muted">
            Posts you save will show up here.
          </p>
          <Link href="/feed">
            <Button variant="secondary">Browse the feed</Button>
          </Link>
        </div>
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
