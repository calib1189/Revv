import type { Vehicle } from "@/lib/db/vehicles";

export function VehicleSpecs({ vehicle }: { vehicle: Vehicle }) {
  const specs: { label: string; value: string | number | null }[] = [
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
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-y border-border py-6 sm:grid-cols-4">
      {specs.map((spec) => (
        <div key={spec.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            {spec.label}
          </dt>
          <dd className="mt-1 text-sm font-medium text-foreground">
            {spec.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
