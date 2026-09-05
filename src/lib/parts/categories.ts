import type { ReactElement, SVGProps } from "react";
import {
  BodyKitIcon,
  HeadlightIcon,
  WheelIcon,
  BrakeIcon,
  SuspensionIcon,
  ExhaustIcon,
  EngineIcon,
  RadiatorIcon,
  GaugeIcon,
  SpeakerIcon,
  SeatIcon,
  RollCageIcon,
  BullBarIcon,
  ShoppingBagIcon,
} from "@/components/ui/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

/** The marketplace's browsable category taxonomy — fixed, not derived
 * from whatever rows happen to already be in the (admin/matching-job-
 * curated, still mostly empty) `parts` table. Same reasoning as
 * VehicleCategory: a `text` column with no DB-level enum, but a stable
 * set the app treats as the real categories so browsing works today,
 * before the catalog has real coverage, instead of the page's category
 * list literally being empty until someone else populates the table.
 *
 * `searchKeyword` powers the "shop this category" affiliate link shown
 * when a category has no verified catalog rows yet — null for "merch"
 * on purpose: there's no honest generic search for a SORZA-branded
 * product that doesn't exist yet, unlike a real named part category,
 * which genuinely can be searched for on a real retailer. */
export interface PartCategory {
  id: string;
  label: string;
  searchKeyword: string | null;
  icon: IconComponent;
}

export const PART_CATEGORIES: PartCategory[] = [
  { id: "exterior", label: "Exterior Body", searchKeyword: "car exterior body kit parts", icon: BodyKitIcon },
  { id: "lighting", label: "Lighting", searchKeyword: "car headlights taillights", icon: HeadlightIcon },
  { id: "wheels-tires", label: "Wheels & Tires", searchKeyword: "car wheels tires", icon: WheelIcon },
  { id: "brakes", label: "Brakes", searchKeyword: "car brake kit", icon: BrakeIcon },
  { id: "suspension", label: "Suspension & Chassis", searchKeyword: "car suspension coilovers", icon: SuspensionIcon },
  { id: "exhaust-intake", label: "Exhaust & Intake", searchKeyword: "car exhaust cold air intake", icon: ExhaustIcon },
  { id: "engine-drivetrain", label: "Engine & Drivetrain", searchKeyword: "car engine performance parts", icon: EngineIcon },
  { id: "cooling", label: "Cooling", searchKeyword: "car radiator cooling parts", icon: RadiatorIcon },
  { id: "electrical-tech", label: "Electrical & Tech", searchKeyword: "car electronics gauges", icon: GaugeIcon },
  { id: "audio", label: "Audio", searchKeyword: "car audio speakers", icon: SpeakerIcon },
  { id: "interior", label: "Interior", searchKeyword: "car interior accessories", icon: SeatIcon },
  { id: "safety-racing", label: "Safety & Racing", searchKeyword: "racing roll cage harness", icon: RollCageIcon },
  { id: "off-road-utility", label: "Off-Road & Utility", searchKeyword: "off road truck accessories", icon: BullBarIcon },
  { id: "merch", label: "Merch", searchKeyword: null, icon: ShoppingBagIcon },
];

export function getPartCategoryLabel(id: string): string {
  return PART_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function getPartCategory(id: string): PartCategory | undefined {
  return PART_CATEGORIES.find((c) => c.id === id);
}
