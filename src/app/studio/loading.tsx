export default function StudioLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface" />
      <div className="mb-8 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
