import type { Part } from "@/lib/db/parts";

export function ProductCard({ part }: { part: Part }) {
  const specs = Object.entries((part.specs as Record<string, unknown>) ?? {});

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          {part.brand} {part.product}
        </p>
        {part.verified ? (
          <span className="flex-shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
            Verified
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-full bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted">
            Unverified
          </span>
        )}
      </div>
      {part.part_number && (
        <p className="mt-0.5 text-xs text-muted">{part.part_number}</p>
      )}
      {specs.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
          {specs.map(([key, value]) => (
            <div key={key}>
              <dt className="text-[11px] uppercase tracking-wide text-muted">
                {key}
              </dt>
              <dd className="text-xs">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
