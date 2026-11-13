// Server-only. Assembles story data for the stories row, the avatar
// rings, and the viewer.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listFollowingIds } from "@/lib/db/follows";
import { listBlockedEitherDirection } from "@/lib/db/blocks";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listLiveStoriesByAuthors, listSeenStoryIds } from "@/lib/db/stories";
import { buildTray, type TrayEntry } from "@/lib/stories/tray";

export type RingState = "unseen" | "seen";

export interface StoryPerson {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface TrayPerson extends TrayEntry {
  username: string;
  avatarUrl: string | null;
}

/** Usernames and avatar URLs for a set of people. */
export async function loadStoryPeople(supabase: SupabaseClient<Database>, ids: string[]): Promise<Map<string, StoryPerson>> {
  const profiles = await getProfilesByIds(supabase, ids);
  const avatars = await getMediaByIds(
    supabase,
    profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const urlById = new Map(avatars.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  return new Map(
    profiles.map((p) => [
      p.id,
      { id: p.id, username: p.username, avatarUrl: p.avatar_media_id ? (urlById.get(p.avatar_media_id) ?? null) : null },
    ]),
  );
}

/** The stories row: you, and everyone you follow who has a story up,
 * minus anyone blocked either way. */
export async function loadStoryTray(supabase: SupabaseClient<Database>, viewerId: string): Promise<TrayPerson[]> {
  const [followingIds, blocked] = await Promise.all([
    listFollowingIds(supabase, viewerId),
    listBlockedEitherDirection(supabase).catch(() => [] as string[]),
  ]);
  const blockedSet = new Set(blocked);
  const authorIds = [viewerId, ...followingIds.filter((id) => !blockedSet.has(id))];
  const stories = await listLiveStoriesByAuthors(supabase, authorIds);
  if (stories.length === 0) return [];
  const seen = await listSeenStoryIds(supabase, viewerId, stories.map((s) => s.id));
  const tray = buildTray(
    stories.map((s) => ({ id: s.id, authorId: s.author_id, createdAt: s.created_at })),
    seen,
    viewerId,
  );
  const people = await loadStoryPeople(supabase, tray.map((e) => e.authorId));
  return tray
    .filter((e) => people.has(e.authorId))
    .map((e) => ({ ...e, username: people.get(e.authorId)!.username, avatarUrl: people.get(e.authorId)!.avatarUrl }));
}

/** For avatars anywhere (feed, profiles): which of these people have a
 * story up, and whether the viewer has watched all of it. */
export async function loadStoryRings(
  supabase: SupabaseClient<Database>,
  viewerId: string | null,
  authorIds: string[],
): Promise<Map<string, RingState>> {
  const rings = new Map<string, RingState>();
  const unique = [...new Set(authorIds)];
  if (unique.length === 0) return rings;
  const stories = await listLiveStoriesByAuthors(supabase, unique);
  if (stories.length === 0) return rings;
  const seen = viewerId ? await listSeenStoryIds(supabase, viewerId, stories.map((s) => s.id)) : new Set<string>();
  for (const story of stories) {
    const own = story.author_id === viewerId;
    const state: RingState = own || seen.has(story.id) ? "seen" : "unseen";
    if (rings.get(story.author_id) !== "unseen") rings.set(story.author_id, state);
  }
  return rings;
}
