import { notFound, redirect } from "next/navigation";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import { getCrewMemberRole, listPendingJoinRequests } from "@/lib/db/crew-members";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { JoinRequestsList, type PendingRequestItem } from "@/features/crews/join-requests-list";

export default async function CrewRequestsPage({ params }: { params: Promise<{ crewId: string }> }) {
  const { crewId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/crews/${crewId}/requests`);

  const supabase = await createClient();
  const crew = await getCrewById(supabase, crewId);
  if (!crew) notFound();

  const role = await getCrewMemberRole(supabase, crewId, user.id);
  if (role !== "leader" && role !== "admin") redirect(`/crews/${crewId}`);

  const pending = await listPendingJoinRequests(supabase, crewId);
  const profiles = await getProfilesByIds(supabase, pending.map((m) => m.user_id));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const avatarIds = profiles.map((p) => p.avatar_media_id).filter((id): id is string => Boolean(id));
  const avatarMedia = await getMediaByIds(supabase, avatarIds);
  const avatarUrlById = new Map(avatarMedia.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]));

  const requests: PendingRequestItem[] = pending.map((member) => {
    const profile = profileById.get(member.user_id);
    return {
      member,
      username: profile?.username ?? "unknown",
      avatarUrl: profile?.avatar_media_id ? (avatarUrlById.get(profile.avatar_media_id) ?? null) : null,
    };
  });

  return (
    <PageShell>
      <PageHeader title="Requests" back={{ href: `/crews/${crewId}`, label: crew.name }} />
      <JoinRequestsList crewId={crewId} requests={requests} />
    </PageShell>
  );
}
