import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { NewCrewClient } from "@/features/crews/new-crew-client";

export default async function NewCrewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/crews/new");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Create a crew</h1>
      <NewCrewClient />
    </div>
  );
}
