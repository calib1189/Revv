import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { listUpcomingMeetups } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { getAttendeeCountsForMeetups } from "@/lib/db/meetup-attendees";
import { publicMediaUrl } from "@/lib/db/media";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getCrewsByIds } from "@/lib/db/crews";
import { listCrewIdsForUser } from "@/lib/db/crew-members";
import { listTrendingSounds } from "@/lib/db/sounds";
import { DiscoverTabs } from "@/features/discover/discover-tabs";
import type { MeetupListItem } from "@/features/meetups/meetups-list";

export async function DiscoverPageContent() {
  const supabase = await createClient();
  // Everything here only depends on the meets list or on who you are, so
  // it all loads side by side rather than one step after another.
  const userPromise = getCurrentUser();
  const meetupsPromise = listUpcomingMeetups(supabase);
  const soundsPromise = listTrendingSounds(supabase).catch(
    () => [] as Awaited<ReturnType<typeof listTrendingSounds>>,
  );
  const crewsPromise = userPromise.then(async (u) => {
    const id = u?.email_confirmed_at ? u.id : null;
    return id ? getCrewsByIds(supabase, await listCrewIdsForUser(supabase, id)) : [];
  });
  crewsPromise.catch(() => {});
  const meetups = await meetupsPromise;
  const meetupIds = meetups.map((m) => m.id);
  const [user, sounds, hostProfiles, meetupMedia, goingCounts, yourCrews] = await Promise.all([
    userPromise,
    soundsPromise,
    Promise.all([...new Set(meetups.map((m) => m.host_id))].map((id) => getProfileByUserId(supabase, id))),
    listMeetupMediaForMeetups(supabase, meetupIds),
    getAttendeeCountsForMeetups(supabase, meetupIds).catch(() => new Map<string, number>()),
    crewsPromise,
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
      goingCount: goingCounts.get(meetup.id) ?? 0,
    };
  });

  const currentUserId = user?.email_confirmed_at ? user.id : null;
  return (
    <DiscoverTabs
      meetupItems={items}
      currentUserId={currentUserId}
      crews={yourCrews}
      sounds={sounds}
    />
  );
}
