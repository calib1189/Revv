export default function AdvertiseLoading() {
  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <div className="mb-2 h-8 w-64 animate-pulse rounded bg-surface" />
      <div className="mb-6 h-4 w-full animate-pulse rounded bg-surface" />
      <div className="h-40 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
