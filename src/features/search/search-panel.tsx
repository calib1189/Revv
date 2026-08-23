"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProfilesByUsername, getProfilesByIds } from "@/lib/db/profiles";
import { searchPosts } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { publicMediaUrl } from "@/lib/db/media";
import { Avatar } from "@/features/feed/avatar";
import { SearchIcon, PlayIcon } from "@/components/ui/icons";
import type { Profile } from "@/lib/db/profiles";

interface PostResult {
  id: string;
  authorUsername: string;
  thumbnailUrl: string | null;
  isVideo: boolean;
}

export function SearchPanel() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"accounts" | "posts">("accounts");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [searchedQuery, setSearchedQuery] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timeout = setTimeout(async () => {
      const supabase = createClient();
      const [profileResults, postResults] = await Promise.all([
        searchProfilesByUsername(supabase, trimmed),
        searchPosts(supabase, trimmed),
      ]);
      setProfiles(profileResults);

      if (postResults.length === 0) {
        setPosts([]);
      } else {
        const [media, authors] = await Promise.all([
          listPostMediaForPosts(supabase, postResults.map((p) => p.id)),
          getProfilesByIds(supabase, [...new Set(postResults.map((p) => p.author_id))]),
        ]);
        const authorUsernameById = new Map(authors.map((a) => [a.id, a.username]));
        const firstMediaByPost = new Map<string, (typeof media)[number]>();
        for (const item of media) {
          if (!firstMediaByPost.has(item.post_id)) firstMediaByPost.set(item.post_id, item);
        }

        setPosts(
          postResults.map((post) => {
            const firstMedia = firstMediaByPost.get(post.id);
            return {
              id: post.id,
              authorUsername: authorUsernameById.get(post.author_id) ?? "unknown",
              thumbnailUrl: firstMedia
                ? publicMediaUrl(supabase, firstMedia.media.storage_path)
                : null,
              isVideo: post.post_type === "video",
            };
          }),
        );
      }

      setSearchedQuery(trimmed);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const trimmedQuery = query.trim();
  const isSearching = Boolean(trimmedQuery) && searchedQuery !== trimmedQuery;
  const hasSearched = Boolean(trimmedQuery) && searchedQuery === trimmedQuery;

  return (
    <div>
      <div className="glass-inset flex items-center gap-2 rounded-full px-4 py-2.5">
        <SearchIcon className="h-4 w-4 flex-shrink-0 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accounts, cars, #hashtags…"
          autoFocus
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      {trimmedQuery && (
        <>
          <div className="glass mt-4 inline-flex rounded-full p-1">
            <button
              type="button"
              onClick={() => setTab("accounts")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "accounts"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Accounts{hasSearched ? ` (${profiles.length})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setTab("posts")}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === "posts"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Posts{hasSearched ? ` (${posts.length})` : ""}
            </button>
          </div>

          <div className="mt-4">
            {isSearching ? (
              <p className="text-sm text-muted">Searching…</p>
            ) : tab === "accounts" ? (
              profiles.length > 0 ? (
                <ul className="flex flex-col divide-y divide-border">
                  {profiles.map((profile) => (
                    <li key={profile.id}>
                      <Link
                        href={`/u/${profile.username}`}
                        className="flex items-center gap-3 py-3 hover:opacity-80"
                      >
                        <Avatar username={profile.username} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">@{profile.username}</p>
                          {profile.bio && (
                            <p className="truncate text-xs text-muted">{profile.bio}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : hasSearched ? (
                <p className="text-sm text-muted">
                  No accounts found for &ldquo;{trimmedQuery}&rdquo;.
                </p>
              ) : null
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/p/${post.id}`}
                    className="group relative aspect-[3/4] overflow-hidden rounded-md bg-surface"
                  >
                    {post.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- small grid thumbnail, next/image fill overhead isn't worth it here
                      <img
                        src={post.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                    {post.isVideo && (
                      <PlayIcon className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white drop-shadow" />
                    )}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-1.5 pb-1 pt-3 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                      @{post.authorUsername}
                    </span>
                  </Link>
                ))}
              </div>
            ) : hasSearched ? (
              <p className="text-sm text-muted">
                No posts found for &ldquo;{trimmedQuery}&rdquo;.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
