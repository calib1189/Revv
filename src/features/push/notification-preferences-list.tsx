"use client";

import { useState, useTransition } from "react";
import { setNotificationPreferenceAction } from "@/features/push/push-actions";
import { GroupedList, GroupedRow, RowIcon } from "@/components/ui/grouped-list";
import { Toggle } from "@/components/ui/toggle";
import {
  BellIcon,
  BoltIcon,
  CommentIcon,
  FlagIcon,
  GemIcon,
  HeartIcon,
  PersonIcon,
  StarIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { NotificationPreferences, PushCategory } from "@/lib/db/notification-preferences";

const ROWS: { category: PushCategory; label: string; detail: string; color: string; icon: typeof HeartIcon }[] = [
  { category: "likes", label: "Likes", detail: "Someone likes your post", color: "#ff375f", icon: HeartIcon },
  {
    category: "comments",
    label: "Comments",
    detail: "Comments on your posts and replies to yours",
    color: "#0a84ff",
    icon: CommentIcon,
  },
  { category: "follows", label: "New followers", detail: "Someone follows you", color: "#30d158", icon: PersonIcon },
  { category: "ratings", label: "Ratings", detail: "Someone rates your car", color: "#ffd60a", icon: StarIcon },
  {
    category: "leaderboard",
    label: "Leaderboard",
    detail: "You lose #1 or drop out of the top 10",
    color: "#c9b6ff",
    icon: GemIcon,
  },
  {
    category: "challenges",
    label: "Weekly challenges",
    detail: "New challenges every Monday",
    color: "#ff453a",
    icon: BoltIcon,
  },
  { category: "messages", label: "Messages", detail: "New messages in your inbox", color: "#5e5ce6", icon: BellIcon },
  {
    category: "crews",
    label: "Crews",
    detail: "Join requests, approvals and new crew posts",
    color: "#bf5af2",
    icon: UsersIcon,
  },
  {
    category: "updates",
    label: "Updates from SORZA",
    detail: "Your meets, ads and vehicle verification",
    color: "#ff9f0a",
    icon: FlagIcon,
  },
];

/** One switch per kind of push notification. Saves on each flip, and
 * puts the switch back if the save fails rather than showing a setting
 * that didn't stick. */
export function NotificationPreferencesList({ initial }: { initial: NotificationPreferences }) {
  const [preferences, setPreferences] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function flip(category: PushCategory, enabled: boolean) {
    setError(null);
    setPreferences((p) => ({ ...p, [category]: enabled }));
    startTransition(async () => {
      const result = await setNotificationPreferenceAction(category, enabled);
      if (result.error) {
        setPreferences((p) => ({ ...p, [category]: !enabled }));
        setError(result.error);
      }
    });
  }

  return (
    <GroupedList
      footer={
        error ? (
          <span className="text-danger">{error}</span>
        ) : (
          "Only affects alerts on your phone or browser. Activity in the app still shows everything."
        )
      }
    >
      {ROWS.map(({ category, label, detail, color, icon: Icon }) => (
        <GroupedRow
          key={category}
          label={label}
          detail={detail}
          icon={
            <RowIcon color={color}>
              <Icon />
            </RowIcon>
          }
          trailing={
            <Toggle
              checked={preferences[category]}
              onChange={(next) => flip(category, next)}
              disabled={pending}
              label={label}
            />
          }
        />
      ))}
    </GroupedList>
  );
}
