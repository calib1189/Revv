"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateBudgetAction, type BudgetFormState } from "@/features/builds/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { ProgressRing } from "@/components/ui/progress-ring";
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
      <div className="glass-raised elev-1 rounded-[22px] p-5">
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
    <div className="glass-raised elev-1 rounded-[22px] p-5">
      <div className="flex items-center gap-4">
        {summary.budgetCents != null && (
          <ProgressRing
            value={percent / 100}
            size={64}
            stroke={7}
            color={overBudget ? "var(--danger)" : "var(--accent)"}
            label={`${Math.round(percent)}% of budget used`}
          >
            <span className="numeral text-[0.8125rem] leading-none">{Math.round(percent)}%</span>
          </ProgressRing>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[0.8125rem] font-medium text-muted">Spent</p>
          <p className="numeral mt-0.5 text-[1.625rem] leading-none">{formatCents(summary.spentCents)}</p>
          <p className={`mt-1.5 text-[0.8125rem] ${overBudget ? "text-danger" : "text-muted"}`}>
            {summary.budgetCents == null
              ? "No budget set"
              : overBudget
                ? `${formatCents(-summary.remainingCents!)} over ${formatCents(summary.budgetCents)}`
                : `${formatCents(summary.remainingCents!)} left of ${formatCents(summary.budgetCents)}`}
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex-shrink-0 self-start text-[0.875rem] font-medium text-accent"
          >
            {summary.budgetCents != null ? "Edit" : "Set budget"}
          </button>
        )}
      </div>

      {summary.plannedCents > 0 && (
        <p className="mt-4 border-t border-border pt-3 text-[0.8125rem] text-muted">
          Plus <span className="numeral text-foreground">{formatCents(summary.plannedCents)}</span> planned
          but not yet ordered.
        </p>
      )}
    </div>
  );
}
