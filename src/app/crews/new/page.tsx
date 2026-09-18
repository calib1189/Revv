import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { NewCrewClient } from "@/features/crews/new-crew-client";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export default async function NewCrewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/crews/new");

  return (
    <PageShell>
      <PageHeader
        title="New Crew"
        back={{ href: "/crews", label: "Crews" }}
        description="Start a crew around your car, your area, or your scene."
      />
      <NewCrewClient />
    </PageShell>
  );
}
