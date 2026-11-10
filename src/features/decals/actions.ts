"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getVehicleById } from "@/lib/db/vehicles";
import { getActiveBuild } from "@/lib/db/builds";
import { createDecalCheckoutSession } from "@/lib/billing/stripe";
import { DECAL_PRICE_CENTS, earnedDecalTier } from "@/lib/decals/eligibility";
import { decalsEnabled } from "@/lib/decals/printful";
import { RANK_LABELS } from "@/lib/rating/rank";
import { SITE_URL } from "@/lib/site-url";

type Result = { ok: true; url: string } | { ok: false; error: string };

/** Starts a decal order for the owner's car, for the rank it earned
 * (checked here, not trusted from the page), and hands back Stripe's
 * checkout, which collects the shipping address. */
export async function startDecalOrderAction(vehicleId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to order a decal." };
  if (!decalsEnabled()) return { ok: false, error: "Decals aren't available yet." };

  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId).catch(() => null);
  if (!vehicle) return { ok: false, error: "That car wasn't found." };
  const build = await getActiveBuild(supabase, vehicle.id).catch(() => null);
  const score = build?.ai_rating_score ?? null;
  const tier = earnedDecalTier({
    ownerId: vehicle.owner_id,
    viewerId: user.id,
    verificationStatus: vehicle.ownership_verification_status,
    score,
  });
  if (!tier || score == null) return { ok: false, error: "Decals are for approved, rated cars, ordered by their owner." };

  const service = createServiceRoleClient();
  const { data: order, error } = await service
    .from("decal_orders")
    .insert({ user_id: user.id, vehicle_id: vehicle.id, tier, score, amount_cents: DECAL_PRICE_CENTS })
    .select("id")
    .single();
  if (error || !order) {
    console.error("Decal order not created:", error);
    return { ok: false, error: "Couldn't start your order. Try again." };
  }

  try {
    const session = await createDecalCheckoutSession({
      orderId: order.id,
      tierLabel: RANK_LABELS[tier],
      priceCents: DECAL_PRICE_CENTS,
      imageUrl: `${SITE_URL}/decals/${tier}.png`,
      customerEmail: user.email ?? null,
      successUrl: `${SITE_URL}/garage/${vehicle.id}?decal=ordered`,
      cancelUrl: `${SITE_URL}/garage/${vehicle.id}`,
    });
    await service.from("decal_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (!session.url) return { ok: false, error: "Couldn't start checkout. Try again." };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("Decal checkout failed:", err);
    await service.from("decal_orders").update({ status: "canceled" }).eq("id", order.id);
    return { ok: false, error: "Couldn't start checkout. Try again." };
  }
}
