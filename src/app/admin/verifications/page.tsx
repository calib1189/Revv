import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listPendingVerifications } from "@/lib/db/vehicles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { AdminNav } from "@/features/admin/admin-nav";
import { VerificationRow, type VerificationRowData } from "@/features/admin/verification-row";

export default async function AdminVerificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/verifications");

  const supabase = await createClient();
  const profile = await getProfileByUserId(supabase, user.id);
  if (!profile?.is_admin) redirect("/feed");

  const vehicles = await listPendingVerifications(supabase);
  const owners = await Promise.all(
    vehicles.map((v) => getProfileByUserId(supabase, v.owner_id)),
  );
  const usernameByOwnerId = new Map(
    owners.filter(Boolean).map((p) => [p!.id, p!.username]),
  );

  const mediaIds = vehicles
    .map((v) => v.ownership_verification_media_id)
    .filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, mediaIds);
  const photoUrlByMediaId = new Map(
    media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const rows: VerificationRowData[] = vehicles.map((vehicle) => ({
    vehicleId: vehicle.id,
    vehicleTitle: vehicle.nickname || `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim(),
    ownerUsername: usernameByOwnerId.get(vehicle.owner_id) ?? "unknown",
    photoUrl: vehicle.ownership_verification_media_id
      ? (photoUrlByMediaId.get(vehicle.ownership_verification_media_id) ?? null)
      : null,
  }));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Ownership verifications
        </h1>
        <AdminNav current="/admin/verifications" />
      </div>
      <p className="mb-6 text-sm text-muted">
        A full-car photo with the owner&apos;s username written on paper in
        frame — approve only if both are clearly visible and it&apos;s
        obviously the car in their garage, not a photo pulled from
        somewhere else.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No pending verifications.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <VerificationRow key={row.vehicleId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
