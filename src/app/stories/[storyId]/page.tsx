import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStoryById } from "@/lib/db/stories";
import { getProfileByUserId } from "@/lib/db/profiles";
import { OpenStory } from "@/features/stories/open-story";

export const metadata = { title: "Story" };

/** A link to one story (from a notification or a push): lands on the
 * poster's profile with the story playing over it. Gone once the story
 * has expired, unless it's your own. */
export default async function StoryLinkPage({ params }: { params: Promise<{ storyId: string }> }) {
  const { storyId } = await params;
  const supabase = await createClient();
  const story = await getStoryById(supabase, storyId).catch(() => null);
  if (!story) notFound();
  const author = await getProfileByUserId(supabase, story.author_id).catch(() => null);
  if (!author) notFound();
  return <OpenStory authorId={author.id} username={author.username} storyId={story.id} />;
}
