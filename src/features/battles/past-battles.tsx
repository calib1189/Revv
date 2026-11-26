import Link from "next/link";
import { MediaImg } from "@/components/ui/media-img";
import { ChevronRightIcon } from "@/components/ui/icons";
import type { BattleView } from "@/lib/battles/load";

function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Every recent battle's result, newest first: both cars, who won and by
 * how much. Each opens that battle's own page with its full reveal. */
export function PastBattles({ battles }: { battles: BattleView[] }) {
  if (battles.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-[1.125rem] font-bold">Past battles</h2>
      <ul className="glass-raised elev-1 flex flex-col overflow-hidden rounded-[22px]">
        {battles.map((b, i) => {
          const r = b.result!;
          const total = r.a + r.b;
          const pctA = Math.round((r.a / total) * 100);
          const winner = r.winnerId === b.a.vehicleId ? b.a : r.winnerId === b.b.vehicleId ? b.b : null;
          const loser = winner === b.a ? b.b : winner === b.b ? b.a : null;
          const winPct = winner === b.a ? pctA : 100 - pctA;
          return (
            <li key={b.id} className="relative">
              {i > 0 && <span className="absolute left-4 right-4 top-0 h-px bg-border" />}
              <Link href={`/battle/${b.id}`} className="pressable flex items-center gap-3 px-4 py-3">
                <span className="relative flex h-12 w-[4.5rem] flex-shrink-0 overflow-hidden rounded-[12px] bg-surface-raised">
                  {[b.a, b.b].map((car) => (
                    <span
                      key={car.vehicleId}
                      className={`relative h-full w-1/2 ${winner && winner.vehicleId !== car.vehicleId ? "opacity-40 grayscale" : ""}`}
                    >
                      <MediaImg src={car.heroUrl} sizes="40px" className="h-full w-full object-cover" loading="lazy" />
                    </span>
                  ))}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[0.75rem] text-muted">
                    {dayLabel(b.dateKey)}
                    {r.upset && <span className="rounded-full bg-accent/15 px-1.5 text-[0.625rem] font-bold uppercase tracking-[0.06em] text-accent">Upset</span>}
                  </span>
                  <span className="block truncate text-[0.9375rem] font-semibold">
                    {winner && loser ? `${winner.title} beat ${loser.title}` : `${b.a.title} tied ${b.b.title}`}
                  </span>
                  <span className="numeral block text-[0.8125rem] text-muted">
                    {winner ? `${winPct}–${100 - winPct}` : "50–50"} · {total} {total === 1 ? "vote" : "votes"}
                  </span>
                </span>
                <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
