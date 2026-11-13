"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { deleteMedia, getMediaById, getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listBlockedEitherDirection } from "@/lib/db/blocks";
import {
  createStory,
  deleteStory,
  getStoryById,
  getStoryViewCounts,
  listLiveStoriesByAuthors,
  listSeenStoryIds,
  listStoryViews,
  recordStoryView,
} from "@/lib/db/stories";
import { loadStoryPeople, type StoryPerson } from "@/lib/stories/load";
import { STORY_MAX_VIDEO_SECONDS, validateStoryCaption } from "@/lib/stories/tray";

export interface StoryItem {
  id: string;
  url: string;
  kind: "image" | "video";
  durationMs: number | null;
  caption: string | null;
  createdAt: string;
  seen: boolean;
  /** Only on your own stories. */
  viewCount?: number;
}

export interface StoryGroup {
  author: StoryPerson;
  isOwn: boolean;
  stories: StoryItem[];
}

/** Posts a story from media the author already uploaded. */
export async function createStoryAction(mediaId: string, rawCaption: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to post a story." };
  const caption = validateStoryCaption(rawCaption);
  if (!caption.ok) return caption;
  const supabase = await createClient();
  const media = await getMediaById(supabase, mediaId).catch(() => null);
  if (!media || media.owner_id !== user.id) return { ok: false, error: "That upload wasn't found. Try again." };
  if (media.kind === "video" && (media.duration_ms ?? 0) > STORY_MAX_VIDEO_SECONDS * 1000 + 500) {
    return { ok: false, error: `Stories can be up to ${STORY_MAX_VIDEO_SECONDS} seconds.` };
  }
  try {
    await createStory(supabase, { authorId: user.id, mediaId, caption: caption.caption });
  } catch (err) {
    console.error("Story not created:", err);
    return { ok: false, error: "Couldn't post your story. Try again." };
  }
  revalidatePath("/friends");
  revalidatePath("/feed");
  return { ok: true };
}

/** Everyone's live stories, in the order asked for, ready to play. */
export async function loadStoryGroupsAction(authorIds: string[]): Promise<StoryGroup[]> {
  const ids = [...new Set(authorIds)].slice(0, 100);
  if (ids.length === 0) return [];
  const user = await getCurrentUser();
  const supabase = await createClient();
  const blocked = user ? new Set(await listBlockedEitherDirection(supabase).catch(() => [] as string[])) : new Set<string>();
  const stories = (await listLiveStoriesByAuthors(supabase, ids)).filter((s) => !blocked.has(s.author_id));
  if (stories.length === 0) return [];

  const ownIds = stories.filter((s) => s.author_id === user?.id).map((s) => s.id);
  const [media, people, seen, viewCounts] = await Promise.all([
    getMediaByIds(supabase, stories.map((s) => s.media_id)),
    loadStoryPeople(supabase, [...new Set(stories.map((s) => s.author_id))]),
    user ? listSeenStoryIds(supabase, user.id, stories.map((s) => s.id)) : Promise.resolve(new Set<string>()),
    getStoryViewCounts(supabase, ownIds).catch(() => new Map<string, number>()),
  ]);
  const mediaById = new Map(media.map((m) => [m.id, m]));

  const groups: StoryGroup[] = [];
  for (const authorId of ids) {
    const author = people.get(authorId);
    if (!author) continue;
    const isOwn = authorId === user?.id;
    const items: StoryItem[] = [];
    for (const story of stories) {
      if (story.author_id !== authorId) continue;
      const m = mediaById.get(story.media_id);
      if (!m) continue;
      items.push({
        id: story.id,
        url: publicMediaUrl(supabase, m.storage_path),
        kind: m.kind,
        durationMs: m.duration_ms,
        caption: story.caption,
        createdAt: story.created_at,
        seen: isOwn || seen.has(story.id),
        ...(isOwn ? { viewCount: viewCounts.get(story.id) ?? 0 } : {}),
      });
    }
    if (items.length > 0) groups.push({ author, isOwn, stories: items });
  }
  return groups;
}

/** Fire-and-forget when a story shows on screen. */
export async function markStorySeenAction(storyId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createClient();
    const story = await getStoryById(supabase, storyId);
    if (!story || story.author_id === user.id) return;
    await recordStoryView(supabase, storyId, user.id);
  } catch (err) {
    console.error("Story view not recorded:", err);
  }
}

/** Who watched your story. */
export async function listStoryViewersAction(storyId: string): Promise<(StoryPerson & { viewedAt: string })[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId);
  if (!story || story.author_id !== user.id) return [];
  const views = await listStoryViews(supabase, storyId);
  const people = await loadStoryPeople(supabase, views.map((v) => v.viewerId));
  return views
    .map((v) => {
      const person = people.get(v.viewerId);
      return person ? { ...person, viewedAt: v.viewedAt } : null;
    })
    .filter((v): v is StoryPerson & { viewedAt: string } => v !== null);
}

export async function deleteStoryAction(storyId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId);
  if (!story || story.author_id !== user.id) return { ok: false };
  await deleteStory(supabase, storyId);
  // The photo or video goes too: a story's media is never used anywhere
  // else. Best-effort, the story itself is already gone.
  try {
    const media = await getMediaById(supabase, story.media_id);
    if (media && media.owner_id === user.id) {
      await supabase.storage.from("media").remove([media.storage_path]);
      await deleteMedia(supabase, media.id);
    }
  } catch (err) {
    console.error("Story media not removed:", err);
  }
  revalidatePath("/friends");
  revalidatePath("/feed");
  return { ok: true };
}
