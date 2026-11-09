import type { ReactNode } from "react";
import { ChallengeVisual } from "@/features/daily/challenge-visual";
import { Countdown } from "@/features/daily/countdown";
import type { ChallengeIcon } from "@/lib/daily/rotation";

/** Today's challenge, as the Daily page's lead card: the art (or the
 * admin's cover photo) with the live clock and the title over it, then
 * the brief, the day's real numbers and whatever action fits the viewer. */
export function ChallengeHero({
  icon,
  coverUrl,
  title,
  description,
  endsAt,
  isOpen,
  number,
  stats,
  children,
}: {
  icon: ChallengeIcon;
  coverUrl: string | null;
  title: string;
  description: string;
  endsAt: string;
  isOpen: boolean;
  number: number;
  stats: { label: string; value: string; accent?: boolean }[];
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] bg-[#09090a] text-white elev-3 ring-1 ring-white/[0.06]">
      <div className="relative aspect-square w-full sm:aspect-[16/10]">
        <ChallengeVisual icon={icon} coverUrl={coverUrl} priority />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#09090a] via-[#09090a]/75 to-transparent" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/50 to-transparent" />

        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
          <div className="flex h-8 items-center gap-2 rounded-full bg-black/55 pl-2.5 pr-3 text-[0.75rem] font-semibold backdrop-blur-md">
            {isOpen ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
                  <span className="relative h-2 w-2 rounded-full bg-accent" />
                </span>
                <span className="tracking-[0.12em] text-white/60">LIVE</span>
                <Countdown endsAt={endsAt} clock fallback="--:--:--" className="tracking-[0.02em]" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-white/40" />
                <span className="tracking-[0.12em] text-white/70">CLOSED</span>
              </>
            )}
          </div>
          <span className="numeral text-[0.75rem] tracking-[0.14em] text-white/55">
            NO. {String(number).padStart(3, "0")}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
          <div className="flex items-center gap-2">
            <span className="h-[3px] w-5 -skew-x-[36deg] bg-accent" />
            <p className="micro-label text-accent">Today&apos;s challenge</p>
          </div>
          <h2 className="mt-2 max-w-[17ch] text-balance text-[2.25rem] font-bold leading-[0.98] tracking-[-0.035em] sm:text-[2.75rem]">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-5 pb-5 pt-2">
        <p className="text-[0.9375rem] leading-relaxed text-white/75">{description}</p>
        <dl className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-[18px] bg-white/[0.04] py-3 ring-1 ring-white/[0.06]">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-2">
              <dt className="micro-label text-white/45">{s.label}</dt>
              <dd className={`numeral text-[1.25rem] font-bold leading-none ${s.accent ? "text-accent" : ""}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </section>
  );
}
