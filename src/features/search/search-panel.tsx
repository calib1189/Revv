"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchProfilesByUsername, getProfilesByIds } from "@/lib/db/profiles";
import { searchPosts } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { publicMediaUrl } from "@/lib/db/media";
import { PeopleList } from "@/features/profile/people-list";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { SearchIcon, PlayIcon, CloseIcon } from "@/components/ui/icons";
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
      {/* iOS search field: a tinted rounded rectangle, glyph inside,
          clear button once there's text. */}
      <div
        className="flex h-11 items-center gap-2 rounded-[12px] px-3"
        style={{ background: "var(--segment-track)" }}
      >
        <SearchIcon className="h-[18px] w-[18px] flex-shrink-0 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Accounts, cars, #hashtags"
          autoFocus
          aria-label="Search"
          className="w-full bg-transparent text-foreground placeholder:text-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-muted/60 text-background"
          >
            <CloseIcon className="h-3 w-3" />
          </button>
        )}
      </div>

      {!trimmedQuery && (
        <EmptyState
          icon={<SearchIcon />}
          title="Search SORZA"
          body="Find builders by username, or posts by car, caption, or #hashtag."
        />
      )}

      {trimmedQuery && (
        <>
          <SegmentedControl
            className="mt-4"
            options={[
              { value: "accounts", label: hasSearched ? `Accounts · ${profiles.length}` : "Accounts" },
              { value: "posts", label: hasSearched ? `Posts · ${posts.length}` : "Posts" },
            ]}
            value={tab}
            onChange={setTab}
          />

          <div className="mt-5">
            {isSearching ? (
              <div className="flex justify-center py-12">
                <Spinner className="h-5 w-5 text-muted" />
              </div>
            ) : tab === "accounts" ? (
              profiles.length > 0 ? (
                <PeopleList profiles={profiles} />
              ) : hasSearched ? (
                <EmptyState title="No accounts" body={`Nothing matches “${trimmedQuery}”.`} />
              ) : null
            ) : posts.length > 0 ? (
              <div className="grid grid-cols-3 gap-[3px] overflow-hidden rounded-[16px]">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/p/${post.id}`}
                    className="group relative aspect-[3/4] overflow-hidden bg-surface"
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
              <EmptyState title="No posts" body={`Nothing matches “${trimmedQuery}”.`} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
