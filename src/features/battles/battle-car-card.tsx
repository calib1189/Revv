import Link from "next/link";
import { ChevronRightIcon } from "@/components/ui/icons";
import { SkipLineControl } from "@/features/battles/skip-line-control";
import type { SkipLineState } from "@/lib/battles/skip-line";

/** A car's Build Battles on its page: its record for everyone, and for
 * the owner, skipping the line into the next battle. Hidden for a car
 * that has never battled and can't skip (nothing to say). */
export function BattleCarCard({
  vehicleId,
  record,
  skip,
}: {
  vehicleId: string;
  record: { wins: number; losses: number } | null;
  /** Owner only. */
  skip: SkipLineState | null;
}) {
  const canSkip = skip !== null && skip.kind !== "ineligible";
  if (!record && !canSkip) return null;

  return (
    <div className="glass-raised elev-1 flex flex-col gap-3 rounded-[22px] px-5 py-4">
      <Link href="/battle" className="flex items-center justify-between gap-3">
        <div>
          <p className="micro-label text-accent">Build Battles</p>
          <p className="mt-1 text-[0.9375rem]">
            {record ? (
              <>
                <span className="numeral font-semibold">
                  {record.wins}–{record.losses}
                </span>{" "}
                <span className="text-muted">
                  {record.wins === 1 ? "1 win" : `${record.wins} wins`},{" "}
                  {record.losses === 1 ? "1 loss" : `${record.losses} losses`}
                </span>
              </>
            ) : (
              <span className="text-muted">No battles yet</span>
            )}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted/60" />
      </Link>
      {canSkip && <SkipLineControl vehicleId={vehicleId} state={skip} />}
    </div>
  );
}
