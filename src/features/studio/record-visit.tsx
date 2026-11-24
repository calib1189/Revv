"use client";

import { useEffect, useRef } from "react";
import { recordPostVisitAction } from "@/features/studio/visit-actions";

/** Counts this page view toward the post it was opened from, once it's
 * actually shown (see recordPostVisitAction for why not on the server). */
export function RecordVisit({
  kind,
  targetId,
  sourcePostId,
}: {
  kind: "profile" | "vehicle";
  targetId: string;
  sourcePostId: string;
}) {
  const sent = useRef<string | null>(null);
  useEffect(() => {
    const key = `${kind}:${targetId}:${sourcePostId}`;
    if (sent.current === key) return;
    sent.current = key;
    void recordPostVisitAction({ kind, targetId, sourcePostId });
  }, [kind, targetId, sourcePostId]);
  return null;
}
