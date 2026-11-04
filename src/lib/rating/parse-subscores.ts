import type { Json } from "@/lib/supabase/database.types";
import type { BuildRatingSubscores } from "@/lib/providers/rating-provider";

const KEYS: (keyof BuildRatingSubscores)[] = ["appearance", "performance", "wheelsFitment", "interior", "modifications"];

/** A stored `ai_rating_subscores` value, or null unless all five
 * categories are present as numbers — never a partial breakdown. */
export function parseSubscores(value: Json | null | undefined): BuildRatingSubscores | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out = {} as BuildRatingSubscores;
  for (const key of KEYS) {
    const v = value[key];
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    out[key] = v;
  }
  return out;
}
