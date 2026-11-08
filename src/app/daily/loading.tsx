export default function DailyLoading() {
  const block = "animate-pulse bg-surface";
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10" aria-busy="true" aria-label="Loading">
      <div className={`h-3 w-32 rounded-full ${block}`} />
      <div className={`mt-3 h-9 w-48 rounded-xl ${block}`} />
      <div className={`mt-5 aspect-[16/10] w-full rounded-[26px] ${block}`} />
      <div className={`mt-9 h-7 w-24 rounded-xl ${block}`} />
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`aspect-[4/5] rounded-[20px] ${block}`} />
        ))}
      </div>
    </div>
  );
}
