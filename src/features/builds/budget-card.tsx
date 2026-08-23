"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateBudgetAction, type BudgetFormState } from "@/features/builds/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { formatCents } from "@/lib/format/money";
import type { BudgetSummary } from "@/lib/builds/budget";

const initialState: BudgetFormState = { error: null };

export function BudgetCard({
  summary,
  vehicleId,
  isOwner,
}: {
  summary: BudgetSummary;
  vehicleId: string;
  isOwner: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const action = updateBudgetAction.bind(null, vehicleId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !isPending && !state.error) {
      setIsEditing(false);
    }
    wasPending.current = isPending;
  }, [isPending, state.error]);

  if (isEditing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <form action={formAction} className="flex items-end gap-3">
          <div className="flex-1">
            {state.error && (
              <div className="mb-2">
                <Callout tone="danger">{state.error}</Callout>
              </div>
            )}
            <label htmlFor="budget" className="mb-1.5 block text-sm font-medium">
              Budget ($)
            </label>
            <Input
              id="budget"
              name="budget"
              inputMode="decimal"
              placeholder="e.g. 5000"
              defaultValue={
                summary.budgetCents != null ? (summary.budgetCents / 100).toString() : ""
              }
            />
          </div>
          <Button type="submit" disabled={isPending} className="px-3 py-2.5 text-sm">
            {isPending ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="px-1 py-2.5 text-sm text-muted hover:text-foreground"
          >
            Cancel
          </button>
        </form>
      </div>
    );
  }

  const percent = summary.percentUsed != null ? Math.min(summary.percentUsed, 100) : 0;
  const overBudget = summary.remainingCents != null && summary.remainingCents < 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold">Budget</h2>
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-muted hover:text-foreground"
          >
            {summary.budgetCents != null ? "Edit" : "Set budget"}
          </button>
        )}
      </div>

      {summary.budgetCents != null ? (
        <>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background">
            <div
              className={`h-full rounded-full ${overBudget ? "bg-danger" : "bg-accent"}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span>
              <strong>{formatCents(summary.spentCents)}</strong> spent of{" "}
              {formatCents(summary.budgetCents)}
            </span>
            <span className={overBudget ? "text-danger" : "text-muted"}>
              {overBudget
                ? `${formatCents(-summary.remainingCents!)} over`
                : `${formatCents(summary.remainingCents!)} left`}
            </span>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted">
          {formatCents(summary.spentCents)} spent so far — no budget set.
        </p>
      )}

      {summary.plannedCents > 0 && (
        <p className="mt-1.5 text-xs text-muted">
          Plus {formatCents(summary.plannedCents)} planned but not yet ordered.
        </p>
      )}
    </div>
  );
}
