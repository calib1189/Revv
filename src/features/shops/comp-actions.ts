"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAuditLog } from "@/lib/db/audit-logs";
import {
  createCompedShopPromotion,
  endCompedShopPromotion,
  isShopPromotionTier,
} from "@/lib/db/shop-promotions";
import { isShopCategoryId } from "@/lib/shops/categories";
import { compEndsAt, isCompLengthDays } from "@/lib/shops/comp";

export interface CompResult {
  error?: string;
}

function shopPath(placeId: string): string {
  return `/discover/shop/${encodeURIComponent(placeId)}`;
}

/** Promotes a shop for free. Admin-only twice over: requireAdmin here, and
 * the 0100 insert policy in the database. */
export async function compShopPromotionAction({
  placeId,
  placeName,
  tier,
  days,
  category,
}: {
  placeId: string;
  placeName: string;
  tier: string;
  days: number;
  category: string | null;
}): Promise<CompResult> {
  if (!placeId || !placeName) return { error: "Couldn't identify that shop." };
  if (!isShopPromotionTier(tier)) return { error: "Choose a tier." };
  if (!isCompLengthDays(days)) return { error: "Choose how long." };
  if (category && !isShopCategoryId(category)) return { error: "Choose a valid category." };

  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Only admins can do that." };
  }

  const startsAt = new Date();
  try {
    const promotion = await createCompedShopPromotion(admin.supabase, {
      adminId: admin.userId,
      placeId,
      placeName,
      tier,
      category,
      startsAt,
      endsAt: compEndsAt(startsAt, days),
    });
    await createAuditLog(admin.supabase, {
      actorId: admin.userId,
      action: "shop_promotion.comped",
      targetType: "shop_promotion",
      targetId: promotion.id,
      metadata: { placeId, placeName, tier, days, category },
    }).catch(() => undefined);
  } catch {
    return {
      error: "Couldn't promote this shop. If this keeps happening, migration 0100 may not be applied yet.",
    };
  }

  revalidatePath(shopPath(placeId));
  revalidatePath("/admin/active");
  return {};
}

export async function endCompedShopPromotionAction({
  promotionId,
  placeId,
}: {
  promotionId: string;
  placeId: string;
}): Promise<CompResult> {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return { error: "Only admins can do that." };
  }

  try {
    await endCompedShopPromotion(admin.supabase, promotionId);
    await createAuditLog(admin.supabase, {
      actorId: admin.userId,
      action: "shop_promotion.comp_ended",
      targetType: "shop_promotion",
      targetId: promotionId,
      metadata: { placeId },
    }).catch(() => undefined);
  } catch {
    return { error: "Couldn't end that promotion. Try again." };
  }

  revalidatePath(shopPath(placeId));
  revalidatePath("/admin/active");
  return {};
}
