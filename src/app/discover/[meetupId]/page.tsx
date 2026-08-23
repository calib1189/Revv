import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getMeetupById } from "@/lib/db/meetups";
import { listMeetupMediaForMeetups } from "@/lib/db/meetup-media";
import { publicMediaUrl } from "@/lib/db/media";
import { getProfileByUserId } from "@/lib/db/profiles";
import { PhotoCarousel } from "@/features/feed/photo-carousel";
import { Avatar } from "@/features/feed/avatar";
import { PinIcon } from "@/components/ui/icons";
import { MeetupDetailDeleteButton } from "@/features/meetups/meetup-detail-delete-button";
import { formatDateTime } from "@/lib/format/date";

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

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <Link href="/discover" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        ← Back to meets
      </Link>

      <div className="glass overflow-hidden rounded-2xl">
        {photos.length > 0 && <PhotoCarousel photos={photos} />}

        <div className="p-5">
          <h1 className="text-xl font-semibold">{meetup.title}</h1>
          <p className="mt-1 text-sm text-muted">{formatDateTime(meetup.starts_at)}</p>

          <div className="mt-3 flex items-center gap-1.5 text-sm text-foreground">
            <PinIcon className="h-4 w-4 flex-shrink-0 text-muted" />
            <span>{meetup.location_name}</span>
          </div>

          {meetup.description && (
            <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">
              {meetup.description}
            </p>
          )}

          <Link
            href={`/u/${host?.username ?? "unknown"}`}
            className="mt-5 flex items-center gap-2.5 hover:opacity-80"
          >
            <Avatar username={host?.username ?? "unknown"} />
            <span className="text-sm text-muted">
              Hosted by <span className="font-medium text-foreground">@{host?.username ?? "unknown"}</span>
            </span>
          </Link>

          {isHost && (
            <div className="mt-5 border-t border-border pt-4">
              <MeetupDetailDeleteButton meetupId={meetup.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
