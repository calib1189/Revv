const POINTS = [
  "Photos are the primary evidence. Custom paint, bodywork, and widebody kits count just as much as bolt-on parts — even mods you haven't logged yet.",
  "The AI weighs how coherent and well-executed the build looks, not just how many parts are listed.",
  "A stock car isn't penalized unfairly. It just naturally scores lower than a thoughtfully modified one.",
  "90+ is reserved for genuinely exceptional builds. A perfect 100 is rare — it means something truly showstopping.",
  "Re-rate anytime from your garage as you add mods or photos, and the score updates.",
];

export function RatingExplainer() {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-lg font-semibold">How ratings work</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        An AI vision model looks at your build&apos;s photos — paint, panels, bumpers,
        wheels, stance, interior — plus every part you&apos;ve logged, and scores the
        whole build 0–100. That score decides your tier.
      </p>
      <ul className="mt-4 flex flex-col gap-3">
        {POINTS.map((point) => (
          <li key={point} className="flex gap-2.5 text-sm text-muted">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
