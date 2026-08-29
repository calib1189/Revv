import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listPendingReviewMeetups, listMeetupsByHost, MEETUP_TIERS } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { publicMediaUrl } from "@/lib/db/media";
import { MeetupReviewRow, type MeetupReviewRowData } from "@/features/admin/meetup-review-row";

export default async function AdminMeetupsPage() {
  const supabase = await createClient();
  const meetups = await listPendingReviewMeetups(supabase);
  const hosts = await Promise.all(meetups.map((m) => getProfileByUserId(supabase, m.host_id)));
  const hostById = new Map(hosts.filter(Boolean).map((p) => [p!.id, p!]));

  // Prior meetup history per host — same reasoning as the ad review
  // queue's prior-campaign history: a first-time host and someone with a
  // string of rejected meetups shouldn't look identical to a reviewer.
  const uniqueHostIds = [...new Set(meetups.map((m) => m.host_id))];
  const historyByHostId = new Map(
    await Promise.all(
      uniqueHostIds.map(async (id) => {
        const past = await listMeetupsByHost(supabase, id);
        return [
          id,
          {
            total: past.length,
            rejected: past.filter((m) => m.status === "rejected").length,
          },
        ] as const;
      }),
    ),
  );

  const media = await listMeetupMediaForMeetups(supabase, meetups.map((m) => m.id));
  const photoUrlsByMeetupId = new Map<string, string[]>();
  for (const item of media) {
    const urls = photoUrlsByMeetupId.get(item.meetup_id) ?? [];
    urls.push(publicMediaUrl(supabase, item.media.storage_path));
    photoUrlsByMeetupId.set(item.meetup_id, urls);
  }

  const rows: MeetupReviewRowData[] = meetups.map((meetup) => {
    const host = hostById.get(meetup.host_id);
    const history = historyByHostId.get(meetup.host_id);
    return {
      meetupId: meetup.id,
      title: meetup.title,
      description: meetup.description,
      locationName: meetup.location_name,
      startsAt: meetup.starts_at,
      hostUsername: host?.username ?? "unknown",
      hostMemberSince: host?.created_at ?? null,
      priorMeetupCount: (history?.total ?? 1) - 1,
      priorRejectedCount: history?.rejected ?? 0,
      tierLabel: MEETUP_TIERS[meetup.tier].label,
      priceCents: meetup.price_cents,
      submittedAt: meetup.created_at,
      photoUrls: photoUrlsByMeetupId.get(meetup.id) ?? [],
    };
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Meetup review</h1>
      <p className="mb-6 text-sm text-muted">
        Paid and waiting on you — approving puts it live on Discover
        immediately, for its scheduled date.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nothing waiting on review.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <MeetupReviewRow key={row.meetupId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
