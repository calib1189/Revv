export default function BattleLoading() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="h-9 w-48 animate-pulse rounded bg-surface" />
      <div className="flex h-[72dvh] max-h-[760px] flex-col gap-2">
        <div className="flex-1 animate-pulse rounded-[22px] bg-surface" />
        <div className="flex-1 animate-pulse rounded-[22px] bg-surface" />
      </div>
    </div>
  );
}
