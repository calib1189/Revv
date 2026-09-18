import { GroupedList, GroupedRow, SectionTitle } from "@/components/ui/grouped-list";
import type { Vehicle } from "@/lib/db/vehicles";

/** The car's spec sheet as a grouped list — label left, value right,
 * the way Settings › About reads out a device. Only rows the owner has
 * actually filled in are shown. */
export function VehicleSpecs({ vehicle }: { vehicle: Vehicle }) {
  const specs: { label: string; value: string | number | null }[] = [
    { label: "Year", value: vehicle.year },
    { label: "Make", value: vehicle.make },
    { label: "Model", value: vehicle.model },
    { label: "Trim", value: vehicle.trim },
    { label: "Engine", value: vehicle.engine },
    { label: "Drivetrain", value: vehicle.drivetrain },
    { label: "Color", value: vehicle.color },
    {
      label: "Mileage",
      value: vehicle.mileage != null ? `${vehicle.mileage.toLocaleString()} mi` : null,
    },
  ].filter((spec) => spec.value);

  if (specs.length === 0) return null;

  return (
    <section>
      <SectionTitle>Specs</SectionTitle>
      <GroupedList>
        {specs.map((spec) => (
          <GroupedRow key={spec.label} label={spec.label} value={spec.value} />
        ))}
      </GroupedList>
    </section>
  );
}
