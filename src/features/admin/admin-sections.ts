import {
  FlagIcon,
  CheckIcon,
  ShoppingBagIcon,
  GemIcon,
  TimerIcon,
  UsersIcon,
  BoltIcon,
  WrenchIcon,
  SpeedIcon,
  LockIcon,
} from "@/components/ui/icons";
import type { AdminQueueCounts } from "@/lib/admin/queue-counts";

export interface AdminSection {
  href: string;
  label: string;
  /** One line on what you do there. */
  description: string;
  icon: typeof FlagIcon;
  color: string;
  /** Review queues carry a waiting count. */
  countKey?: Exclude<keyof AdminQueueCounts, "total">;
}

export interface AdminSectionGroup {
  title: string;
  sections: AdminSection[];
}

/** Every admin page, grouped by what you're there to do. The single
 * list behind the dashboard, the desktop sidebar and the mobile back
 * bar's titles — adding a page here adds it everywhere. */
export const ADMIN_SECTION_GROUPS: AdminSectionGroup[] = [
  {
    title: "Review",
    sections: [
      {
        href: "/admin/reports",
        label: "Reports",
        description: "Flagged posts, comments and profiles",
        icon: FlagIcon,
        color: "#ff453a",
        countKey: "reports",
      },
      {
        href: "/admin/verifications",
        label: "Vehicle ownership",
        description: "Proof-of-ownership photos",
        icon: CheckIcon,
        color: "#30d158",
        countKey: "verifications",
      },
      {
        href: "/admin/business-verifications",
        label: "Business claims",
        description: "People claiming a shop as theirs",
        icon: ShoppingBagIcon,
        color: "#34c759",
        countKey: "businessVerifications",
      },
      {
        href: "/admin/ads",
        label: "Ads",
        description: "Paid ads waiting to go live",
        icon: GemIcon,
        color: "#30b0c7",
        countKey: "ads",
      },
      {
        href: "/admin/meetups",
        label: "Meets",
        description: "Paid meet listings waiting to go live",
        icon: TimerIcon,
        color: "#ff9f0a",
        countKey: "meetups",
      },
    ],
  },
  {
    title: "Manage",
    sections: [
      {
        href: "/admin/users",
        label: "Users",
        description: "Verified badges, Founder title, bans",
        icon: UsersIcon,
        color: "#0a84ff",
      },
      {
        href: "/admin/daily",
        label: "Sorza Daily",
        description: "Schedule and edit daily challenges",
        icon: FlagIcon,
        color: "#ff4433",
      },
      {
        href: "/admin/active",
        label: "Live now",
        description: "Running ads, promoted shops and paid meets",
        icon: BoltIcon,
        color: "#bf5af2",
      },
      {
        href: "/admin/parts",
        label: "Parts catalog",
        description: "The verified parts behind product cards",
        icon: WrenchIcon,
        color: "#8e8e93",
      },
    ],
  },
  {
    title: "Insights",
    sections: [
      {
        href: "/admin/analytics",
        label: "Analytics",
        description: "Totals and activity over 30 days",
        icon: SpeedIcon,
        color: "#5e5ce6",
      },
      {
        href: "/admin/audit-log",
        label: "Audit log",
        description: "Every admin action, newest first",
        icon: LockIcon,
        color: "#636366",
      },
    ],
  },
];

export const ADMIN_SECTIONS = ADMIN_SECTION_GROUPS.flatMap((group) => group.sections);
