import Image from "next/image";
import Link from "next/link";
import { GemIcon } from "@/components/ui/icons";

export interface DailySponsor {
  name: string;
  url: string | null;
  logoUrl: string | null;
}

/** "Presented by [logo] Name", linking out to the sponsor (marked as a
 * sponsored link). For use over the dark challenge art. */
export function PresentedBy({ sponsor, className = "" }: { sponsor: DailySponsor; className?: string }) {
  const body = (
    <>
      <span className="text-white/60">Presented by</span>
      {sponsor.logoUrl && (
        <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full bg-white">
          <Image src={sponsor.logoUrl} alt="" fill sizes="48px" className="object-contain p-0.5" />
        </span>
      )}
      <span className="truncate font-semibold text-white">{sponsor.name}</span>
    </>
  );
  const cls = `flex min-w-0 items-center gap-1.5 text-[0.8125rem] ${className}`;
  if (!sponsor.url) return <p className={cls}>{body}</p>;
  return (
    <a href={sponsor.url} target="_blank" rel="sponsored noopener noreferrer" className={`${cls} pressable`}>
      {body}
    </a>
  );
}

/** What the winner takes home, on top of the usual points. */
export function PrizeStrip({ prize, points }: { prize: string; points: number }) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-accent/12 px-4 py-3 ring-1 ring-accent/30">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white">
        <GemIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="micro-label text-accent">Winner gets</p>
        <p className="mt-0.5 text-[0.9375rem] font-semibold leading-snug text-white">{prize}</p>
        <p className="mt-0.5 text-[0.75rem] text-white/55">
          Plus {points} points.{" "}
          <Link href="/daily/rules" className="underline underline-offset-2">
            Official rules
          </Link>
        </p>
      </div>
    </div>
  );
}
