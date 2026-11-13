"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
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
  votePoll,
  getPollCounts,
  listMyPollVotes,
  createQuestionAnswer,
  listQuestionAnswers,
  getAnswerCounts,
} from "@/lib/db/stories";
import { getSoundsByIds, publicSoundUrl } from "@/lib/db/sounds";
import { sendPushToUser } from "@/lib/push/send";
import { getProfileByUserId } from "@/lib/db/profiles";
import { loadStoryPeople, type StoryPerson } from "@/lib/stories/load";
import { STORY_MAX_VIDEO_SECONDS } from "@/lib/stories/tray";
import { QUESTION_ANSWER_MAX, isPlainDesign, parseStoryDesign, type StoryDesign } from "@/lib/stories/design";
import { myCars, resolveStoryDesign, type StoryCar } from "@/lib/stories/resolve";
import { searchProfilesByUsername } from "@/lib/db/profiles";
import type { Json } from "@/lib/supabase/database.types";
import { isReaction, type Reaction } from "@/lib/reactions";

export interface StoryItem {
  id: string;
  url: string;
  kind: "image" | "video";
  durationMs: number | null;
  /** Stories from before the editor have a plain caption instead. */
  caption: string | null;
  design: StoryDesign | null;
  createdAt: string;
  seen: boolean;
  /** Only on your own stories. */
  viewCount?: number;
  /** The song on the story, if there is one. */
  music: { url: string; startMs: number } | null;
  /** Each poll's tallies and the viewer's own vote, by layer id. Tallies
   * show once you've voted (or on your own story). */
  polls: Record<string, { counts: [number, number]; mine: 0 | 1 | null }>;
  /** Only on your own stories: answers to its question. */
  answerCount?: number;
  /** Your reaction to someone else's story. */
  myReaction: Reaction | null;
}

export interface StoryGroup {
  author: StoryPerson;
  isOwn: boolean;
  stories: StoryItem[];
}

/** Posts a story from media the author already uploaded, with what they
 * added in the editor (checked and filled in here, never trusted). */
