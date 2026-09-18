export default function ProfileLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div className="h-[120px] w-[120px] animate-pulse rounded-full bg-surface" />
      <div className="mt-4 h-7 w-44 animate-pulse rounded-lg bg-surface" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded-full bg-surface" />
      <div className="mt-6 flex w-full max-w-sm justify-around">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className="h-6 w-10 animate-pulse rounded-md bg-surface" />
            <div className="h-3 w-14 animate-pulse rounded-full bg-surface" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex w-full max-w-md gap-2.5">
        <div className="h-10 flex-1 animate-pulse rounded-full bg-surface" />
        <div className="h-10 flex-1 animate-pulse rounded-full bg-surface" />
      </div>
      <div className="mt-8 h-9 w-full animate-pulse rounded-[12px] bg-surface" />
      <div className="mt-5 grid w-full grid-cols-3 gap-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse bg-surface" />
        ))}
      </div>
    </div>
  );
}
