import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername } from "@/lib/db/profiles";
import { getFollowerCount, getFollowingCount, isFollowing } from "@/lib/db/follows";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { listPostsByAuthor } from "@/lib/db/posts";
import { listPostMediaForPosts } from "@/lib/db/post-media";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { Avatar } from "@/features/feed/avatar";
import { VehicleCard } from "@/features/garage/vehicle-card";
import { PostThumbnailGrid } from "@/features/profile/post-thumbnail-grid";
import { FollowButton } from "@/features/profile/follow-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [profile, currentUser] = await Promise.all([
    getProfileByUsername(supabase, username),
    getCurrentUser(),
  ]);
  if (!profile) notFound();

  const isOwnProfile = currentUser?.id === profile.id;

  const [followerCount, followingCount, following, vehicles, posts] =
    await Promise.all([
      getFollowerCount(supabase, profile.id),
      getFollowingCount(supabase, profile.id),
      currentUser && !isOwnProfile
        ? isFollowing(supabase, currentUser.id, profile.id)
        : Promise.resolve(false),
      listVehiclesByOwner(supabase, profile.id),
      listPostsByAuthor(supabase, profile.id),
    ]);

  const heroIds = vehicles
    .map((v) => v.hero_media_id)
    .filter((id): id is string => Boolean(id));
  const heroMedia = await getMediaByIds(supabase, heroIds);
  const heroUrlById = new Map(
    heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const postMedia = await listPostMediaForPosts(
    supabase,
    posts.map((p) => p.id),
  );
  const firstMediaByPost = new Map<string, (typeof postMedia)[number]>();
  for (const pm of postMedia) {
    if (!firstMediaByPost.has(pm.post_id)) firstMediaByPost.set(pm.post_id, pm);
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex items-start gap-4">
        <Avatar username={profile.username} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">@{profile.username}</h1>
            {isOwnProfile ? (
              <Link href="/settings/profile">
                <Button variant="secondary" className="px-3 py-1.5 text-sm">
                  Edit profile
                </Button>
              </Link>
            ) : currentUser ? (
              <FollowButton
                followeeId={profile.id}
                followeeUsername={profile.username}
                initialIsFollowing={following}
              />
            ) : null}
          </div>

          <div className="mt-2 flex gap-4 text-sm text-muted">
            <span>
              <span className="font-medium text-foreground">
                {followerCount}
              </span>{" "}
              followers
            </span>
            <span>
              <span className="font-medium text-foreground">
                {followingCount}
              </span>{" "}
              following
            </span>
          </div>

          {profile.bio && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {vehicles.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Garage</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                heroUrl={
                  vehicle.hero_media_id
                    ? (heroUrlById.get(vehicle.hero_media_id) ?? null)
                    : null
                }
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Posts</h2>
        {posts.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          <PostThumbnailGrid
            posts={posts.map((post) => {
              const media = firstMediaByPost.get(post.id);
              return {
                postId: post.id,
                url: media
                  ? publicMediaUrl(supabase, media.media.storage_path)
                  : null,
                kind: post.post_type,
              };
            })}
          />
        )}
      </div>
    </div>
  );
}
