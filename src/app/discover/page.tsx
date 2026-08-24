import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listUpcomingMeetups } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { publicMediaUrl } from "@/lib/db/media";
import { getProfileByUserId } from "@/lib/db/profiles";
import { MeetupsList, type MeetupListItem } from "@/features/meetups/meetups-list";

export default async function DiscoverPage() {
  const supabase = await createClient();
  const [user, meetups] = await Promise.all([
    getCurrentUser(),
    listUpcomingMeetups(supabase),
  ]);

  const [hostProfiles, meetupMedia] = await Promise.all([
    Promise.all(
      [...new Set(meetups.map((m) => m.host_id))].map((id) =>
        getProfileByUserId(supabase, id),
      ),
    ),
    listMeetupMediaForMeetups(supabase, meetups.map((m) => m.id)),
  ]);
  const usernameById = new Map(
    hostProfiles.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  const mediaByMeetup = new Map<string, (typeof meetupMedia)[number][]>();
  for (const mm of meetupMedia) {
    const list = mediaByMeetup.get(mm.meetup_id) ?? [];
    list.push(mm);
    mediaByMeetup.set(mm.meetup_id, list);
  }

  const items: MeetupListItem[] = meetups.map((meetup) => {
    const media = mediaByMeetup.get(meetup.id) ?? [];
    return {
      meetup,
      hostUsername: usernameById.get(meetup.host_id) ?? "unknown",
      photoUrl: media[0] ? publicMediaUrl(supabase, media[0].media.storage_path) : null,
      photoCount: media.length,
    };
  });

  const currentUserId = user?.email_confirmed_at ? user.id : null;
  return <MeetupsList items={items} currentUserId={currentUserId} />;
}
