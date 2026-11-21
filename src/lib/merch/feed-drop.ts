import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { hasPaidTeeOrder } from "@/lib/db/shop-orders";
import { merchEnabled, teesOnSale, TEE_COLOR_INFO, TEE_FROM_CENTS, type TeeColor, type TeeDesignId } from "@/lib/merch/products";

/** A limited tee drop, as the feed's slide for it. */
export interface FeedDrop {
  id: TeeDesignId;
  name: string;
  endsAt: string;
  fromCents: number;
  /** Colours in the order the shirt cycles through them, the sheet's
   * default first. */
  colors: { id: TeeColor; label: string; swatch: string }[];
}

/** The live drop for the feed's slide, or null: no drop on, tees not
 * switched on for this person, or they've already bought it (an ad for
 * something you own is the annoying kind). */
export async function loadFeedDrop(
  supabase: SupabaseClient<Database>,
  userId: string | null,
  isAdmin: boolean,
): Promise<FeedDrop | null> {
  // The shop is for members: a link a signed-out viewer can't use isn't worth a slide.
  if (!userId || !merchEnabled(isAdmin)) return null;
  const drop = teesOnSale().find((d) => d.endsAt);
  if (!drop?.endsAt) return null;
  if (await hasPaidTeeOrder(supabase, userId, drop.id)) return null;
  const ordered = [drop.defaultColor, ...drop.colors.filter((c) => c !== drop.defaultColor)];
  return {
    id: drop.id,
    name: drop.name,
    endsAt: drop.endsAt,
    fromCents: TEE_FROM_CENTS,
    colors: ordered.map((c) => ({ id: c, label: TEE_COLOR_INFO[c].label, swatch: TEE_COLOR_INFO[c].swatch })),
  };
}
