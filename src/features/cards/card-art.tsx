// Server-only: renders with next/og from the poster's fonts and artwork.
// Never import this from a client component.
import { ImageResponse } from "next/og";
import { RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import type { PosterData, PosterSubscores } from "@/lib/posters/snapshot";
import { asset, loadFonts } from "@/features/posters/poster-art";

/** A trading card's shape: 2.5 x 3.5 in. */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1512;

const STATS: [keyof PosterSubscores, string][] = [
  ["appearance", "APPEARANCE"],
  ["performance", "PERFORMANCE"],
  ["wheelsFitment", "WHEELS/FITMENT"],
  ["interior", "INTERIOR"],
  ["modifications", "MODS"],
];

/** Mixes a #rrggbb colour toward another by `t` (0..1). */
function mix(hex: string, other: string, t: number): string {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(other.slice(1), 16);
  const ch = (shift: number) => Math.round(((a >> shift) & 255) * (1 - t) + ((b >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

function ratedOn(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).toUpperCase();
}

/**
 * A build as a SORZA trading card: the cover photo inside a foil frame in
 * its rank's colours, with the real score, rank and five category scores.
 * `photo` is an upright JPEG/PNG data URL (features/posters/poster-photo.ts).
 */
export async function renderTradingCard(data: PosterData, photo: string): Promise<ArrayBuffer> {
  const [fonts, mark, wordmark, gem] = await Promise.all([
    loadFonts(),
    asset("s-mark.svg", "image/svg+xml"),
    asset("wordmark.svg", "image/svg+xml"),
    asset(`gem-${data.tier}.png`, "image/png"),
  ]);
  const tier = RANK_TEXT_COLORS[data.tier];
  const foil = `linear-gradient(135deg, ${tier} 0%, ${mix(tier, "#000000", 0.55)} 28%, ${mix(tier, "#ffffff", 0.7)} 50%, ${mix(tier, "#000000", 0.45)} 72%, ${tier} 100%)`;
  const title = data.nickname || data.carName;
  const date = ratedOn(data.ratedAt);
  const mono = { fontFamily: "Geist Mono" } as const;

  const element = (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#08080a", fontFamily: "Geist", color: "#fff" }}>
      {/* the foil frame */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", borderRadius: 64, backgroundImage: foil }} />
      <div style={{ position: "absolute", top: 26, left: 26, right: 26, bottom: 26, display: "flex", flexDirection: "column", borderRadius: 44, background: "#111014", padding: "50px 54px 44px" }}>
        {/* name and score */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <div style={{ display: "flex", fontSize: 58, fontWeight: 700, letterSpacing: -1, lineHeight: 1.05 }}>{title.toUpperCase()}</div>
            <div style={{ display: "flex", marginTop: 12, fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>
              {data.nickname ? `${data.carName}  ·  @${data.username}` : `@${data.username}`}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: -3, lineHeight: 1, color: tier }}>{formatScore(data.score)}</div>
        </div>

        {/* the photo, with the rank emblem on its corner */}
        <div style={{ display: "flex", position: "relative", marginTop: 34, height: 640 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the image renderer only draws plain <img> */}
          <img src={photo} alt="" width={920} height={640} style={{ width: 920, height: 640, objectFit: "cover", borderRadius: 28 }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gem} alt="" width={210} height={210} style={{ position: "absolute", right: -18, bottom: -64, width: 210, height: 210 }} />
        </div>

        {/* rank line */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 34, ...mono, fontSize: 30, letterSpacing: 8, color: tier }}>
          {`${RANK_LABELS[data.tier].toUpperCase()} RANK`}
        </div>

        {/* the five stats */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
          {data.subscores ? (
            STATS.map(([key, label]) => {
              const v = Math.max(0, Math.min(100, data.subscores![key]));
              return (
                <div key={key} style={{ display: "flex", alignItems: "center", height: 66 }}>
                  <div style={{ display: "flex", width: 300, ...mono, fontSize: 24, letterSpacing: 3, color: "rgba(255,255,255,0.7)" }}>{label}</div>
                  <div style={{ display: "flex", flex: 1, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.12)" }}>
                    <div style={{ display: "flex", width: `${v}%`, height: "100%", borderRadius: 6, background: tier }} />
                  </div>
                  <div style={{ display: "flex", width: 100, justifyContent: "flex-end", fontSize: 44, fontWeight: 700 }}>{v.toFixed(0)}</div>
                </div>
              );
            })
          ) : (
            <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.55)", height: 330, alignItems: "center" }}>
              Re-rate to add the five category scores.
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: 26, borderTop: "2px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} alt="" width={62} height={38} style={{ width: 62, height: 38 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wordmark} alt="" width={240} height={24} style={{ width: 240, height: 24, marginLeft: 20 }} />
          </div>
          <div style={{ display: "flex", ...mono, fontSize: 22, letterSpacing: 4, color: "rgba(255,255,255,0.5)" }}>
            {date ? `RATED ${date}` : "RATED BY SORZA"}
          </div>
        </div>
      </div>
      {/* a faint sheen across the whole card */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          borderRadius: 64,
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.09) 47%, rgba(255,255,255,0) 56%)",
        }}
      />
    </div>
  );

  return new ImageResponse(element, { width: CARD_WIDTH, height: CARD_HEIGHT, fonts }).arrayBuffer();
}
