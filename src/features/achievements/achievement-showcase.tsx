import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { achievementColor, getAchievement } from "@/lib/achievements/catalog";

/** Same icon-in-a-colored-circle language as AchievementBadge, just
 * smaller — this sits inline in the profile header, not in a grid.
 * `frameClassName` is the owner's equipped store cosmetic (a decorative
 * ring, see the .frame-* classes in globals.css) — unrelated to the
 * real rank-tier ring system, purely a purchased look. */
function ShowcaseBadge({ id, frameClassName }: { id: string; frameClassName?: string }) {
  const achievement = getAchievement(id);
  if (!achievement) return null;

  const color = achievementColor(achievement);
  const TierIcon = achievement.tier ? RANK_MATERIAL_ICONS[achievement.tier] : null;
  const Icon = achievement.icon;

  return (
    <div className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3">
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${frameClassName ?? ""}`}
        style={{ backgroundColor: `${color}26` }}
      >
        {TierIcon ? (
          <TierIcon className="h-5 w-5" />
        ) : Icon ? (
          <Icon className="h-3.5 w-3.5" style={{ color }} />
        ) : null}
      </span>
      <span className="whitespace-nowrap text-xs font-medium">{achievement.name}</span>
    </div>
  );
}

/** The "flex" surface — up to 3 pinned achievements shown directly on
 * the profile header, visible to any visitor without clicking into the
 * Achievements tab. Renders nothing at all if the owner hasn't picked
 * any, rather than an empty-state placeholder — a stranger's profile
 * with no showcase shouldn't announce that absence. */
export function ProfileShowcase({
  achievementIds,
  frameClassName,
}: {
  achievementIds: string[];
  /** The owner's equipped showcase-frame cosmetic, if any (store item,
   * see lib/store/catalog.ts) — applied to every pinned badge. */
  frameClassName?: string;
}) {
  if (achievementIds.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {achievementIds.map((id) => (
        <ShowcaseBadge key={id} id={id} frameClassName={frameClassName} />
      ))}
    </div>
  );
}
