import type { ReactNode } from "react";

/** The quiet "nothing here yet" row used across Sorza Daily: a dashed
 * outline where the content will go, an icon, and two short lines. */
export function DailyEmpty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[22px] border border-dashed border-foreground/15 px-4 py-4">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.9375rem] font-semibold">{title}</p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}
