export default function GarageLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="h-3.5 w-20 animate-pulse rounded-full bg-surface" />
          <div className="mt-2.5 h-9 w-36 animate-pulse rounded-xl bg-surface" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-surface" />
        </div>
      </div>
      <div className="mb-10 h-[220px] animate-pulse rounded-[28px] bg-surface" />
      <div className="mb-2.5 h-6 w-28 animate-pulse rounded-lg bg-surface" />
      <div className="aspect-[4/5] animate-pulse rounded-[28px] bg-surface sm:aspect-[16/10]" />
    </div>
  );
}
