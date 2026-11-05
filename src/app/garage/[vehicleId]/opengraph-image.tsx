import { ImageResponse } from "next/og";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";
import { getMediaById, publicMediaUrl } from "@/lib/db/media";
import { getActiveBuild, listAllRatingScores } from "@/lib/db/builds";
import { computeTopPercent } from "@/lib/rating/percentile";
import { formatScore } from "@/lib/rating/share-text";

export const alt = "A car build on SORZA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The image renderer reads JPEG and PNG; anything else falls back to
// the plain card rather than failing the whole preview.
const DRAWABLE = new Set(["image/jpeg", "image/jpg", "image/png"]);

/** The cover photo as a data URL, or null when there isn't one the
 * renderer can draw. Never throws: a missing photo only costs the
 * preview its background.
 *
 * Goes through the app's own image optimizer rather than straight to
 * storage: the OG renderer ignores a phone photo's EXIF rotation, which
 * the optimizer bakes in, and it shrinks the photo to card size. Asking
 * for JPEG/PNG only keeps it from answering in WebP or AVIF. */
async function coverPhoto(storageUrl: string): Promise<string | null> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (!host) return null;
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const url = `${proto}://${host}/_next/image?url=${encodeURIComponent(storageUrl)}&w=1200&q=75`;
    const res = await fetch(url, {
      headers: { Accept: "image/jpeg,image/png" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!DRAWABLE.has(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * The card a build link shows when it's posted anywhere: the car's own
 * photo with its SORZA score on it, so every share works as an invite.
 */
export default async function OgImage({ params }: { params: Promise<{ vehicleId: string }> }) {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId);

  const [owner, hero, build] = vehicle
    ? await Promise.all([
        getProfileByUserId(supabase, vehicle.owner_id),
        vehicle.hero_media_id ? getMediaById(supabase, vehicle.hero_media_id) : Promise.resolve(null),
        getActiveBuild(supabase, vehicleId),
      ])
    : [null, null, null];

  const score = build?.ai_rating_score ?? null;
  const [photo, topPercent] = await Promise.all([
    hero?.kind === "image" ? coverPhoto(publicMediaUrl(supabase, hero.storage_path)) : Promise.resolve(null),
    score != null
      ? listAllRatingScores(supabase)
          .then((all) => computeTopPercent(score, all))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const title = vehicle ? vehicle.nickname || `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() : "SORZA";
  const subtitle = vehicle?.nickname
    ? [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ")
    : [vehicle?.year, vehicle?.trim].filter(Boolean).join(" ");

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a0a0b" }}>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- the OG renderer only draws plain <img>
          <img
            src={photo}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        {/* Scrims: the name reads off the bottom-left, the score off the right. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            backgroundImage: photo
              ? "linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0) 30%, rgba(10,10,11,0.2) 55%, rgba(10,10,11,0.92) 100%)"
              : "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", color: "#f4f4f5", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>
              SORZA
            </div>
            <div style={{ display: "flex", color: "rgba(244,244,245,0.8)", fontSize: 24 }}>
              {score != null ? "What would your car score?" : "Rate your build"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", maxWidth: 700 }}>
              {subtitle && (
                <div style={{ display: "flex", color: "rgba(244,244,245,0.75)", fontSize: 30, marginBottom: 8 }}>
                  {subtitle}
                </div>
              )}
              <div style={{ display: "flex", color: "#ffffff", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
                {title}
              </div>
              {owner && (
                <div style={{ display: "flex", color: "#ff4433", fontSize: 30, marginTop: 14 }}>
                  @{owner.username}
                </div>
              )}
            </div>

            {score != null && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  padding: "22px 30px",
                  borderRadius: 28,
                  background: "rgba(10,10,11,0.72)",
                  border: "2px solid rgba(255,255,255,0.14)",
                }}
              >
                <div style={{ display: "flex", color: "rgba(244,244,245,0.7)", fontSize: 20, letterSpacing: 4 }}>
                  SORZA SCORE
                </div>
                <div style={{ display: "flex", color: "#ffffff", fontSize: 104, fontWeight: 700, lineHeight: 1 }}>
                  {formatScore(score)}
                </div>
                {topPercent != null && (
                  <div style={{ display: "flex", color: "#ff4433", fontSize: 26, marginTop: 6 }}>
                    Top {topPercent}% of builds
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
