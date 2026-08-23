export default function DiscoverLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-surface" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
