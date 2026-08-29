export default function FriendsLoading() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-surface" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-surface" />
            <div className="h-4 w-28 animate-pulse rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
