type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

/** The owner's view of whether this car can be on the leaderboard. An
 * admin approves each new car once, from its photos (/admin/verifications).
 * Nothing for the owner to do but wait; an approved car says nothing here,
 * since the rank card above already shows where it sits. */
export function LeaderboardStatus({
  status,
  hasPhoto,
  rated,
  rejectionReason,
}: {
  status: ApprovalStatus;
  hasPhoto: boolean;
  rated: boolean;
  /** The admin's message when the car was rejected (0108). */
  rejectionReason: string | null;
}) {
  if (status === "approved" || (!hasPhoto && status !== "rejected")) return null;

  if (status === "rejected") {
    return (
      <section className="glass-raised elev-1 rounded-[22px] px-5 py-4">
        <p className="text-[0.9375rem] font-semibold">Not approved for the leaderboard</p>
        {rejectionReason ? (
          <div className="mt-3 rounded-[16px] bg-foreground/[0.05] px-4 py-3">
            <p className="micro-label text-muted">Message from SORZA</p>
            <p className="mt-1 whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{rejectionReason}</p>
          </div>
        ) : (
          <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">
            SORZA didn&apos;t approve this car for the leaderboard.
          </p>
        )}
        <p className="mt-3 text-[0.875rem] leading-relaxed text-muted">
          Fixed it? Upload a new cover photo and SORZA will take another look.
        </p>
        <a href="#manage" className="mt-2 inline-block text-[0.9375rem] font-semibold text-accent">
          Change cover photo
        </a>
      </section>
    );
  }

  return (
    <section className="glass-raised elev-1 rounded-[22px] px-5 py-4">
      <p className="text-[0.9375rem] font-semibold">Waiting for approval</p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">
        {rated
          ? "SORZA checks every new car. Nothing else to do: it goes on the leaderboard as soon as it's approved."
          : "SORZA checks every new car. Nothing else to do: once it's approved, rate it and it goes straight on the leaderboard."}
      </p>
    </section>
  );
}
