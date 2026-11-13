import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { StoryComposer } from "@/features/stories/story-composer";

export const metadata = { title: "New story" };

export default async function NewStoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/stories/new");
  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (profile?.is_banned) {
    return (
      <div className="mx-auto max-w-md flex-1 px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">You can&apos;t post right now</h1>
        <p className="mt-2 text-sm text-muted">This account can&apos;t share stories or posts.</p>
      </div>
    );
  }
  return <StoryComposer userId={user.id} />;
}
