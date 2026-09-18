export default function GarageLoading() {
  const block = "animate-pulse bg-surface";
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 overflow-hidden px-4 pb-16 pt-8 sm:px-6 sm:pt-12" aria-busy="true" aria-label="Loading">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className={`h-3.5 w-28 rounded-full ${block}`} />
          <div className={`mt-2.5 h-9 w-36 rounded-xl ${block}`} />
        </div>
        <div className={`h-10 w-10 rounded-full ${block}`} />
      </div>
      <div className="mb-7 flex gap-3">
        <div className={`aspect-[4/5] w-[86%] flex-shrink-0 rounded-[28px] sm:aspect-[16/10] ${block}`} />
        <div className={`aspect-[4/5] w-[86%] flex-shrink-0 rounded-[28px] sm:aspect-[16/10] ${block}`} />
      </div>
      <div className="mb-9 grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div className={`h-14 w-14 rounded-full ${block}`} />
            <div className={`h-2.5 w-12 rounded-full ${block}`} />
          </div>
        ))}
      </div>
      <div className={`mb-3 h-[170px] rounded-[28px] ${block}`} />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-[22px] ${block}`} />
        ))}
      </div>
    </div>
  );
}
