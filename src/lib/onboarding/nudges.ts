import type { PushPayload } from "@/lib/push/payload";

/** The two one-time pushes that pull someone the rest of the way into
 * the game: a car on the account, then a score on it. Half of SORZA's
 * accounts had stalled at one of those two steps, and nothing ever
 * asked them again. Each nudge goes out once per person, ever, and only
 * a day after the step before it, so it reads as a reminder rather than
 * a follow-up the moment they close the app. Sent by the hourly job
 * (features/garage/notify-onboarding-nudges). */

export type OnboardingNudgeKind = "add_car" | "rate_car";

export interface NudgeCar {
  id: string;
  name: string;
  hasPhoto: boolean;
  rated: boolean;
  approved: boolean;
  ageHours: number;
}

export type OnboardingNudge = { kind: "add_car" } | { kind: "rate_car"; car: NudgeCar };

const WAIT_HOURS = 24;

export function decideOnboardingNudge({
  accountAgeHours,
  cars,
  sent,
}: {
  accountAgeHours: number;
  cars: NudgeCar[];
  sent: Set<OnboardingNudgeKind>;
}): OnboardingNudge | null {
  if (cars.length === 0) {
    return !sent.has("add_car") && accountAgeHours >= WAIT_HOURS ? { kind: "add_car" } : null;
  }
  if (sent.has("rate_car") || cars.some((c) => c.rated)) return null;

  const waited = cars.filter((c) => c.ageHours >= WAIT_HOURS);
  const car = waited.find((c) => c.hasPhoto) ?? waited[0];
  return car ? { kind: "rate_car", car } : null;
}

export function onboardingNudgePayload(nudge: OnboardingNudge): PushPayload {
  if (nudge.kind === "add_car") {
    return { title: "SORZA", body: "Add your ride. SORZA scores it free and shows you where it ranks.", url: "/garage/new" };
  }
  const { car } = nudge;
  if (!car.hasPhoto) {
    return { title: "SORZA", body: `Add a photo of your ${car.name} and SORZA will score it free.`, url: `/garage/${car.id}#manage` };
  }
  return {
    title: "SORZA",
    body: `Your ${car.name} ${car.approved ? "is approved but has" : "has"} no score yet. Your first rating is free. See where it ranks.`,
    url: `/garage/${car.id}#rate`,
  };
}
