"use client";

import { useState, useTransition } from "react";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { ACHIEVEMENTS, achievementColor, getAchievement } from "@/lib/achievements/catalog";
import { updateShowcaseAction } from "@/features/achievements/actions";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";

const MAX_SHOWCASED = 3;

function SlotIcon({ id }: { id: string }) {
  const achievement = getAchievement(id);
  if (!achievement) return null;
  const color = achievementColor(achievement);
  const TierIcon = achievement.tier ? RANK_MATERIAL_ICONS[achievement.tier] : null;
  const Icon = achievement.icon;

  return (
    <span
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}26` }}
    >
      {TierIcon ? <TierIcon className="h-7 w-7" /> : Icon ? <Icon className="h-5 w-5" style={{ color }} /> : null}
    </span>
  );
}

/** Owner-only — lets them pin up to 3 of their own unlocked achievements
 * to their profile header (ProfileShowcase renders the public-facing
 * result). Each slot is either filled (icon + name + remove) or an
 * empty "+" that opens a picker of unlocked-but-not-showcased
 * achievements below the slots row. Optimistic: the slot updates
 * immediately, rolling back only if the server action actually fails. */
export function AchievementShowcaseEditor({
  initialShowcasedIds,
  unlockedAtById,
}: {
  initialShowcasedIds: string[];
  unlockedAtById: Map<string, string>;
}) {
  const [selected, setSelected] = useState<string[]>(initialShowcasedIds);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const eligible = ACHIEVEMENTS.filter((a) => unlockedAtById.has(a.id) && !selected.includes(a.id));

  function commit(next: string[]) {
    const previous = selected;
    setSelected(next);
    setError(null);
    startTransition(async () => {
      const result = await updateShowcaseAction(next);
      if (result.error) {
        setSelected(previous);
        setError(result.error);
      }
    });
  }

  function addAchievement(id: string) {
    setPickerOpen(false);
    commit([...selected, id]);
  }

  function removeAchievement(id: string) {
    commit(selected.filter((existing) => existing !== id));
  }

  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-sm font-semibold">Showcase</p>
      <p className="mt-0.5 text-xs text-muted">
        Pin up to {MAX_SHOWCASED} achievements to show on your profile.
      </p>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {Array.from({ length: MAX_SHOWCASED }).map((_, i) => {
          const id = selected[i];
          if (id) {
            const achievement = getAchievement(id);
            return (
              <div key={id} className="glass-raised flex min-w-0 items-center gap-2 rounded-xl p-2">
                <SlotIcon id={id} />
                <span className="min-w-0 flex-1 truncate text-xs font-medium">
                  {achievement?.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAchievement(id)}
                  disabled={isPending}
                  aria-label={`Remove ${achievement?.name} from showcase`}
                  className="flex-shrink-0 text-muted hover:text-foreground"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            );
          }
          return (
            <button
              key={`empty-${i}`}
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              disabled={isPending || eligible.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border p-2 text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {pickerOpen && (
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-border">
          {eligible.length === 0 ? (
            <p className="p-3 text-xs text-muted">
              No more unlocked achievements to add.
            </p>
          ) : (
            eligible.map((achievement) => (
              <button
                key={achievement.id}
                type="button"
                onClick={() => addAchievement(achievement.id)}
                className="flex w-full items-center gap-2.5 border-b border-border p-2.5 text-left last:border-b-0 hover:bg-white/[0.04]"
              >
                <SlotIcon id={achievement.id} />
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{achievement.name}</p>
                  <p className="truncate text-[11px] text-muted">{achievement.description}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
