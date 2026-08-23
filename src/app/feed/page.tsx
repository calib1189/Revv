import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listFeedPosts } from "@/lib/db/posts";
import { composePostCards } from "@/lib/feed/compose-post-cards";
import { PostCard } from "@/features/feed/post-card";
import { Button } from "@/components/ui/button";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const { before } = await searchParams;
  const supabase = await createClient();
  const [user, posts] = await Promise.all([
    getCurrentUser(),
    listFeedPosts(supabase, { before, limit: 12 }),
  ]);

  const cards = await composePostCards(supabase, posts, user?.id ?? null);
  const lastPost = posts[posts.length - 1];

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
        {user && (
          <Link href="/feed/new">
            <Button className="px-3 py-1.5 text-sm">New post</Button>
          </Link>
        )}
      </div>

      {cards.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center gap-4 rounded-2xl py-24 text-center">
          <p className="text-lg font-medium">No posts yet</p>
          <p className="max-w-xs text-sm text-muted">
            {user
              ? "Share something from your garage to get the feed started."
              : "Log in to be the first to post."}
          </p>
          <Link href={user ? "/feed/new" : "/login"}>
            <Button>{user ? "Create a post" : "Log in"}</Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {cards.map((card) => (
            <PostCard key={card.post.id} data={card} />
          ))}
        </div>
      )}

      {posts.length === 12 && lastPost && (
        <div className="mt-8 flex justify-center">
          <Link href={`/feed?before=${encodeURIComponent(lastPost.created_at)}`}>
            <Button variant="secondary">Load more</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
