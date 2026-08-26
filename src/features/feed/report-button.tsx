"use client";

import { useActionState, useState } from "react";
import {
  createReportAction,
  type ReportFormState,
} from "@/features/feed/actions";
import { Button } from "@/components/ui/button";

const CONTENT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

// "Doesn't look like their car" is the whole reason vehicle reporting
// exists — it's the top option here, not buried under "other", since
// that's the specific fraud (photos of a car pulled from somewhere
// online, not the reporter's own build) this was built to catch.
const VEHICLE_REASONS = [
  { value: "fake_ownership", label: "Doesn't look like their car" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
];

const initialState: ReportFormState = { error: null, success: false };

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "post" | "comment" | "vehicle";
  targetId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const action = createReportAction.bind(null, targetType, targetId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const reasons = targetType === "vehicle" ? VEHICLE_REASONS : CONTENT_REASONS;

  if (state.success) {
    return <p className="text-sm text-muted">Report submitted. Thank you.</p>;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm text-muted hover:text-foreground"
      >
        Report
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="glass-raised flex flex-col gap-2 rounded-xl p-3"
    >
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <select
        name="reason"
        required
        defaultValue=""
        className="glass-inset w-full rounded-xl px-3 py-2 text-sm text-foreground transition-colors focus:border-accent/60 focus:outline-none"
      >
        <option value="" disabled>
          Why are you reporting this?
        </option>
        {reasons.map((reason) => (
          <option key={reason.value} value={reason.value}>
            {reason.label}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 text-sm"
        >
          {isPending ? "Submitting…" : "Submit report"}
        </Button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-sm text-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
