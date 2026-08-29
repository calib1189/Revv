export default function LeaderboardLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5">
            <div className="h-6 w-6 flex-shrink-0 animate-pulse rounded bg-surface-raised" />
            <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-surface-raised" />
            <div className="flex-1">
              <div className="h-4 w-32 animate-pulse rounded bg-surface-raised" />
              <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-surface-raised" />
            </div>
            <div className="h-5 w-10 flex-shrink-0 animate-pulse rounded bg-surface-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
