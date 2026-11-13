/** Stories: a photo or video that stays up for 24 hours. */

/** How long a photo story stays on screen. */
export const PHOTO_STORY_MS = 5000;
/** A photo story with a song plays for the length of its clip. */
export const PHOTO_MUSIC_STORY_MS = 15000;
/** The longest a video story can be. */
export const STORY_MAX_VIDEO_SECONDS = 60;

export interface StoryLite {
  id: string;
  authorId: string;
  createdAt: string;
}

/** One person in the stories row: who, how many stories, whether any
 * of them is new to the viewer. */
export interface TrayEntry {
  authorId: string;
  latestAt: string;
  storyCount: number;
  hasUnseen: boolean;
  isOwn: boolean;
}

/**
 * Groups live stories by author, in the order the row shows them: your
 * own first, then everyone with a story you haven't watched (newest
 * first), then the people you're all caught up on.
 */
export function buildTray(stories: StoryLite[], seenIds: Set<string>, viewerId: string | null): TrayEntry[] {
  const byAuthor = new Map<string, TrayEntry>();
  for (const story of stories) {
    const isOwn = story.authorId === viewerId;
    const entry = byAuthor.get(story.authorId) ?? {
      authorId: story.authorId,
      latestAt: story.createdAt,
      storyCount: 0,
      hasUnseen: false,
      isOwn,
    };
    entry.storyCount += 1;
    if (story.createdAt > entry.latestAt) entry.latestAt = story.createdAt;
    if (!isOwn && !seenIds.has(story.id)) entry.hasUnseen = true;
    byAuthor.set(story.authorId, entry);
  }
  const rank = (e: TrayEntry) => (e.isOwn ? 0 : e.hasUnseen ? 1 : 2);
  return [...byAuthor.values()].sort((a, b) => rank(a) - rank(b) || (a.latestAt < b.latestAt ? 1 : -1));
}

/** Where to start someone's stories (oldest first): at the first one the
 * viewer hasn't watched, or the beginning if they've seen them all. */
export function startIndex(storyIds: string[], seenIds: Set<string>): number {
  const i = storyIds.findIndex((id) => !seenIds.has(id));
  return i === -1 ? 0 : i;
}

/** "now", "12m", "3h": how long ago a story went up, for its header. */
export function storyAge(createdAt: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.min(23, Math.floor(minutes / 60))}h`;
}
