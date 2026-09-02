import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { NewCrewClient } from "@/features/crews/new-crew-client";
import { BackIcon } from "@/components/ui/icons";

export default async function NewCrewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/crews/new");

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link href="/crews" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <BackIcon className="h-4 w-4" />
        Crews
      </Link>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Create a crew</h1>
      <NewCrewClient />
    </div>
  );
}
