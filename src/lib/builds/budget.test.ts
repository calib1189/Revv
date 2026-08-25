import { describe, expect, it } from "vitest";
import { calculateBudgetSummary } from "./budget";
import type { BuildPart } from "@/lib/db/build-parts";

function makePart(overrides: Partial<BuildPart>): BuildPart {
  return {
    id: "bp1",
    build_id: "b1",
    part_id: null,
    raw_name: "Test part",
    category: null,
    status: "planned",
    price_cents: null,
    install_cost_cents: null,
    installed_at: null,
    notes: null,
    media_id: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calculateBudgetSummary", () => {
  it("returns zeros for an empty build with no budget", () => {
    const result = calculateBudgetSummary([], null);
    expect(result).toEqual({
      spentCents: 0,
      plannedCents: 0,
      totalCents: 0,
      budgetCents: null,
      remainingCents: null,
      percentUsed: null,
    });
  });

  it("sums installed/ordered parts as spent, planned parts as planned", () => {
    const parts = [
      makePart({ id: "1", status: "installed", price_cents: 100000, install_cost_cents: 15000 }),
      makePart({ id: "2", status: "ordered", price_cents: 20000 }),
      makePart({ id: "3", status: "planned", price_cents: 50000 }),
    ];
    const result = calculateBudgetSummary(parts, null);
    expect(result.spentCents).toBe(135000);
    expect(result.plannedCents).toBe(50000);
    expect(result.totalCents).toBe(185000);
  });

  it("treats null price/install cost as zero", () => {
    const parts = [makePart({ status: "installed" })];
    expect(calculateBudgetSummary(parts, null).spentCents).toBe(0);
  });

  it("computes remaining and percent used against a budget", () => {
    const parts = [makePart({ status: "installed", price_cents: 60000 })];
    const result = calculateBudgetSummary(parts, 100000);
    expect(result.remainingCents).toBe(40000);
    expect(result.percentUsed).toBe(60);
  });

  it("allows spending to exceed budget (negative remaining, >100%)", () => {
    const parts = [makePart({ status: "installed", price_cents: 150000 })];
    const result = calculateBudgetSummary(parts, 100000);
    expect(result.remainingCents).toBe(-50000);
    expect(result.percentUsed).toBe(150);
  });

  it("does not count planned parts toward percentUsed", () => {
    const parts = [makePart({ status: "planned", price_cents: 100000 })];
    const result = calculateBudgetSummary(parts, 100000);
    expect(result.percentUsed).toBe(0);
  });
});
