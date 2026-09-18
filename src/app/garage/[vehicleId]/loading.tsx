export default function VehicleLoading() {
  return (
    <div className="flex flex-1 flex-col pb-16">
      <div className="h-[min(78svh,560px)] w-full animate-pulse bg-surface sm:h-[min(70vh,620px)]" />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 sm:px-6 sm:pt-8">
        <div className="h-[168px] animate-pulse rounded-[28px] bg-surface" />
        <div className="h-[92px] animate-pulse rounded-[22px] bg-surface" />
        <div className="h-[240px] animate-pulse rounded-[22px] bg-surface" />
      </div>
    </div>
  );
}
