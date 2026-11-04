"use client";

import { GroupedButtonRow, RowIcon } from "@/components/ui/grouped-list";
import { PlayIcon } from "@/components/ui/icons";
import { TUTORIAL_REPLAY_EVENT } from "@/features/tutorial/tutorial-host";

/** Settings → Help & about. Replays the walkthrough without touching the
 * saved completion, so closing a replay halfway never re-arms it. */
export function ReplayTutorialRow() {
  return (
    <GroupedButtonRow
      label="Replay tutorial"
      detail="A one-minute tour of how SORZA works"
      icon={
        <RowIcon color="var(--accent)">
          <PlayIcon />
        </RowIcon>
      }
      onClick={() => window.dispatchEvent(new Event(TUTORIAL_REPLAY_EVENT))}
    />
  );
}
