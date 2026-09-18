import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { NewVehicleClient } from "@/features/garage/new-vehicle-client";

export default async function NewVehiclePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/garage/new");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <h1 className="mb-6 text-[2.125rem] font-bold leading-tight tracking-[-0.03em]">New Vehicle</h1>
      <NewVehicleClient />
    </div>
  );
}
