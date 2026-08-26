import Link from "next/link";
import Image from "next/image";
import { PinIcon } from "@/components/ui/icons";
import { formatDateTime } from "@/lib/format/date";
import { formatDistance } from "@/lib/geo/distance";
import type { Meetup } from "@/lib/db/meetups";

export interface MeetupCardData {
  meetup: Meetup;
  hostUsername: string;
  photoUrl: string | null;
  photoCount: number;
  distanceMiles: number | null;
}

export function MeetupCard({
  meetup,
  hostUsername,
  photoUrl,
  photoCount,
  distanceMiles,
}: MeetupCardData) {
  return (
    <Link
      href={`/discover/${meetup.id}`}
      className="glass block overflow-hidden rounded-2xl transition-opacity hover:opacity-90"
    >
      {photoUrl && (
        <div className="relative aspect-[16/9] w-full bg-surface">
          <Image
            src={photoUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 600px, 100vw"
            className="object-cover"
          />
          {photoCount > 1 && (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              +{photoCount - 1}
            </span>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">{meetup.title}</p>
              {meetup.tier === "promoted" && (
                <span className="flex-shrink-0 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-accent-foreground">
                  Promoted
                </span>
              )}
            </div>
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
          <p className="mt-2 line-clamp-2 text-sm text-foreground">{meetup.description}</p>
        )}

        <p className="mt-3 text-xs text-muted">Hosted by @{hostUsername}</p>
      </div>
    </Link>
  );
}
