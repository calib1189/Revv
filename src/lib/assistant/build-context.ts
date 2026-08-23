import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { listVehiclesByOwner } from "@/lib/db/vehicles";
import { getActiveBuild } from "@/lib/db/builds";
import { listBuildParts } from "@/lib/db/build-parts";
import { listMaintenanceForVehicle } from "@/lib/db/maintenance";
import { calculateBudgetSummary } from "@/lib/builds/budget";
import { formatCents } from "@/lib/format/money";
import { formatDateOnly } from "@/lib/format/date";

/** Assembles a plain-text summary of the user's own data — real numbers
 * only, nothing invented — for the chat provider to draw on. */
export async function buildUserContext(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string> {
  const vehicles = await listVehiclesByOwner(supabase, userId);
  if (vehicles.length === 0) {
    return "This user has no vehicles in their garage yet.";
  }

  const lines: string[] = [`You have ${vehicles.length} vehicle(s).`];

  for (const vehicle of vehicles) {
    const title =
      vehicle.nickname || `${vehicle.year ?? ""} ${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim();

    const activeBuild = await getActiveBuild(supabase, vehicle.id);
    const buildParts = activeBuild
      ? await listBuildParts(supabase, activeBuild.id)
      : [];
    const summary = calculateBudgetSummary(
      buildParts,
      activeBuild?.budget_cents ?? null,
    );

    const budgetPart =
      summary.budgetCents != null
        ? `of ${formatCents(summary.budgetCents)} budget`
        : "(no budget set)";
    lines.push(
      `${title}: spent ${formatCents(summary.spentCents)} ${budgetPart}, ${buildParts.length} modification(s) listed.`,
    );

    const maintenance = await listMaintenanceForVehicle(supabase, vehicle.id);
    if (maintenance.length > 0) {
      const last = maintenance[0];
      lines.push(
        `${title} maintenance: most recent was "${last.kind}" on ${formatDateOnly(last.performed_at)}, ${maintenance.length} record(s) total.`,
      );
    }
  }

  return lines.join("\n");
}
