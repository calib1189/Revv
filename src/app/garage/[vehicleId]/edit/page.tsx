import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { VehicleForm } from "@/features/garage/vehicle-form";
import { updateVehicleAction } from "@/features/garage/actions";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/garage/${vehicleId}/edit`);

  const supabase = await createClient();
  const vehicle = await getVehicleById(supabase, vehicleId);
  if (!vehicle) notFound();
  if (vehicle.owner_id !== user.id) redirect(`/garage/${vehicleId}`);

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">Edit Vehicle</h1>
      <VehicleForm
        action={updateVehicleAction.bind(null, vehicleId)}
        vehicle={vehicle}
        submitLabel="Save changes"
      />
    </div>
  );
}
