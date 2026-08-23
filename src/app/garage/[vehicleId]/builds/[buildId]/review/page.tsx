import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createClient } from "@/lib/supabase/server";
import { getVehicleById } from "@/lib/db/vehicles";
import { getBuildById } from "@/lib/db/builds";
import { listBuildParts } from "@/lib/db/build-parts";
import { getPartsByIds } from "@/lib/db/parts";
import {
  acceptDraftBuildAction,
  discardDraftBuildAction,
  removeDraftBuildPartAction,
  getSourceVehicleForBuild,
} from "@/features/builds/copy-build-actions";
import { compareVehicles } from "@/lib/builds/compare-vehicles";
import { ProductCard } from "@/features/builds/product-card";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { formatCents } from "@/lib/format/money";

export default async function ReviewDraftBuildPage({
  params,
}: {
  params: Promise<{ vehicleId: string; buildId: string }>;
}) {
  const { vehicleId, buildId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/garage/${vehicleId}/builds/${buildId}/review`);

  const supabase = await createClient();
  const [vehicle, build] = await Promise.all([
    getVehicleById(supabase, vehicleId),
    getBuildById(supabase, buildId),
  ]);
  if (!vehicle || !build || build.vehicle_id !== vehicleId) notFound();
  if (vehicle.owner_id !== user.id) redirect(`/garage/${vehicleId}`);
  if (build.status !== "draft") redirect(`/garage/${vehicleId}`);

  const [buildParts, sourceVehicle] = await Promise.all([
    listBuildParts(supabase, build.id),
    getSourceVehicleForBuild(build.copied_from_build_id),
  ]);
  const linkedParts = await getPartsByIds(
    supabase,
    buildParts.map((p) => p.part_id).filter((id): id is string => Boolean(id)),
  );
  const partsById = new Map(linkedParts.map((p) => [p.id, p]));

  const comparison = sourceVehicle ? compareVehicles(sourceVehicle, vehicle) : null;
  const totalCents = buildParts.reduce(
    (sum, p) => sum + (p.price_cents ?? 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-lg flex-1 px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Review copied build
      </h1>
      {sourceVehicle && (
        <p className="mb-6 text-sm text-muted">
          Copied from{" "}
          {sourceVehicle.nickname || `${sourceVehicle.make} ${sourceVehicle.model}`}
          . Nothing is saved to your active build until you accept.
        </p>
      )}

      {comparison && comparison.differences.length > 0 && (
        <div className="mb-6">
          <Callout tone="danger">
            <p className="font-medium">Check compatibility before installing:</p>
            <ul className="mt-1 list-inside list-disc">
              {comparison.differences.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <Link href="/tools/fitment" className="mt-1 inline-block underline">
              Open the fitment calculator
            </Link>
          </Callout>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
        <span className="text-sm text-muted">Estimated total</span>
        <span className="text-sm font-medium">{formatCents(totalCents)}</span>
      </div>

      <ul className="mb-6">
        {buildParts.map((part) => {
          const linkedPart = part.part_id ? partsById.get(part.part_id) : null;
          return (
            <li
              key={part.id}
              className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{part.raw_name}</p>
                {part.category && (
                  <p className="text-xs text-muted">{part.category}</p>
                )}
                {linkedPart && (
                  <div className="mt-2 max-w-sm">
                    <ProductCard part={linkedPart} />
                  </div>
                )}
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {part.price_cents != null && (
                  <span className="text-sm font-medium">
                    {formatCents(part.price_cents)}
                  </span>
                )}
                <form
                  action={removeDraftBuildPartAction.bind(
                    null,
                    part.id,
                    vehicleId,
                    buildId,
                  )}
                >
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>

      {buildParts.length === 0 && (
        <p className="mb-6 text-sm text-muted">
          No modifications left in this draft — accepting will give you an
          empty active build.
        </p>
      )}

      <div className="flex gap-3">
        <form action={acceptDraftBuildAction.bind(null, vehicleId, buildId)}>
          <Button type="submit">Accept as my active build</Button>
        </form>
        <form action={discardDraftBuildAction.bind(null, vehicleId, buildId)}>
          <Button type="submit" variant="secondary">
            Discard
          </Button>
        </form>
      </div>
    </div>
  );
}
