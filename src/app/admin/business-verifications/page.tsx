import { createClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/lib/db/profiles";
import { listPendingBusinessVerifications, listBusinessProfilesByOwner } from "@/lib/db/business-profiles";
import { getMediaByIds, publicMediaUrl } from "@/lib/db/media";
import {
  BusinessVerificationRow,
  type BusinessVerificationRowData,
} from "@/features/admin/business-verification-row";

export default async function AdminBusinessVerificationsPage() {
  const supabase = await createClient();
  const profiles = await listPendingBusinessVerifications(supabase);
  const owners = await Promise.all(
    profiles.map((p) => getProfileByUserId(supabase, p.owner_id)),
  );
  const ownerById = new Map(owners.filter(Boolean).map((p) => [p!.id, p!]));

  const uniqueOwnerIds = [...new Set(profiles.map((p) => p.owner_id))];
  const historyByOwnerId = new Map(
    await Promise.all(
      uniqueOwnerIds.map(async (id) => {
        const past = await listBusinessProfilesByOwner(supabase, id);
        return [
          id,
          {
            total: past.length,
            rejected: past.filter((p) => p.verification_status === "rejected").length,
          },
        ] as const;
      }),
    ),
  );

  const mediaIds = profiles
    .map((p) => p.verification_media_id)
    .filter((id): id is string => Boolean(id));
  const media = await getMediaByIds(supabase, mediaIds);
  const photoUrlByMediaId = new Map(
    media.map((m) => [m.id, publicMediaUrl(supabase, m.storage_path)]),
  );

  const rows: BusinessVerificationRowData[] = profiles.map((profile) => {
    const owner = ownerById.get(profile.owner_id);
    const history = historyByOwnerId.get(profile.owner_id);
    return {
      businessProfileId: profile.id,
      placeName: profile.place_name,
      placeAddress: profile.place_address,
      submittedAt: profile.created_at,
      ownerUsername: owner?.username ?? "unknown",
      ownerMemberSince: owner?.created_at ?? null,
      priorClaimCount: (history?.total ?? 1) - 1,
      priorRejectedCount: history?.rejected ?? 0,
      proofPhotoUrl: profile.verification_media_id
        ? (photoUrlByMediaId.get(profile.verification_media_id) ?? null)
        : null,
    };
  });

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Business verifications</h1>
      <p className="mb-6 text-sm text-muted">
        A business license, a utility bill, or a storefront photo with the owner&apos;s username
        clearly visible — approve only if it plausibly ties this person to this business.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No pending verifications.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {rows.map((row) => (
            <BusinessVerificationRow key={row.businessProfileId} data={row} />
          ))}
        </ul>
      )}
    </div>
  );
}
