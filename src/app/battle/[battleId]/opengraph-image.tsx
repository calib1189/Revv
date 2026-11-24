import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { loadBattleViewById, type BattleCar } from "@/lib/battles/load";
import { coverPhoto } from "@/lib/og/cover-photo";

export const alt = "A SORZA Build Battle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Half({ car, photo, winner }: { car: BattleCar; photo: string | null; winner: boolean }) {
  return (
    <div style={{ width: 600, height: 630, display: "flex", position: "relative", background: "#111113" }}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- the OG renderer only draws plain <img>
        <img
          src={photo}
          alt=""
          width={600}
          height={630}
          style={{ position: "absolute", top: 0, left: 0, width: 600, height: 630, objectFit: "cover" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 600,
          height: 630,
          display: "flex",
          backgroundImage:
            "linear-gradient(180deg, rgba(10,10,11,0.6) 0%, rgba(10,10,11,0) 28%, rgba(10,10,11,0.15) 60%, rgba(10,10,11,0.92) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 40,
          right: 40,
          bottom: 44,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {winner && (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#ffffff",
              color: "#0a0a0b",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
              padding: "6px 14px",
              borderRadius: 999,
              marginBottom: 12,
            }}
          >
            WINNER
          </div>
        )}
        <div style={{ display: "flex", color: "#ffffff", fontSize: 52, fontWeight: 700, lineHeight: 1.05 }}>{car.title}</div>
        <div style={{ display: "flex", color: "#ff4433", fontSize: 26, marginTop: 10 }}>@{car.ownerUsername}</div>
      </div>
    </div>
  );
}

/** What a battle link shows when it's posted anywhere: both cars side
 * by side, so the preview itself asks "which one?". */
export default async function BattleOgImage({ params }: { params: Promise<{ battleId: string }> }) {
  const { battleId } = await params;
  const view = UUID.test(battleId) ? await loadBattleViewById(await createClient(), battleId, null) : null;

  const [photoA, photoB] = view
    ? await Promise.all([
        view.a.heroUrl ? coverPhoto(view.a.heroUrl) : Promise.resolve(null),
        view.b.heroUrl ? coverPhoto(view.b.heroUrl) : Promise.resolve(null),
      ])
    : [null, null];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a0a0b" }}>
        {view && <Half car={view.a} photo={photoA} winner={view.result?.winnerId === view.a.vehicleId} />}
        {view && <Half car={view.b} photo={photoB} winner={view.result?.winnerId === view.b.vehicleId} />}
        <div
          style={{
            position: "absolute",
            top: 44,
            left: 48,
            right: 48,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", color: "#f4f4f5", fontSize: 30, fontWeight: 700, letterSpacing: 6 }}>
            SORZA BUILD BATTLE
          </div>
          <div style={{ display: "flex", color: "rgba(244,244,245,0.85)", fontSize: 24 }}>
            {view?.ended ? "See who won" : "Which build wins?"}
          </div>
        </div>
        {view && (
          <div
            style={{
              position: "absolute",
              top: 265,
              left: 550,
              width: 100,
              height: 100,
              borderRadius: 999,
              background: "#0a0a0b",
              border: "3px solid rgba(255,255,255,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: 34,
              fontWeight: 800,
            }}
          >
            VS
          </div>
        )}
      </div>
    ),
    size,
  );
}
