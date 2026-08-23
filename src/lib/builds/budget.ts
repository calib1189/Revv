import type { BuildPart } from "@/lib/db/build-parts";

export interface BudgetSummary {
  spentCents: number;
  plannedCents: number;
  totalCents: number;
  budgetCents: number | null;
  remainingCents: number | null;
  /** 0-100+, null when there's no budget to measure against. */
  percentUsed: number | null;
}

const SPENT_STATUSES: BuildPart["status"][] = ["ordered", "installed"];

function partCost(part: BuildPart): number {
  return (part.price_cents ?? 0) + (part.install_cost_cents ?? 0);
}

/** Aggregates are computed here, never stored — call this at read time. */
export function calculateBudgetSummary(
  buildParts: BuildPart[],
  budgetCents: number | null,
): BudgetSummary {
  let spentCents = 0;
  let plannedCents = 0;

  for (const part of buildParts) {
    const cost = partCost(part);
    if (SPENT_STATUSES.includes(part.status)) {
      spentCents += cost;
    } else {
      plannedCents += cost;
    }
  }

  const totalCents = spentCents + plannedCents;

  return {
    spentCents,
    plannedCents,
    totalCents,
    budgetCents,
    remainingCents: budgetCents != null ? budgetCents - spentCents : null,
    percentUsed:
      budgetCents != null && budgetCents > 0
        ? (spentCents / budgetCents) * 100
        : null,
  };
}
