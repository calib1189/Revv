import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listFollowingIds, listFollowerIds } from "@/lib/db/follows";
import { getProfilesByIds } from "@/lib/db/profiles";
import { listSuggestedFollows } from "@/lib/ranking/suggested-follows";
import { FriendsTabs } from "@/features/friends/friends-tabs";
import { SuggestedFollowsRow } from "@/features/friends/suggested-follows-row";

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/friends");

  const supabase = await createClient();
  const [followingIds, followerIds, suggestions] = await Promise.all([
    listFollowingIds(supabase, user.id),
    listFollowerIds(supabase, user.id),
    listSuggestedFollows(supabase, user.id),
  ]);

  const allIds = [...new Set([...followingIds, ...followerIds])];
  const profiles = await getProfilesByIds(supabase, allIds);
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const following = followingIds
    .map((id) => profileById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const followers = followerIds
    .map((id) => profileById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Friends</h1>
      <SuggestedFollowsRow suggestions={suggestions} />
      <FriendsTabs following={following} followers={followers} />
    </div>
  );
}