export async function createStoryAction(mediaId: string, rawDesign: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to post a story." };
  const supabase = await createClient();
  const media = await getMediaById(supabase, mediaId).catch(() => null);
  if (!media || media.owner_id !== user.id) return { ok: false, error: "That upload wasn't found. Try again." };
  if (media.kind === "video" && (media.duration_ms ?? 0) > STORY_MAX_VIDEO_SECONDS * 1000 + 500) {
    return { ok: false, error: `Stories can be up to ${STORY_MAX_VIDEO_SECONDS} seconds.` };
  }
  let story: { id: string };
  let design: StoryDesign;
  try {
    design = await resolveStoryDesign(supabase, user.id, parseStoryDesign(rawDesign));
    story = await createStory(supabase, {
      authorId: user.id,
      mediaId,
      design: isPlainDesign(design) ? null : (design as unknown as Json),
    });
  } catch (err) {
    console.error("Story not created:", err);
    return { ok: false, error: "Couldn't post your story. Try again." };
  }
  // The in-app notification comes from the database (0116); the push is ours.
  const mentioned = [...new Set(design.layers.flatMap((l) => (l.kind === "mention" && l.userId && l.userId !== user.id ? [l.userId] : [])))].slice(0, 10);
  if (mentioned.length > 0) {
    after(async () => {
      const [me, blocked] = await Promise.all([
        getProfileByUserId(supabase, user.id).catch(() => null),
        listBlockedEitherDirection(supabase).catch(() => [] as string[]),
      ]);
      const skip = new Set(blocked);
      await Promise.allSettled(
        mentioned
          .filter((id) => !skip.has(id))
          .map((id) =>
            sendPushToUser(id, { title: "SORZA", body: `@${me?.username ?? "Someone"} mentioned you in their story`, url: `/stories/${story.id}` }, "comments"),
          ),
      );
    });
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
  const designs = new Map(stories.map((s) => [s.id, s.design ? parseStoryDesign(s.design) : null]));
  const soundIds = [...new Set([...designs.values()].flatMap((d) => d?.layers.flatMap((l) => (l.kind === "music" ? [l.soundId] : [])) ?? []))];
  const pollStoryIds = stories.filter((s) => designs.get(s.id)?.layers.some((l) => l.kind === "poll")).map((s) => s.id);
  const othersIds = stories.filter((s) => s.author_id !== user?.id).map((s) => s.id);
  const [sounds, pollCounts, myVotes, answerCounts, myReactions] = await Promise.all([
    soundIds.length > 0 ? getSoundsByIds(supabase, soundIds).catch(() => []) : Promise.resolve([]),
    Promise.all(pollStoryIds.map((id) => getPollCounts(supabase, id).then((c) => [id, c] as const).catch(() => [id, new Map<string, [number, number]>()] as const))),
    user && pollStoryIds.length > 0 ? listMyPollVotes(supabase, user.id, pollStoryIds).catch(() => new Map<string, 0 | 1>()) : Promise.resolve(new Map<string, 0 | 1>()),
    getAnswerCounts(supabase, ownIds).catch(() => new Map<string, number>()),
    user && othersIds.length > 0
      ? supabase
          .from("story_reactions")
          .select("story_id, reaction")
          .eq("user_id", user.id)
          .in("story_id", othersIds)
          .then(({ data }) => new Map((data ?? []).filter((r) => isReaction(r.reaction)).map((r) => [r.story_id, r.reaction as Reaction])), () => new Map<string, Reaction>())
      : Promise.resolve(new Map<string, Reaction>()),
  ]);
  const soundUrlById = new Map(sounds.map((s) => [s.id, publicSoundUrl(supabase, s.storage_path)]));
  const countsByStory = new Map(pollCounts);
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
        design: designs.get(story.id) ?? null,
        createdAt: story.created_at,
        seen: isOwn || seen.has(story.id),
        ...(isOwn ? { viewCount: viewCounts.get(story.id) ?? 0, answerCount: answerCounts.get(story.id) ?? 0 } : {}),
        music: musicFor(designs.get(story.id) ?? null, soundUrlById),
        polls: pollsFor(story.id, designs.get(story.id) ?? null, countsByStory.get(story.id), myVotes),
        myReaction: myReactions.get(story.id) ?? null,
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

/** Who watched your story, and how they reacted. */
export async function listStoryViewersAction(storyId: string): Promise<(StoryPerson & { viewedAt: string; reaction: Reaction | null })[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId);
  if (!story || story.author_id !== user.id) return [];
  const [views, reactions] = await Promise.all([
    listStoryViews(supabase, storyId),
    supabase
      .from("story_reactions")
      .select("user_id, reaction")
      .eq("story_id", storyId)
      .then(({ data }) => new Map((data ?? []).filter((r) => isReaction(r.reaction)).map((r) => [r.user_id, r.reaction as Reaction])), () => new Map<string, Reaction>()),
  ]);
  const people = await loadStoryPeople(supabase, views.map((v) => v.viewerId));
  return views
    .map((v) => {
      const person = people.get(v.viewerId);
      return person ? { ...person, viewedAt: v.viewedAt, reaction: reactions.get(v.viewerId) ?? null } : null;
    })
    .filter((v): v is StoryPerson & { viewedAt: string; reaction: Reaction | null } => v !== null);
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

/** Your cars, for the car sticker: name and real SORZA score. */
export async function listMyStoryCarsAction(): Promise<StoryCar[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  return [...(await myCars(supabase, user.id)).values()];
}

/** People to @mention, by username. */
export async function searchMentionsAction(query: string): Promise<StoryPerson[]> {
  const user = await getCurrentUser();
  const q = query.trim().replace(/^@/, "");
  if (!user || q.length === 0) return [];
  const supabase = await createClient();
  const profiles = await searchProfilesByUsername(supabase, q, 8).catch(() => []);
  const people = await loadStoryPeople(supabase, profiles.map((p) => p.id));
  return profiles.map((p) => people.get(p.id)).filter((p): p is StoryPerson => Boolean(p));
}

function musicFor(design: StoryDesign | null, urls: Map<string, string>): StoryItem["music"] {
  const layer = design?.layers.find((l) => l.kind === "music");
  if (!layer || layer.kind !== "music") return null;
  const url = urls.get(layer.soundId);
  return url ? { url, startMs: layer.startMs } : null;
}

function pollsFor(
  storyId: string,
  design: StoryDesign | null,
  counts: Map<string, [number, number]> | undefined,
  mine: Map<string, 0 | 1>,
): StoryItem["polls"] {
  const out: StoryItem["polls"] = {};
  for (const layer of design?.layers ?? []) {
    if (layer.kind !== "poll") continue;
    out[layer.id] = { counts: counts?.get(layer.id) ?? [0, 0], mine: mine.get(`${storyId}:${layer.id}`) ?? null };
  }
  return out;
}

function hasLayer(design: StoryDesign | null, layerId: string, kind: "poll" | "question"): boolean {
  return Boolean(design?.layers.some((l) => l.id === layerId && l.kind === kind));
}

/** Votes on a story's poll and returns the new tallies. */
export async function votePollAction(storyId: string, layerId: string, option: number): Promise<{ counts: [number, number] } | null> {
  const user = await getCurrentUser();
  if (!user || (option !== 0 && option !== 1)) return null;
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId).catch(() => null);
  if (!story || !hasLayer(story.design ? parseStoryDesign(story.design) : null, layerId, "poll")) return null;
  try {
    await votePoll(supabase, { storyId, layerId, voterId: user.id, option });
    const counts = await getPollCounts(supabase, storyId);
    return { counts: counts.get(layerId) ?? [0, 0] };
  } catch (err) {
    console.error("Poll vote not saved:", err);
    return null;
  }
}

/** Sends an answer to the question on someone's story. Only they see it. */
export async function answerQuestionAction(storyId: string, layerId: string, rawBody: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to answer." };
  const body = rawBody.trim().slice(0, QUESTION_ANSWER_MAX);
  if (!body) return { ok: false, error: "Write something first." };
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId).catch(() => null);
  if (!story || !hasLayer(story.design ? parseStoryDesign(story.design) : null, layerId, "question")) return { ok: false, error: "This story isn't up anymore." };
  if (story.author_id === user.id) return { ok: false, error: "That's your own question." };
  try {
    await createQuestionAnswer(supabase, { storyId, layerId, responderId: user.id, body });
  } catch (err) {
    console.error("Answer not saved:", err);
    return { ok: false, error: "Couldn't send that. Try again." };
  }
  after(async () => {
    const me = await getProfileByUserId(supabase, user.id).catch(() => null);
    await sendPushToUser(story.author_id, { title: "SORZA", body: `@${me?.username ?? "Someone"} answered your question`, url: `/stories/${storyId}` }, "comments");
  });
  return { ok: true };
}

/** The answers to the question on your own story, newest first. */
export async function listQuestionAnswersAction(storyId: string): Promise<(StoryPerson & { body: string; createdAt: string; answerId: string })[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId).catch(() => null);
  if (!story || story.author_id !== user.id) return [];
  const answers = await listQuestionAnswers(supabase, storyId);
  const people = await loadStoryPeople(supabase, [...new Set(answers.map((a) => a.responderId))]);
  return answers.flatMap((a) => {
    const person = people.get(a.responderId);
    return person ? [{ ...person, body: a.body, createdAt: a.createdAt, answerId: a.id }] : [];
  });
}
