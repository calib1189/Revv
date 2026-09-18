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
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
    <PageShell>
      <PageHeader
        title="Review Build"
        eyebrow="Draft"
        back={{ href: `/garage/${vehicleId}`, label: vehicle.nickname || `${vehicle.make} ${vehicle.model}` }}
        description={
          sourceVehicle
            ? `Copied from ${sourceVehicle.nickname || `${sourceVehicle.make} ${sourceVehicle.model}`}. Nothing is saved to your active build until you accept.`
            : "Nothing is saved to your active build until you accept."
        }
      />

      {comparison && comparison.differences.length > 0 && (
        <div className="mb-6">
          <Callout tone="danger">
            <p className="font-semibold">Check compatibility before installing</p>
            <ul className="mt-1.5 list-inside list-disc">
              {comparison.differences.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <Link href="/tools/fitment" className="mt-2 inline-block font-semibold underline">
              Open the fitment calculator
            </Link>
          </Callout>
        </div>
      )}

      <div className="glass-raised elev-2 mb-8 flex items-stretch rounded-[22px] py-4">
        <div className="min-w-0 flex-1 text-center">
          <p className="numeral text-[1.625rem] leading-none">{buildParts.length}</p>
          <p className="mt-1.5 text-[0.75rem] font-medium text-muted">{buildParts.length === 1 ? "Mod" : "Mods"}</p>
        </div>
        <div className="w-px bg-border" />
        <div className="min-w-0 flex-1 text-center">
          <p className="numeral text-[1.625rem] leading-none">{formatCents(totalCents)}</p>
          <p className="mt-1.5 text-[0.75rem] font-medium text-muted">Estimated total</p>
        </div>
      </div>

      {buildParts.length === 0 ? (
        <EmptyState
          card
          title="No mods left in this draft"
          body="Accepting will give you an empty active build."
          className="mb-8"
        />
      ) : (
        <ul className="glass-raised elev-1 mb-8 overflow-hidden rounded-[22px] [&>li+li]:before:absolute [&>li+li]:before:left-4 [&>li+li]:before:right-0 [&>li+li]:before:top-0 [&>li+li]:before:h-px [&>li+li]:before:bg-border [&>li+li]:before:content-['']">
          {buildParts.map((part) => {
            const linkedPart = part.part_id ? partsById.get(part.part_id) : null;
            return (
              <li key={part.id} className="relative flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.9375rem] font-semibold">{part.raw_name}</p>
                  {part.category && <p className="mt-0.5 text-[0.8125rem] text-muted">{part.category}</p>}
                  {linkedPart && (
                    <div className="mt-2 max-w-sm">
                      <ProductCard part={linkedPart} />
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  {part.price_cents != null && (
                    <span className="numeral text-[0.9375rem]">{formatCents(part.price_cents)}</span>
                  )}
                  <form action={removeDraftBuildPartAction.bind(null, part.id, vehicleId, buildId)}>
                    <button type="submit" className="text-[0.8125rem] font-medium text-danger">
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-2.5">
        <form action={acceptDraftBuildAction.bind(null, vehicleId, buildId)}>
          <Button type="submit" className="h-12 w-full text-[1rem] font-semibold">
            Accept as Active Build
          </Button>
        </form>
        <form action={discardDraftBuildAction.bind(null, vehicleId, buildId)}>
          <Button type="submit" variant="secondary" className="h-12 w-full text-[1rem] font-semibold">
            Discard Draft
          </Button>
        </form>
      </div>
    </PageShell>
  );
}
