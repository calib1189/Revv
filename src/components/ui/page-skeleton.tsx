/** Loading placeholder shaped like the pages it stands in for: a
 * large-title header, an optional control bar (segmented control /
 * search field), then either a grouped list or a stack of cards. */
export function PageSkeleton({
  width = "lg",
  control = false,
  variant = "list",
  rows = 6,
}: {
  width?: "lg" | "2xl" | "3xl" | "5xl";
  control?: boolean;
  variant?: "list" | "cards" | "shelves";
  rows?: number;
}) {
  const max = { lg: "max-w-lg", "2xl": "max-w-2xl", "3xl": "max-w-3xl", "5xl": "max-w-5xl" }[width];
  const block = "animate-pulse bg-surface";

  return (
    <div className={`mx-auto w-full ${max} flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12`} aria-busy="true" aria-label="Loading">
      <div className={`mb-6 h-9 w-44 rounded-xl ${block}`} />
      {control && <div className={`mb-6 h-9 w-full rounded-[12px] ${block}`} />}

      {variant === "list" && (
        <div className="overflow-hidden rounded-[22px] bg-surface/60">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className={`h-11 w-11 flex-shrink-0 rounded-full ${block}`} />
              <div className="flex-1">
                <div className={`h-3.5 w-2/5 rounded-full ${block}`} />
                <div className={`mt-2 h-3 w-3/5 rounded-full ${block}`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "cards" && (
        <div className="flex flex-col gap-5">
          {Array.from({ length: Math.min(rows, 3) }).map((_, i) => (
            <div key={i} className={`aspect-[16/10] rounded-[24px] ${block}`} />
          ))}
        </div>
      )}

      {variant === "shelves" &&
        Array.from({ length: 2 }).map((_, s) => (
          <div key={s} className="mb-8">
            <div className={`mb-3 h-6 w-36 rounded-lg ${block}`} />
            <div className="flex gap-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`aspect-[4/3] w-[44vw] max-w-[200px] flex-shrink-0 rounded-[16px] ${block}`} />
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}
