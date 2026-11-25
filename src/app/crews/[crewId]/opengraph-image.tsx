import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import { getCrewStats } from "@/lib/db/crew-stats";
import { coverPhoto } from "@/lib/og/cover-photo";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { CREW_SCORE_SLOTS } from "@/lib/crews/crew-score";

export const alt = "A crew on SORZA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card a crew link shows when it's posted anywhere (a crew invite is
 * a link): the crew's banner with its logo, name, size and crew score, so
 * the invite reads as a crew worth joining rather than a bare URL.
 */
export default async function OgImage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const supabase = await createClient();
  const crew = await getCrewById(supabase, crewId).catch(() => null);
  const stats = crew ? (await getCrewStats(supabase, [crew]).catch(() => []))[0] : undefined;

  const [banner, logo] = await Promise.all([
    stats?.bannerUrl ? coverPhoto(stats.bannerUrl) : Promise.resolve(null),
    stats?.logoUrl ? coverPhoto(stats.logoUrl) : Promise.resolve(null),
  ]);

  const name = crew?.name ?? "SORZA crews";
  const score = stats?.score.score ?? null;
  const tier = stats?.score.tierScore != null ? rankForScore(stats.score.tierScore) : null;
  const members = stats?.memberCount ?? 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a0a0b" }}>
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element -- the OG renderer only draws plain <img>
          <img
            src={banner}
            alt=""
            width={1200}
            height={630}
            style={{ position: "absolute", top: 0, left: 0, width: 1200, height: 630, objectFit: "cover" }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            backgroundImage:
              "linear-gradient(180deg, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.15) 35%, rgba(10,10,11,0.55) 60%, rgba(10,10,11,0.95) 100%)",
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
            <div style={{ display: "flex", color: "#f4f4f5", fontSize: 34, fontWeight: 700, letterSpacing: 6 }}>SORZA</div>
            <div style={{ display: "flex", color: "rgba(244,244,245,0.85)", fontSize: 26 }}>Join the crew</div>
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 28, maxWidth: 760 }}>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element -- the OG renderer only draws plain <img>
                <img
                  src={logo}
                  alt=""
                  width={148}
                  height={148}
                  style={{ width: 148, height: 148, borderRadius: 36, objectFit: "cover", border: "4px solid rgba(255,255,255,0.2)" }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", maxWidth: score != null ? 520 : 820 }}>
                <div style={{ display: "flex", color: "#ffffff", fontSize: name.length > 18 ? 56 : 68, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
                <div style={{ display: "flex", color: "rgba(244,244,245,0.75)", fontSize: 30, marginTop: 10 }}>
                  {members} {members === 1 ? "member" : "members"}
                  {crew?.location_text ? ` · ${crew.location_text}` : ""}
                </div>
              </div>
            </div>

            {score != null && tier && (
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
                <div style={{ display: "flex", color: "rgba(244,244,245,0.7)", fontSize: 20, letterSpacing: 4 }}>CREW SCORE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ display: "flex", color: "#ffffff", fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{Math.round(score)}</div>
                  <div style={{ display: "flex", color: "rgba(244,244,245,0.6)", fontSize: 30 }}>/ {CREW_SCORE_SLOTS * 100}</div>
                </div>
                <div style={{ display: "flex", color: RANK_TEXT_COLORS[tier], fontSize: 28, fontWeight: 700, marginTop: 6 }}>
                  {RANK_LABELS[tier]}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
