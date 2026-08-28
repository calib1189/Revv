"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  dismissReportAction,
  removeReportedContentAction,
} from "@/features/admin/actions";
import { BanUserButton } from "@/features/admin/ban-user-button";
import { relativeTime } from "@/lib/format/relative-time";
import type { Report } from "@/lib/db/reports";

function targetHref(report: Report): string | null {
  if (report.target_type === "post") return `/p/${report.target_id}`;
  if (report.target_type === "vehicle") return `/garage/${report.target_id}`;
  return null;
}

export function ReportRow({
  report,
  reporterUsername,
  authorId,
}: {
  report: Report;
  reporterUsername: string;
  /** Whoever authored/owns the reported thing — null if it was already
   * deleted before this report was reviewed. */
  authorId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const href = targetHref(report);

  if (resolved) return null;

  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium capitalize">
          {report.target_type} reported for {report.reason}
        </p>
        <p className="text-xs text-muted">
          Reported by @{reporterUsername} · {relativeTime(report.created_at)}
        </p>
        {href && (
          <Link href={href} className="text-xs text-accent hover:underline">
            View content
          </Link>
        )}
      </div>

      <div className="flex flex-shrink-0 gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await dismissReportAction(report.id);
              setResolved(true);
            })
          }
          className="text-sm text-muted hover:text-foreground disabled:opacity-60"
        >
          Dismiss
        </button>
        {(report.target_type === "post" ||
          report.target_type === "comment" ||
          report.target_type === "vehicle") && (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await removeReportedContentAction(
                  report.id,
                  report.target_type,
                  report.target_id,
                );
                setResolved(true);
              })
            }
            className="text-sm text-danger hover:underline disabled:opacity-60"
          >
            {report.target_type === "vehicle" ? "Remove vehicle" : "Remove content"}
          </button>
        )}
        {authorId && <BanUserButton userId={authorId} />}
      </div>
    </li>
  );
}
