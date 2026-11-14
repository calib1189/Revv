import { describe, expect, it } from "vitest";
import { formatSaleAmount, pointsSale, salePush, saleTotals, teeSale, type Sale } from "@/lib/sales/sale";

const NOW = Date.parse("2026-11-13T12:00:00Z");

function sale(hoursAgo: number, amountCents: number, refunded = false): Sale {
  return {
    id: `${hoursAgo}-${amountCents}`,
    kind: "tee",
    title: "Big S tee",
    detail: "Size L",
    buyerId: "u",
    amountCents,
    createdAt: new Date(NOW - hoursAgo * 60 * 60 * 1000).toISOString(),
    problem: null,
    refunded,
  };
}

describe("saleTotals", () => {
  it("adds each sale to every window it falls in", () => {
    const totals = saleTotals([sale(1, 2999), sale(48, 499), sale(24 * 20, 10000), sale(24 * 40, 7500)], NOW);
    expect(totals).toEqual({ day: 2999, week: 2999 + 499, month: 2999 + 499 + 10000 });
  });

  it("leaves refunded sales out", () => {
    expect(saleTotals([sale(1, 2999, true), sale(2, 99)], NOW)).toEqual({ day: 99, week: 99, month: 99 });
  });

  it("is zero with no sales", () => {
    expect(saleTotals([], NOW)).toEqual({ day: 0, week: 0, month: 0 });
  });
});

describe("formatSaleAmount", () => {
  it("keeps the cents", () => {
    expect(formatSaleAmount(2999)).toBe("$29.99");
    expect(formatSaleAmount(99)).toBe("$0.99");
    expect(formatSaleAmount(120000)).toBe("$1,200.00");
  });
});

describe("salePush", () => {
  it("says who bought what, for how much, and opens Sales", () => {
    expect(salePush(teeSale({ design: "big-s", size: "L" }), 2999, "s55")).toEqual({
      title: "New sale · $29.99",
      body: "@s55 bought a Big S tee",
      url: "/admin/sales",
    });
  });

  it("reads naturally for points and an unknown buyer", () => {
    expect(salePush(pointsSale({ points: 1200, provider: "apple" }), 999, null).body).toBe("Someone bought 1,200 points");
  });
});
