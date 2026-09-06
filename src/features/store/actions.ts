"use server";

import { revalidatePath } from "next/cache";
import { requireConfirmedUser } from "@/lib/auth/require-confirmed-user";
import { getPointsBalance, listOwnedItemIds } from "@/lib/db/points";
import { updateEquippedCosmetic } from "@/lib/db/profiles";
import { getStoreItem, type StoreCategory } from "@/lib/store/catalog";

export interface StoreActionState {
  error: string | null;
}

/** The item's price is always looked up here, server-side, from the
 * deployed catalog — never trusted from whatever the client sends. A
 * request can name which item to buy, never what it costs. */
export async function purchaseItemAction(itemId: string): Promise<StoreActionState> {
  const item = getStoreItem(itemId);
  if (!item) return { error: "That item doesn't exist." };

  const { supabase, user } = await requireConfirmedUser();

  const owned = await listOwnedItemIds(supabase, user.id);
  if (owned.has(itemId)) return { error: "You already own this." };

  const balance = await getPointsBalance(supabase, user.id);
  if (balance < item.price) return { error: "Not enough points." };

  try {
    const { error: ownedError } = await supabase
      .from("store_items_owned")
      .insert({ user_id: user.id, item_id: itemId });
    if (ownedError) throw ownedError;

    const { error: ledgerError } = await supabase.from("points_ledger").insert({
      user_id: user.id,
      amount: -item.price,
      source_type: "purchase",
      source_id: itemId,
    });
    if (ledgerError) throw ledgerError;
  } catch (err) {
    console.error("purchaseItemAction failed:", err);
    return { error: "Couldn't complete that purchase. Try again." };
  }

  revalidatePath("/store");
  return { error: null };
}

/** itemId: null unequips that slot. Ownership is verified here (never
 * trust that a client only sends ids it actually owns) before writing
 * anything to the public-facing profile columns. */
export async function equipItemAction(
  category: StoreCategory,
  itemId: string | null,
): Promise<StoreActionState> {
  const { supabase, user } = await requireConfirmedUser();

  if (itemId) {
    const item = getStoreItem(itemId);
    if (!item || item.category !== category) return { error: "Invalid item." };

    const owned = await listOwnedItemIds(supabase, user.id);
    if (!owned.has(itemId)) return { error: "You don't own this item." };
  }

  try {
    const profile = await updateEquippedCosmetic(supabase, user.id, category, itemId);
    revalidatePath("/store");
    revalidatePath(`/u/${profile.username}`);
  } catch (err) {
    console.error("equipItemAction failed:", err);
    return { error: "Couldn't update your equipped item. Try again." };
  }

  return { error: null };
}
