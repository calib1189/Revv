import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUsername, getProfilesByIds } from "@/lib/db/profiles";
import { listFollowerIds, listFollowingIds } from "@/lib/db/follows";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { PeopleList } from "@/features/profile/people-list";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SegmentedLinks } from "@/components/ui/segmented-links";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "@/components/ui/icons";

type Tab = "followers" | "following";

/** Anyone's followers / following, reached by tapping those counts on a
 * profile. Follows are publicly readable (0001_init.sql), same as the
 * counts themselves, so this needs no login. */
export default async function ConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "following" ? "following" : "followers";

  const supabase = await createClient();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();

  const [followerIds, followingIds] = await Promise.all([
    listFollowerIds(supabase, profile.id),
    listFollowingIds(supabase, profile.id),
  ]);
  const ids = tab === "followers" ? followerIds : followingIds;

  // Keep the list in follow order (most recent first); getProfilesByIds
  // doesn't promise an order.
  const people = await getProfilesByIds(supabase, ids);
  const byId = new Map(people.map((p) => [p.id, p]));
  const ordered = ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Best-effort: a missing avatar just falls back to the initial.
  const avatarMedia = await getMediaByIds(
    supabase,
    ordered.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id)),
  ).catch(() => []);
  const urlByMediaId = new Map(avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
  const avatarUrlById = Object.fromEntries(
    ordered.map((p) => [p.id, p.avatar_media_id ? (urlByMediaId.get(p.avatar_media_id) ?? null) : null]),
  );

  const name = profile.display_name || profile.username;

  return (
    <PageShell>
      <PageHeader
        title={name}
        eyebrow={`@${profile.username}`}
        back={{ href: `/u/${profile.username}`, label: "Profile" }}
        className="mb-5"
      />

      <SegmentedLinks
        className="mb-6"
        options={[
          {
            href: `/u/${profile.username}/connections?tab=followers`,
            label: `Followers · ${followerIds.length}`,
            active: tab === "followers",
          },
          {
            href: `/u/${profile.username}/connections?tab=following`,
            label: `Following · ${followingIds.length}`,
            active: tab === "following",
          },
        ]}
      />

      {ordered.length === 0 ? (
        <EmptyState
          card
          icon={<UsersIcon />}
          title={tab === "followers" ? "No followers yet" : "Not following anyone yet"}
          body={
            tab === "followers"
              ? `When people follow ${name}, they'll show up here.`
              : `When ${name} follows people, they'll show up here.`
          }
        />
      ) : (
        <PeopleList profiles={ordered} avatarUrlById={avatarUrlById} />
      )}
    </PageShell>
  );
}
