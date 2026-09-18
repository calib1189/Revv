import { notFound, redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import { CrewForm } from "@/features/crews/crew-form";
import { CrewLogoUploader } from "@/features/crews/crew-logo-uploader";
import { CrewBannerUploader } from "@/features/crews/crew-banner-uploader";
import { updateCrewAction } from "@/features/crews/actions";

export default async function EditCrewPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/crews/${crewId}/edit`);

  const supabase = await createClient();
  const crew = await getCrewById(supabase, crewId);
  if (!crew) notFound();
  if (crew.owner_id !== user.id) redirect(`/crews/${crewId}`);

  return (
    <PageShell>
      <PageHeader title="Edit Crew" back={{ href: `/crews/${crewId}`, label: crew.name }} />

      <div className="mb-8 flex gap-2.5">
        <CrewLogoUploader crewId={crew.id} userId={user.id} hasLogo={Boolean(crew.logo_media_id)} />
        <CrewBannerUploader crewId={crew.id} userId={user.id} hasBanner={Boolean(crew.banner_media_id)} />
      </div>

      <CrewForm action={updateCrewAction.bind(null, crewId)} crew={crew} submitLabel="Save Changes" />
    </PageShell>
  );
}
