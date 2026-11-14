"use server";

import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getActiveBuild } from "@/lib/db/builds";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { createPosterCheckoutSession } from "@/lib/billing/stripe";
import { buildPosterOffer, posterCarName } from "@/lib/posters/offer";
import { photoPrintsSharp, posterProductById, postersEnabled } from "@/lib/posters/products";
import { posterSnapshotJson, posterSubscores, type PosterSnapshot } from "@/lib/posters/snapshot";
import { SITE_URL } from "@/lib/site-url";

type Result = { ok: true; url: string } | { ok: false; error: string };

/** Starts a build-poster order for the owner's car: everything printed
 * on it is checked and snapshotted here (never trusted from the page),
 * then Stripe's checkout collects payment and the shipping address. */
export async function startPosterOrderAction(vehicleId: string, productId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Log in to order a poster." };
  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id).catch(() => null);
  if (!postersEnabled(profile?.is_admin ?? false)) return { ok: false, error: "Posters aren't available yet." };
  const product = posterProductById(productId);
  if (!product) return { ok: false, error: "Pick a poster size." };

  const vehicle = await getVehicleById(supabase, vehicleId).catch(() => null);
  if (!vehicle) return { ok: false, error: "That car wasn't found." };
  const [build, hero] = await Promise.all([
    getActiveBuild(supabase, vehicle.id).catch(() => null),
    vehicle.hero_media_id ? getMediaById(supabase, vehicle.hero_media_id).catch(() => null) : Promise.resolve(null),
  ]);
  const offer = buildPosterOffer({
    vehicle,
    build,
    hero,
    viewerId: user.id,
    photoUrl: hero ? publicMediaUrl(supabase, hero.storage_path) : null,
  });
  if (!offer || !build || !hero || !profile) return { ok: false, error: "Posters are for approved, rated cars with a cover photo, ordered by their owner." };
  if (!photoPrintsSharp(hero, product)) return { ok: false, error: "Your cover photo is too small to print sharp at this size." };

  const snapshot: PosterSnapshot = {
    carName: posterCarName(vehicle),
    nickname: vehicle.nickname,
    username: profile.username,
    score: offer.score,
    tier: offer.tier,
    subscores: posterSubscores(build.ai_rating_subscores),
    ratedAt: build.ai_rating_rated_at,
    photoPath: hero.storage_path,
  };

  const service = createServiceRoleClient();
  const { data: order, error } = await service
    .from("poster_orders")
    .insert({
      user_id: user.id,
      vehicle_id: vehicle.id,
      product: product.id,
      snapshot: posterSnapshotJson(snapshot),
      amount_cents: product.priceCents,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("Poster order not created:", error);
    return { ok: false, error: "Couldn't start your order. Try again." };
  }

  try {
    const session = await createPosterCheckoutSession({
      orderId: order.id,
      name: `SORZA build poster: ${snapshot.carName}`,
      description: `${product.label}. Free US shipping.`,
      priceCents: product.priceCents,
      customerEmail: user.email ?? null,
      successUrl: `${SITE_URL}/garage/${vehicle.id}?poster=ordered`,
      cancelUrl: `${SITE_URL}/garage/${vehicle.id}`,
    });
    await service.from("poster_orders").update({ stripe_session_id: session.id }).eq("id", order.id);
    if (!session.url) return { ok: false, error: "Couldn't start checkout. Try again." };
    return { ok: true, url: session.url };
  } catch (err) {
    console.error("Poster checkout failed:", err);
    await service.from("poster_orders").update({ status: "canceled" }).eq("id", order.id);
    return { ok: false, error: "Couldn't start checkout. Try again." };
  }
}
