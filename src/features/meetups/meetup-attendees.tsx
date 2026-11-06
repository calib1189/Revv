import Link from "next/link";
import Image from "next/image";
import { SectionTitle } from "@/components/ui/grouped-list";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { Avatar } from "@/features/feed/avatar";
import { RANK_LABELS, rankForScore, tierColorVar } from "@/lib/rating/rank";
import { meetRating } from "@/lib/meetups/attendance";
import type { AttendeeEntry } from "@/lib/meetups/compose-attendees";

/** "Who's going" on a meet's page: the meet's overall rating (the average
 * of the rated cars going), then everyone going, best-rated car first,
 * each row the same shape as a leaderboard row. */
export function MeetupAttendees({
  attendees,
  isOver,
  viewerId,
  control,
}: {
  attendees: AttendeeEntry[];
  isOver: boolean;
  viewerId: string | null;
  /** The viewer's RSVP control, which sits under the heading. */
  control?: React.ReactNode;
}) {
  const { average, ratedCount } = meetRating(attendees.map((a) => a.score));
  const tier = average != null ? rankForScore(average) : null;

  return (
    <section>
      <SectionTitle
        action={
          attendees.length > 0 ? (
            <span>
              <span className="numeral">{attendees.length.toLocaleString("en-US")}</span> {isOver ? "went" : "going"}
            </span>
          ) : undefined
        }
      >
        {isOver ? "Who went" : "Who's going"}
      </SectionTitle>

      <div className="flex flex-col gap-3">
        {tier && average != null && (
          <div className="glass-raised elev-1 flex items-center gap-4 rounded-[22px] px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">Meet rating</p>
              <p className="mt-0.5 text-[0.8125rem] text-muted">
                Average of {ratedCount === 1 ? "1 rated car" : `${ratedCount} rated cars`}
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="numeral text-[1.75rem] leading-none">{average.toFixed(2)}</p>
              <p className="micro-label mt-1" style={{ color: tierColorVar(tier) }}>
                {RANK_LABELS[tier]}
              </p>
            </div>
          </div>
        )}

        {control}

        {attendees.length === 0 ? (
          <p className="px-1 text-center text-[0.875rem] text-muted">
            {isOver ? "Nobody marked themselves as going." : "Nobody's said they're going yet."}
          </p>
        ) : (
          <div className="glass-raised elev-1 overflow-hidden rounded-[22px] [&>*+*]:before:absolute [&>*+*]:before:left-[4.625rem] [&>*+*]:before:right-0 [&>*+*]:before:top-0 [&>*+*]:before:h-px [&>*+*]:before:bg-border [&>*+*]:before:content-['']">
            {attendees.map((a) => (
              <AttendeeRow key={a.userId} attendee={a} isViewer={a.userId === viewerId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AttendeeRow({ attendee: a, isViewer }: { attendee: AttendeeEntry; isViewer: boolean }) {
  const tier = a.score != null ? rankForScore(a.score) : null;
  const name = a.displayName || a.username;

  return (
    <Link
      href={a.vehicleId ? `/garage/${a.vehicleId}` : `/u/${a.username}`}
      className={`relative flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-foreground/[0.06] ${
        isViewer ? "bg-accent/[0.07]" : ""
      }`}
    >
      {a.vehicleId ? (
        <div
          className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-[12px] bg-foreground/[0.06]"
          style={
            tier
              ? { boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${tierColorVar(tier)} 55%, transparent)` }
              : undefined
          }
        >
          {a.carPhotoUrl && <Image src={a.carPhotoUrl} alt="" fill sizes="48px" className="object-cover" />}
        </div>
      ) : (
        <Avatar username={a.username} avatarUrl={a.avatarUrl} className="h-12 w-12 flex-shrink-0 text-base" />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold">
          {a.vehicleTitle ?? name}
          {isViewer && <span className="ml-1.5 text-[0.75rem] font-semibold text-accent">You</span>}
        </p>
        <p className="mt-0.5 truncate text-[0.8125rem] text-muted">
          @{a.username}
          {a.isVerified && <VerifiedBadge className="ml-1 h-3 w-3 align-[-0.1em]" />}
          {!a.vehicleId && " · No car picked"}
        </p>
      </div>

      {a.vehicleId && (
        <div className="flex-shrink-0 text-right">
          {tier && a.score != null ? (
            <>
              <p className="numeral text-[1.125rem] leading-none">{a.score.toFixed(2)}</p>
              <p className="micro-label mt-1" style={{ color: tierColorVar(tier) }}>
                {RANK_LABELS[tier]}
              </p>
            </>
          ) : (
            <p className="text-[0.8125rem] text-muted">Unrated</p>
          )}
        </div>
      )}
    </Link>
  );
}
