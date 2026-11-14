import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PointPack } from "@/lib/points/packs";

// Server-only. The one place bought points enter the ledger. Payment
// providers retry their notifications and the app may report the same
// purchase twice, so every step here is safe to repeat: one purchase
// row per provider transaction (unique), one ledger row per purchase
// (unique on user + source).

export async function creditPointsPurchase(input: {
  userId: string;
  provider: "apple" | "stripe";
  providerRef: string;
  pack: PointPack;
  amountCents: number;
  currency: string;
}): Promise<{ purchaseId: string; isNew: boolean }> {
  const supabase = createServiceRoleClient();
  const inserted = await supabase
    .from("points_purchases")
    .upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        provider_ref: input.providerRef,
        pack_id: input.pack.id,
        points: input.pack.points,
        amount_cents: input.amountCents,
        currency: input.currency.toLowerCase().slice(0, 3),
      },
      { onConflict: "provider,provider_ref", ignoreDuplicates: true },
    )
    .select("id, user_id, points")
    .maybeSingle();
  if (inserted.error) throw inserted.error;

  // Already recorded (a retry): use that row, and only ever for its own
  // buyer, so a replayed id can't move points to someone else.
  const isNew = Boolean(inserted.data);
  let purchase = inserted.data;
  if (!purchase) {
    const existing = await supabase
      .from("points_purchases")
      .select("id, user_id, points")
      .eq("provider", input.provider)
      .eq("provider_ref", input.providerRef)
      .single();
    if (existing.error) throw existing.error;
    purchase = existing.data;
  }
  if (purchase.user_id !== input.userId) throw new Error("That purchase belongs to a different account.");

  const ledger = await supabase.from("points_ledger").upsert(
    { user_id: purchase.user_id, amount: purchase.points, source_type: "points_pack", source_id: purchase.id },
    { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
  );
  if (ledger.error) throw ledger.error;
  return { purchaseId: purchase.id, isNew };
}

/** Takes a refunded purchase's points back (once). The balance can go
 * below zero if they were already spent; earning brings it back up. */
export async function refundPointsPurchase(provider: "apple" | "stripe", providerRef: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: purchase, error } = await supabase
    .from("points_purchases")
    .update({ refunded_at: new Date().toISOString() })
    .eq("provider", provider)
    .eq("provider_ref", providerRef)
    .select("id, user_id, points")
    .maybeSingle();
  if (error) throw error;
  if (!purchase) return;
  const ledger = await supabase.from("points_ledger").upsert(
    { user_id: purchase.user_id, amount: -purchase.points, source_type: "points_refund", source_id: purchase.id },
    { onConflict: "user_id,source_type,source_id", ignoreDuplicates: true },
  );
  if (ledger.error) throw ledger.error;
}
