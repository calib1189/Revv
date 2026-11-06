import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GroupedList, GroupedRow, RowIcon, SectionTitle } from "@/components/ui/grouped-list";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getMeetupById } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { getMediaById, getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { listMeetupAttendees } from "@/lib/db/meetup-attendees";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { composeAttendees, type AttendeeEntry } from "@/lib/meetups/compose-attendees";
import { isMeetupOver } from "@/lib/meetups/attendance";
import { MeetupAttendees } from "@/features/meetups/meetup-attendees";
import { AttendButton, type GarageCarOption } from "@/features/meetups/attend-button";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMeetupViewCount, recordMeetupView } from "@/lib/db/meetup-views";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { Avatar } from "@/features/feed/avatar";
import { PinIcon, EyeIcon } from "@/components/ui/icons";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { MeetupDetailDeleteButton } from "@/features/meetups/meetup-detail-delete-button";
import { Callout } from "@/components/ui/callout";
import { formatDateTime } from "@/lib/format/date";
import { formatCompactNumber } from "@/lib/format/compact-number";

export default async function MeetupDetailPage({
  params,
}: {
  params: Promise<{ meetupId: string }>;
}) {
  const { meetupId } = await params;
  const supabase = await createClient();

  const [meetup, user] = await Promise.all([
    getMeetupById(supabase, meetupId),
    getCurrentUser(),
  ]);
  if (!meetup) notFound();

  const [host, media] = await Promise.all([
    getProfileByUserId(supabase, meetup.host_id),
    listMeetupMediaForMeetups(supabase, [meetup.id]),
  ]);

  const photos = media.map((m) => ({
    url: publicMediaUrl(supabase, m.media.storage_path),
  }));
  const isHost = user?.id === meetup.host_id;

  if (user) {
    try {
      await recordMeetupView(supabase, meetup.id, user.id);
    } catch {
      // best-effort only
    }
  }
  const viewCount = await getMeetupViewCount(supabase, meetup.id);

  // RSVPs. Fail-soft until 0098_meetup_attendees.sql is applied: the
  // section is left out rather than taking the whole meet page down.
  let attendees: AttendeeEntry[] | null = null;
  try {
    attendees = await composeAttendees(supabase, await listMeetupAttendees(supabase, meetup.id));
  } catch {
    attendees = null;
  }
  const isOver = isMeetupOver(meetup.starts_at);
  const viewerId = user?.id ?? null;
  const myRsvp = attendees?.find((a) => a.userId === viewerId) ?? null;
  // Only a live meet takes RSVPs; a host still sees their pending one
  // without the control.
  const canRsvp = attendees != null && !isOver && meetup.status === "active";
  let myCars: GarageCarOption[] = [];
  if (canRsvp && user) {
    const vehicles = await listVehiclesByOwner(supabase, user.id);
    const heroMedia = await getMediaByIds(
      supabase,
      vehicles.map((v) => v.hero_media_id).filter((id): id is string => Boolean(id)),
    );
    const heroUrlById = new Map(heroMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));
    myCars = vehicles.map((v) => ({
      id: v.id,
      title: v.nickname || `${v.make} ${v.model}`,
      heroUrl: v.hero_media_id ? (heroUrlById.get(v.hero_media_id) ?? null) : null,
    }));
  }

  const start = new Date(meetup.starts_at);
  const hostAvatarMedia = host?.avatar_media_id
    ? await getMediaById(supabase, host.avatar_media_id).catch(() => null)
    : null;
  const hostAvatarUrl = hostAvatarMedia ? publicMediaUrl(supabase, hostAvatarMedia.storage_path) : null;

  return (
    <PageShell width="2xl">
      <PageHeader title={meetup.title} back={{ href: "/discover", label: "Meets" }} className="mb-5" />

      {isHost && meetup.status === "pending_payment" && (
        <div className="mb-4">
          <Callout tone="danger">
            This meetup is only visible to you until payment finishes. It
            won&apos;t show up for anyone else yet.
          </Callout>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {photos.length > 0 && (
          <div className="overflow-hidden rounded-[28px] elev-2">
            <PhotoCarousel photos={photos} />
          </div>
        )}

        <div className="glass-raised elev-1 flex items-center gap-4 rounded-[22px] p-4">
          <span className="flex w-14 flex-shrink-0 flex-col items-center overflow-hidden rounded-[14px] bg-white text-center shadow" suppressHydrationWarning>
            <span className="w-full bg-accent py-0.5 text-[0.6875rem] font-bold uppercase text-white" suppressHydrationWarning>
              {start.toLocaleString("en-US", { month: "short" })}
            </span>
            <span className="numeral py-1 text-[1.5rem] leading-none text-neutral-900" suppressHydrationWarning>
              {start.getDate()}
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-semibold" suppressHydrationWarning>
              {formatDateTime(meetup.starts_at)}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[0.875rem] text-muted">
              <EyeIcon className="h-3.5 w-3.5" />
              <span className="numeral">{formatCompactNumber(viewCount)}</span> views
            </p>
          </div>
        </div>

        <GroupedList>
          <GroupedRow
            label={meetup.location_name}
            detail="Location"
            icon={
              <RowIcon color="#ff453a">
                <PinIcon />
              </RowIcon>
            }
          />
          <GroupedRow
            href={`/u/${host?.username ?? "unknown"}`}
            label={
              <span className="flex items-center gap-1">
                <span className="truncate">{host?.display_name || host?.username || "unknown"}</span>
                {host?.is_verified && <VerifiedBadge className="h-[15px] w-[15px]" />}
              </span>
            }
            detail="Host"
            icon={<Avatar username={host?.username ?? "unknown"} avatarUrl={hostAvatarUrl} className="h-[30px] w-[30px] text-xs" />}
          />
        </GroupedList>

        {meetup.description && (
          <section>
            <SectionTitle>About</SectionTitle>
            <p className="whitespace-pre-wrap px-1 text-[0.9375rem] leading-relaxed">{meetup.description}</p>
          </section>
        )}

        {attendees && (
          <MeetupAttendees
            attendees={attendees}
            isOver={isOver}
            viewerId={viewerId}
            control={
              canRsvp ? (
                <AttendButton
                  meetupId={meetup.id}
                  isLoggedIn={user != null}
                  cars={myCars}
                  attending={myRsvp ? { vehicleId: myRsvp.vehicleId } : null}
                />
              ) : undefined
            }
          />
        )}

        {isHost && (
          <div className="glass-raised elev-1 rounded-[22px] px-4 py-3">
            <MeetupDetailDeleteButton meetupId={meetup.id} />
          </div>
        )}
      </div>
    </PageShell>
  );
}
