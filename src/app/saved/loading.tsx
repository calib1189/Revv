export default function SavedLoading() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 h-8 w-24 animate-pulse rounded bg-surface" />
      <div className="flex flex-col gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-2xl bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
