import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listVehiclesAwaitingApproval, listVehiclesByOwner } from "@/lib/db/vehicles";
import { listActiveBuildScores } from "@/lib/db/builds";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import { VerificationRow, type VerificationRowData } from "@/features/admin/verification-row";

export default async function AdminVerificationsPage() {
  const supabase = await createClient();
  const vehicles = await listVehiclesAwaitingApproval(supabase);
  const scoreByVehicleId = await listActiveBuildScores(supabase, vehicles.map((v) => v.id));
  const owners = await Promise.all(
    vehicles.map((v) => getProfileByUserId(supabase, v.owner_id)),
  );
  const ownerById = new Map(owners.filter(Boolean).map((p) => [p!.id, p!]));

  // Prior vehicle/verification history per owner — same reasoning as the
  // ad review queue's prior-campaign history: a first-time submission and
  // someone with a string of rejected verifications shouldn't look
  // identical to a reviewer. Deduped in case one owner has more than one
  // vehicle pending at once.
  const uniqueOwnerIds = [...new Set(vehicles.map((v) => v.owner_id))];
  const historyByOwnerId = new Map(
    await Promise.all(
      uniqueOwnerIds.map(async (id) => {
        const past = await listVehiclesByOwner(supabase, id);
        return [
          id,
          {
            total: past.length,
            rejected: past.filter((v) => v.ownership_verification_status === "rejected").length,
          },
        ] as const;
      }),
    ),
  );

  // The car's own cover photo is what gets judged now. An older
  // username-on-paper submission is shown instead when there is one.
  const photoMediaId = (v: (typeof vehicles)[number]) => v.ownership_verification_media_id ?? v.hero_media_id;
  const mediaIds = vehicles.map(photoMediaId).filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, mediaIds);
  const photoUrlByMediaId = new Map(
    media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const rows: VerificationRowData[] = vehicles.map((vehicle) => {
    const owner = ownerById.get(vehicle.owner_id);
    const history = historyByOwnerId.get(vehicle.owner_id);
    return {
      vehicleId: vehicle.id,
      vehicleTitle:
        vehicle.nickname || `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim(),
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      engine: vehicle.engine,
      drivetrain: vehicle.drivetrain,
      color: vehicle.color,
      mileage: vehicle.mileage,
      description: vehicle.description,
      submittedAt: vehicle.created_at,
      ownerUsername: owner?.username ?? "unknown",
      ownerMemberSince: owner?.created_at ?? null,
      priorVehicleCount: (history?.total ?? 1) - 1,
      priorRejectedCount: history?.rejected ?? 0,
      photoUrl: photoMediaId(vehicle) ? (photoUrlByMediaId.get(photoMediaId(vehicle)!) ?? null) : null,
      score: scoreByVehicleId.get(vehicle.id) ?? null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        New cars
      </h1>
      <p className="mb-6 text-sm text-muted">
        Approve a car if it looks like a real car this person owns, not a
        photo pulled off the internet. Open the vehicle page to see all
        their photos. Approved cars go on the leaderboard as soon as they
        have a score.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No new cars to approve.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <VerificationRow key={row.vehicleId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
