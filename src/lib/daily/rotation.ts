import type { Weekday } from "@/lib/daily/day";

export const CHALLENGE_ICONS = ["engine", "wheel", "steering", "seat", "gauge", "wrench", "star", "flag"] as const;
export type ChallengeIcon = (typeof CHALLENGE_ICONS)[number];

export function isChallengeIcon(value: string): value is ChallengeIcon {
  return (CHALLENGE_ICONS as readonly string[]).includes(value);
}

export interface ChallengeTemplate {
  title: string;
  description: string;
  icon: ChallengeIcon;
}

/** What runs on a date nobody scheduled anything for. An admin can
 * replace any day from /admin/daily without an app release; this only
 * guarantees there's always a challenge. */
export const WEEKDAY_ROTATION: Record<Weekday, ChallengeTemplate> = {
  mon: {
    title: "Cleanest Engine Bay",
    description: "Pop the hood. Show the cleanest, best-detailed engine bay you've got.",
    icon: "engine",
  },
  tue: {
    title: "Best Wheel Setup",
    description: "Wheels, tires, fitment, stance. Get low and get the angle right.",
    icon: "wheel",
  },
  wed: {
    title: "Your First Car",
    description: "Still have it, or have a photo of it? Show the one that started it all.",
    icon: "steering",
  },
  thu: {
    title: "Best Interior",
    description: "Seats, wheel, gauges, trim. Show where you spend your time.",
    icon: "seat",
  },
  fri: {
    title: "Best Daily Driver",
    description: "The car that does it all, every day. Show your daily.",
    icon: "gauge",
  },
  sat: {
    title: "Most Unique Modification",
    description: "The one mod nobody else at the meet has. Get a clear shot of it.",
    icon: "wrench",
  },
  sun: {
    title: "Dream Build",
    description: "Where your build is headed. Show your car and tell us the plan in the caption.",
    icon: "star",
  },
};
