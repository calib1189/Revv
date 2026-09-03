import { CheckIcon } from "@/components/ui/icons";
import { CHALLENGES } from "@/lib/challenges/catalog";
import type { ChallengeProgress } from "@/lib/challenges/evaluate";

/** The Garage/loop-facing "here's what to do this week" card — one row
 * per challenge with a progress bar, a checkmark once complete. Reads
 * entirely off `progress` computed server-side (see
 * lib/challenges/progress.ts); this component has no data-fetching of
 * its own. */
export function WeeklyChallengesCard({ progress }: { progress: ChallengeProgress[] }) {
  const completedCount = progress.filter((p) => p.completed).length;

  return (
    <div className="glass-raised rounded-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">This Week&apos;s Challenges</h2>
        <span className="text-sm text-muted">
          {completedCount}/{CHALLENGES.length}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {CHALLENGES.map((challenge) => {
          const p = progress.find((item) => item.id === challenge.id);
          const current = p?.current ?? 0;
          const target = p?.target ?? challenge.target;
          const completed = p?.completed ?? false;
          return (
            <div key={challenge.id}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                <span className={`flex items-center gap-1.5 font-medium ${completed ? "text-accent" : ""}`}>
                  {completed && <CheckIcon className="h-4 w-4 flex-shrink-0" />}
                  {challenge.name}
                </span>
                <span className="flex-shrink-0 tabular-nums text-muted">
                  {current}/{target}
                </span>
              </div>
              <p className="mb-1.5 text-xs text-muted">{challenge.description}</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${completed ? "bg-accent" : "bg-white/40"}`}
                  style={{ width: `${(current / target) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
