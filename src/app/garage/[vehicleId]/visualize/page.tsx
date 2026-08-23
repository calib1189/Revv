import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { VisualizerForm } from "@/features/garage/visualizer-form";

export default async function VisualizeVehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/garage/${vehicleId}/visualize`);

  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle) notFound();
  if (vehicle.owner_id !== user.id) redirect(`/garage/${vehicleId}`);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Visualize a mod
      </h1>
      <p className="mb-8 text-sm text-muted">
        Upload a photo of{" "}
        {vehicle.nickname || `${vehicle.make} ${vehicle.model}`} and describe
        a modification to see a before/after.
      </p>
      <VisualizerForm userId={user.id} vehicleId={vehicleId} />
    </div>
  );
}
