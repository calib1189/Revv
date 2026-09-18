import { CheckIcon } from "@/components/ui/icons";

const POINTS = [
  "Photos are the primary evidence. Custom paint, bodywork, and widebody kits count as much as bolt-on parts, even mods you haven't logged yet.",
  "The AI weighs how coherent and well executed the build looks, not just how many parts are listed.",
  "A stock car isn't penalized unfairly. It just naturally scores lower than a thoughtfully modified one.",
  "90+ is reserved for genuinely exceptional builds. A perfect 100 is rare.",
  "Re-rate anytime from your garage as you add mods or photos, and the score updates.",
];

export function RatingExplainer() {
  return (
    <div className="glass-raised elev-1 rounded-[22px] p-5">
      <p className="text-[0.9375rem] leading-relaxed text-muted">
        An AI vision model looks at your build&apos;s photos (paint, panels,
        wheels, stance, interior) plus every part you&apos;ve logged, and
        scores the whole build 0–100. That score decides your tier.
      </p>
      <ul className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
        {POINTS.map((point) => (
          <li key={point} className="flex gap-3 text-[0.875rem] leading-relaxed">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
              <CheckIcon className="h-3 w-3" />
            </span>
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
