// Server-only: reads the fonts and artwork from disk and renders with
// next/og. Never import this from a client component.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { LAYOUT_BELOW_PHOTO, LAYOUT_WIDTH } from "@/lib/posters/products";
import type { PosterData, PosterSubscores } from "@/lib/posters/snapshot";

const SUBSCORE_LABELS: [keyof PosterSubscores, string][] = [
  ["appearance", "Appearance"],
  ["performance", "Performance"],
  ["wheelsFitment", "Wheels/Fitment"],
  ["interior", "Interior"],
  ["modifications", "Modifications"],
];

const ASSETS = join(process.cwd(), "src", "features", "posters");
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 700; style: "normal" }[]> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(join(ASSETS, "fonts", "Geist-Regular.ttf")).then((data) => ({ name: "Geist", data, weight: 400 as const, style: "normal" as const })),
    readFile(join(ASSETS, "fonts", "Geist-Medium.ttf")).then((data) => ({ name: "Geist", data, weight: 500 as const, style: "normal" as const })),
    readFile(join(ASSETS, "fonts", "Geist-Bold.ttf")).then((data) => ({ name: "Geist", data, weight: 700 as const, style: "normal" as const })),
    readFile(join(ASSETS, "fonts", "GeistMono-Regular.ttf")).then((data) => ({ name: "Geist Mono", data, weight: 400 as const, style: "normal" as const })),
  ]);
  return fontsPromise;
}

async function asset(name: string, type: string): Promise<string> {
  const data = await readFile(join(ASSETS, "assets", name));
  return `data:${type};base64,${data.toString("base64")}`;
}

/** A subscore as the rating gave it: whole numbers stay whole, others
 * keep one decimal. */
function subscoreText(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function ratedOn(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/**
 * Renders the poster as a PNG. The layout is drawn on a grid 1800 units
 * wide and scales to any size, so the in-app preview and the print file
 * are the same picture. `photo` is a JPEG or PNG data URL, already
 * upright (see poster-photo.ts).
 */
export async function renderPoster(data: PosterData, photo: string, size: { width: number; height: number }): Promise<ArrayBuffer> {
  const [fonts, mark, wordmark, gem] = await Promise.all([
    loadFonts(),
    asset("s-mark.svg", "image/svg+xml"),
    asset("wordmark.svg", "image/svg+xml"),
    asset(`gem-${data.tier}.png`, "image/png"),
  ]);

  const u = size.width / LAYOUT_WIDTH;
  const H = size.height / u;
  const px = (n: number) => n * u;
  const ink = "#08080a";
  const tierColor = RANK_TEXT_COLORS[data.tier];
  const photoHeight = H - LAYOUT_BELOW_PHOTO;
  const date = ratedOn(data.ratedAt);
  const owner = data.nickname ? `“${data.nickname}”  ·  @${data.username}` : `@${data.username}`;

  const element = (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: ink, fontFamily: "Geist", color: "#fff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the image renderer only draws plain <img> */}
      <img
        src={photo}
        alt=""
        width={size.width}
        height={Math.round(px(photoHeight))}
        style={{ position: "absolute", top: 0, left: 0, width: size.width, height: px(photoHeight), objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size.width,
          height: px(360),
          display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(8,8,10,0.55), rgba(8,8,10,0))",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: px(photoHeight - 900),
          width: size.width,
          height: px(900),
          display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(8,8,10,0) 0%, rgba(8,8,10,0.45) 30%, rgba(8,8,10,0.85) 62%, rgba(8,8,10,1) 92%)",
        }}
      />

      <div style={{ position: "absolute", top: px(96), left: px(110), right: px(110), display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mark} alt="" width={Math.round(px(82))} height={Math.round(px(50))} style={{ width: px(82), height: px(50) }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={wordmark} alt="" width={Math.round(px(358))} height={Math.round(px(36))} style={{ width: px(358), height: px(36), marginLeft: px(30) }} />
        </div>
        <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: px(26), letterSpacing: px(7.3), color: "rgba(255,255,255,0.75)" }}>
          BUILD CERTIFICATE
        </div>
      </div>

      {/* Anchored to the bottom, so a rating without category scores
          (from before they existed) closes up instead of leaving a gap. */}
      <div style={{ position: "absolute", left: px(110), right: px(110), bottom: px(311), display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gem} alt="" width={Math.round(px(300))} height={Math.round(px(300))} style={{ width: px(300), height: px(300) }} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: px(56) }}>
            <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: px(34), letterSpacing: px(10.9), color: tierColor }}>
              {`${RANK_LABELS[data.tier].toUpperCase()} RANK`}
            </div>
            <div style={{ display: "flex", fontSize: px(290), fontWeight: 700, letterSpacing: px(-13), lineHeight: 0.86, marginTop: px(18) }}>
              {formatScore(data.score)}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: px(70), fontSize: px(64), fontWeight: 700, letterSpacing: px(-0.6) }}>
          {data.carName.toUpperCase()}
        </div>
        <div style={{ display: "flex", marginTop: px(14), fontSize: px(34), color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{owner}</div>

        {data.subscores && (
          <div style={{ display: "flex", marginTop: px(64) }}>
            {SUBSCORE_LABELS.map(([key, label], i) => {
              const v = data.subscores![key];
              return (
                <div key={key} style={{ display: "flex", flexDirection: "column", flex: 1, marginLeft: i === 0 ? 0 : px(34) }}>
                  <div style={{ display: "flex", fontFamily: "Geist Mono", fontSize: px(20), letterSpacing: px(3.2), color: "rgba(255,255,255,0.55)" }}>
                    {label.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", marginTop: px(10), fontSize: px(64), fontWeight: 700, letterSpacing: px(-1.3) }}>{subscoreText(v)}</div>
                  <div style={{ display: "flex", marginTop: px(14), height: px(5), borderRadius: px(3), background: "rgba(255,255,255,0.12)" }}>
                    <div style={{ display: "flex", width: `${Math.max(0, Math.min(100, v))}%`, height: "100%", borderRadius: px(3), background: tierColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: px(110),
          right: px(110),
          bottom: px(96),
          display: "flex",
          justifyContent: "space-between",
          paddingTop: px(34),
          borderTop: `${px(2)}px solid rgba(255,255,255,0.12)`,
          fontFamily: "Geist Mono",
          fontSize: px(24),
          letterSpacing: px(4.8),
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <div style={{ display: "flex" }}>{date ? `RATED BY SORZA · ${date.toUpperCase()}` : "RATED BY SORZA"}</div>
        <div style={{ display: "flex" }}>SORZA.NET</div>
      </div>
    </div>
  );

  return new ImageResponse(element, { width: size.width, height: size.height, fonts }).arrayBuffer();
}
