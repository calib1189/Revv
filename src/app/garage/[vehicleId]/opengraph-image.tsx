import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getProfileByUserId } from "@/lib/db/profiles";

export const alt = "REVV vehicle build";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId);
  const owner = vehicle
    ? await getProfileByUserId(supabase, vehicle.owner_id)
    : null;

  const title = vehicle
    ? vehicle.nickname || `${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim()
    : "REVV";
  const subtitle = [vehicle?.year, vehicle?.make, vehicle?.model]
    .filter(Boolean)
    .join(" ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0b",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", color: "#f4f4f5", fontSize: 32, fontWeight: 600 }}>
          REVV
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {subtitle && (
            <div style={{ display: "flex", color: "#a1a1aa", fontSize: 32, marginBottom: 12 }}>
              {subtitle}
            </div>
          )}
          <div
            style={{
              display: "flex",
              color: "#f4f4f5",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {owner && (
            <div style={{ display: "flex", color: "#ff4433", fontSize: 28, marginTop: 20 }}>
              @{owner.username}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
