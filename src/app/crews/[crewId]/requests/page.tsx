import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getCrewById } from "@/lib/db/crews";
import { getCrewMemberRole, listPendingJoinRequests } from "@/lib/db/crew-members";
import { getProfilesByIds } from "@/lib/db/profiles";
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

  const requests: PendingRequestItem[] = pending.map((member) => ({
    member,
    username: profileById.get(member.user_id)?.username ?? "unknown",
    avatarUrl: null,
  }));

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Join requests — {crew.name}</h1>
      <JoinRequestsList crewId={crewId} requests={requests} />
    </div>
  );
}
