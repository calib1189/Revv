import Link from "next/link";
import { PinIcon } from "@/components/ui/icons";
import { DeleteMeetupButton } from "@/features/meetups/delete-meetup-button";
import { formatDateTime } from "@/lib/format/date";
import { formatDistance } from "@/lib/geo/distance";
import type { Meetup } from "@/lib/db/meetups";

export interface MeetupCardData {
  meetup: Meetup;
  hostUsername: string;
  distanceMiles: number | null;
  isHost: boolean;
  onDeleted?: () => void;
}

export function MeetupCard({ meetup, hostUsername, distanceMiles, isHost, onDeleted }: MeetupCardData) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{meetup.title}</p>
          <p className="text-sm text-muted">{formatDateTime(meetup.starts_at)}</p>
        </div>
        {distanceMiles != null && (
          <span className="flex-shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">
            {formatDistance(distanceMiles)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
        <PinIcon className="h-4 w-4 flex-shrink-0" />
        <span className="truncate">{meetup.location_name}</span>
      </div>

      {meetup.description && (
        <p className="mt-2 text-sm text-foreground">{meetup.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <Link href={`/u/${hostUsername}`} className="text-xs text-muted hover:text-foreground">
          Hosted by @{hostUsername}
        </Link>
        {isHost && onDeleted && (
          <DeleteMeetupButton meetupId={meetup.id} onDeleted={onDeleted} />
        )}
      </div>
    </div>
  );
}
