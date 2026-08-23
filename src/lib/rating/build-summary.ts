import { formatCents } from "@/lib/format/money";
import type { Vehicle } from "@/lib/db/vehicles";
import type { BuildPart } from "@/lib/db/build-parts";

/** Plain-text description of a vehicle and its modifications, for the
 * rating provider to judge — real data only, nothing invented. */
export function buildRatingSummary(vehicle: Vehicle, buildParts: BuildPart[]): string {
  const specLine = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
  const lines = [specLine || "Unknown vehicle"];

  if (vehicle.engine) lines.push(`Engine: ${vehicle.engine}`);
  if (vehicle.drivetrain) lines.push(`Drivetrain: ${vehicle.drivetrain}`);

  if (buildParts.length === 0) {
    lines.push("No modifications listed — this is a stock or unmodified build.");
  } else {
    lines.push(`${buildParts.length} modification(s):`);
    for (const part of buildParts) {
      const price = part.price_cents != null ? ` (${formatCents(part.price_cents)})` : "";
      lines.push(`- ${part.raw_name}${part.category ? ` [${part.category}]` : ""}${price} — ${part.status}`);
    }
  }

  return lines.join("\n");
}
