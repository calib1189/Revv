import type { Vehicle } from "@/lib/db/vehicles";

export interface VehicleComparison {
  sameMakeModel: boolean;
  differences: string[];
}

/** Plain field comparison — no invented compatibility judgment, just
 * what actually differs between the two vehicle records. */
export function compareVehicles(
  source: Vehicle,
  target: Vehicle,
): VehicleComparison {
  const differences: string[] = [];

  if (source.make !== target.make || source.model !== target.model) {
    differences.push(
      `Different vehicle: ${source.year ?? ""} ${source.make ?? ""} ${source.model ?? ""} vs ${target.year ?? ""} ${target.make ?? ""} ${target.model ?? ""}`.trim(),
    );
  }
  if (source.drivetrain && target.drivetrain && source.drivetrain !== target.drivetrain) {
    differences.push(
      `Drivetrain differs: ${source.drivetrain} vs ${target.drivetrain}`,
    );
  }

  return {
    sameMakeModel: source.make === target.make && source.model === target.model,
    differences,
  };
}
