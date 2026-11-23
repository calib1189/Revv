import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getActiveBuild } from "@/lib/db/builds";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { posterCarName } from "@/lib/posters/offer";
import { posterSubscores } from "@/lib/posters/snapshot";
import { rankForScore } from "@/lib/rating/rank";
import { fetchPosterPhoto } from "@/features/posters/poster-photo";
import { renderTradingCard } from "@/features/cards/card-art";
import { vehicleKind } from "@/lib/vehicles/category";

export const runtime = "nodejs";

/**
 * A rated build as a SORZA trading card (PNG). Public, like the build page
 * it comes from: the score, rank and categories are already shown there.
 * The link carries `?v=` (the rating's time and the cover photo), so a
 * re-rate or a new cover is a new URL and the long cache never goes stale.
 */
export async function GET(request: Request, { params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId).catch(() => null);
  if (!vehicle) return new Response("Not found", { status: 404 });

  const [build, hero, owner] = await Promise.all([
    getActiveBuild(supabase, vehicle.id).catch(() => null),
    vehicle.hero_media_id ? getMediaById(supabase, vehicle.hero_media_id).catch(() => null) : Promise.resolve(null),
    getProfileByUserId(supabase, vehicle.owner_id).catch(() => null),
  ]);
  const score = build?.ai_rating_score ?? null;
  if (score == null || !hero || hero.kind !== "image" || !owner) return new Response("Not found", { status: 404 });

  try {
    const photo = await fetchPosterPhoto(publicMediaUrl(supabase, hero.storage_path), new URL(request.url).origin, 1080);
    const png = await renderTradingCard(
      {
        carName: posterCarName(vehicle),
        nickname: vehicle.nickname,
        username: owner.username,
        score,
        tier: rankForScore(score),
        subscores: posterSubscores(build?.ai_rating_subscores),
        ratedAt: build?.ai_rating_rated_at ?? null,
        isBike: vehicleKind(vehicle.category) === "bike",
      },
      photo,
    );
    return new Response(png, {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" },
    });
  } catch (err) {
    console.error("Trading card render failed:", err);
    return new Response("Couldn't draw the card.", { status: 500 });
  }
}
