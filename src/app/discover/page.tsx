import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listUpcomingMeetups } from "@/lib/db/meetups";
import { getProfileByUserId } from "@/lib/db/profiles";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const [user, meetups] = await Promise.all([
    getCurrentUser(),
    listUpcomingMeetups(supabase),
  ]);

  const hostIds = [...new Set(meetups.map((m) => m.host_id))];
  const hosts = await Promise.all(
    hostIds.map((id) => getProfileByUserId(supabase, id)),
  );
  const usernameById = new Map(
    hosts.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  const items: MeetupListItem[] = meetups.map((meetup) => ({
    meetup,
    hostUsername: usernameById.get(meetup.host_id) ?? "unknown",
  }));

  return <MeetupsList items={items} currentUserId={user?.id ?? null} />;
}
