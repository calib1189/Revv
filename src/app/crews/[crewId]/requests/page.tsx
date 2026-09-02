import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import { getCrewMemberRole, listPendingJoinRequests } from "@/lib/db/crew-members";
import { getProfilesByIds } from "@/lib/db/profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { JoinRequestsList, type PendingRequestItem } from "@/features/crews/join-requests-list";
import { BackIcon } from "@/components/ui/icons";

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
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <Link
        href={`/crews/${crewId}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <BackIcon className="h-4 w-4" />
        {crew.name}
      </Link>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Join requests</h1>
      <JoinRequestsList crewId={crewId} requests={requests} />
    </div>
  );
}
