type ApprovalStatus = "none" | "pending" | "approved" | "rejected";

/** The owner's view of whether this car can be on the leaderboard. An
 * admin approves each new car once, from its photos (/admin/verifications).
 * Nothing for the owner to do but wait; an approved car says nothing here,
 * since the rank card above already shows where it sits. */
export function LeaderboardStatus({
  status,
  hasPhoto,
  rated,
}: {
  status: ApprovalStatus;
  hasPhoto: boolean;
  rated: boolean;
}) {
  if (status === "approved" || (!hasPhoto && status !== "rejected")) return null;

  const rejected = status === "rejected";
  return (
    <section className="glass-raised elev-1 rounded-[22px] px-5 py-4">
      <p className="text-[0.9375rem] font-semibold">
        {rejected ? "Not on the leaderboard" : "Waiting for approval"}
      </p>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">
        {rejected
          ? "SORZA didn't approve this car for the leaderboard. If you think that's a mistake, message us."
          : rated
            ? "SORZA checks every new car. Nothing else to do: it goes on the leaderboard as soon as it's approved."
            : "SORZA checks every new car. Nothing else to do: once it's approved, rate it and it goes straight on the leaderboard."}
      </p>
    </section>
  );
}
