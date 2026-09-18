import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listFollowingIds, listFollowerIds } from "@/lib/db/follows";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
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

  // Best-effort: a missing avatar just falls back to the initial.
  const avatarMedia = await getMediaByIds(
    supabase,
    profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const urlByMediaId = new Map(avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const avatarUrlById = Object.fromEntries(
    profiles.map((p) => [p.id, p.avatar_media_id ? (urlByMediaId.get(p.avatar_media_id) ?? null) : null]),
  );

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Friends</h1>
      <SuggestedFollowsRow suggestions={suggestions} />
      <FriendsTabs following={following} followers={followers} avatarUrlById={avatarUrlById} />
    </div>
  );
}
