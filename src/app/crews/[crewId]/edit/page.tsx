import { notFound, redirect } from "next/navigation";
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
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Edit crew</h1>

      <div className="mb-8 flex flex-wrap gap-3">
        <CrewLogoUploader crewId={crew.id} userId={user.id} hasLogo={Boolean(crew.logo_media_id)} />
        <CrewBannerUploader crewId={crew.id} userId={user.id} hasBanner={Boolean(crew.banner_media_id)} />
      </div>

      <CrewForm action={updateCrewAction.bind(null, crewId)} crew={crew} submitLabel="Save changes" />
    </div>
  );
}
