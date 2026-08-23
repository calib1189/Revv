import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { NewVehicleClient } from "@/features/garage/new-vehicle-client";

export default async function NewVehiclePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage/new");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">
        Add a vehicle
      </h1>
      <NewVehicleClient />
    </div>
  );
}
