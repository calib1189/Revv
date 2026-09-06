export default function StoreLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
      <div className="h-28 animate-pulse rounded-3xl bg-surface" />
      {[0, 1, 2].map((section) => (
        <div key={section} className="mt-8">
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-surface" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="h-40 animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
