import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getActiveBuild } from "@/lib/db/builds";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { buildPosterOffer, posterCarName } from "@/lib/posters/offer";
import { posterProductById, postersEnabled, printPixels } from "@/lib/posters/products";
import { posterSubscores } from "@/lib/posters/snapshot";
import { renderPoster } from "@/features/posters/poster-art";
import { fetchPosterPhoto } from "@/features/posters/poster-photo";

export const runtime = "nodejs";

/** Preview width in pixels; the height follows the product's shape. */
const PREVIEW_WIDTH = 900;

/**
 * The owner's own build poster, drawn by the same code that renders the
 * print file, at phone size: what they see is what prints. Only for the
 * car's owner, and only for a car that can be ordered as a poster.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const product = posterProductById(url.searchParams.get("product") ?? "");
  const vehicleId = url.searchParams.get("vehicle") ?? "";
  if (!product || !vehicleId) return new Response("Not found", { status: 404 });

  const user = await getCurrentUser();
  if (!user) return new Response("Log in to see your poster.", { status: 401 });
  const supabase = await createClient();
  const [profile, vehicle] = await Promise.all([
    getProfileByUserId(supabase, user.id).catch(() => null),
    getVehicleById(supabase, vehicleId).catch(() => null),
  ]);
  if (!profile || !vehicle || !postersEnabled(profile.is_admin ?? false)) return new Response("Not found", { status: 404 });

  const [build, hero] = await Promise.all([
    getActiveBuild(supabase, vehicle.id).catch(() => null),
    vehicle.hero_media_id ? getMediaById(supabase, vehicle.hero_media_id).catch(() => null) : Promise.resolve(null),
  ]);
  const photoUrl = hero ? publicMediaUrl(supabase, hero.storage_path) : null;
  const offer = buildPosterOffer({ vehicle, build, hero, viewerId: user.id, photoUrl });
  if (!offer || !build || !photoUrl) return new Response("Not found", { status: 404 });

  try {
    const photo = await fetchPosterPhoto(photoUrl, url.origin, 1080);
    const print = printPixels(product);
    const png = await renderPoster(
      {
        carName: posterCarName(vehicle),
        nickname: vehicle.nickname,
        username: profile.username,
        score: offer.score,
        tier: offer.tier,
        subscores: posterSubscores(build.ai_rating_subscores),
        ratedAt: build.ai_rating_rated_at,
      },
      photo,
      { width: PREVIEW_WIDTH, height: Math.round((PREVIEW_WIDTH * print.height) / print.width) },
    );
    return new Response(png, {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=600" },
    });
  } catch (err) {
    console.error("Poster preview failed:", err);
    return new Response("Couldn't draw the poster.", { status: 500 });
  }
}
