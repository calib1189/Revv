import { GemIcon } from "@/components/ui/icons";
import { RANK_TEXT_COLORS } from "@/lib/rating/rank";

/** Reuses the exact silver/gold/diamond colors from the build-rating rank
 * system (rank.ts) purely as a color palette — this has nothing to do
 * with build ranks, and never touches that system. Sharing the palette
 * just means "premium tier" reads the same way everywhere in the app
 * instead of two unrelated color languages for the same idea. */
export type TierMetal = "silver" | "gold" | "diamond";

const METAL_COLORS: Record<TierMetal, string> = {
  silver: RANK_TEXT_COLORS.silver,
  gold: RANK_TEXT_COLORS.gold,
  diamond: RANK_TEXT_COLORS.diamond,
};

const METAL_LABELS: Record<TierMetal, string> = {
  silver: "Silver",
  gold: "Gold",
  diamond: "Diamond",
};

export interface TierPickerOption {
  id: string;
  metal: TierMetal;
  priceCents: number;
  /** e.g. "3 days" or "Sorts above Silver listings" — shown under the
   * name when the option is buyable. */
  subtitle?: string;
  disabled?: boolean;
  /** Shown instead of the price/subtitle when disabled — e.g. "Already
   * active". */
  disabledReason?: string;
}

export function TierPicker({
  options,
  value,
  onChange,
  name,
}: {
  options: TierPickerOption[];
  value: string;
  onChange: (id: string) => void;
  /** Groups the radio inputs — needs to be unique per picker on the page. */
  name: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {options.map((option) => {
        const color = METAL_COLORS[option.metal];
        const isSelected = value === option.id;
        return (
          <label
            key={option.id}
            style={
              isSelected && !option.disabled
                ? { borderColor: color, backgroundColor: `${color}1A` }
                : undefined
            }
            className={`flex items-center gap-3 rounded-2xl border p-3.5 transition-colors ${
              isSelected && !option.disabled ? "" : "border-border"
            } ${option.disabled ? "opacity-50" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name={name}
              checked={isSelected}
              disabled={option.disabled}
              onChange={() => onChange(option.id)}
              className="sr-only"
            />
            <span
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${color}26`, color }}
            >
              <GemIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-sm font-semibold"
                style={isSelected && !option.disabled ? { color } : undefined}
              >
                {METAL_LABELS[option.metal]}
              </span>
              <span className="block truncate text-xs text-muted">
                {option.disabled ? (option.disabledReason ?? "Not available") : option.subtitle}
              </span>
            </span>
            <span className="flex-shrink-0 text-base font-bold tabular-nums">
              ${(option.priceCents / 100).toFixed(0)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
