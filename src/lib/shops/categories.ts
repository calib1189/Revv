import type { ReactElement, SVGProps } from "react";
import {
  WrenchIcon,
  BodyKitIcon,
  TintIcon,
  ExhaustIcon,
  TireIcon,
  TuningIcon,
  PaintIcon,
  SpeakerIcon,
} from "@/components/ui/icons";
import type { ShopCategoryId } from "@/lib/providers/places-provider";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

export interface ShopCategoryDef {
  id: ShopCategoryId;
  label: string;
  /** Fed to Google Places Text Search as-is. Google's own place "types"
   * taxonomy has nothing finer-grained than "car_repair" — no distinct
   * type for a tint shop vs. a body shop vs. an exhaust shop — so a plain
   * keyword query (which Google's search already handles well) stands in
   * for a category filter instead of the stricter type-enum search. */
  searchQuery: string;
  icon: IconComponent;
}

export const SHOP_CATEGORIES: ShopCategoryDef[] = [
  { id: "repair", label: "General Repair", searchQuery: "auto repair shop", icon: WrenchIcon },
  { id: "body_shop", label: "Body Shop", searchQuery: "auto body shop", icon: BodyKitIcon },
  { id: "tint", label: "Window Tint", searchQuery: "window tint shop", icon: TintIcon },
  { id: "exhaust", label: "Exhaust", searchQuery: "exhaust shop", icon: ExhaustIcon },
  { id: "tires_wheels", label: "Tires & Wheels", searchQuery: "tire shop", icon: TireIcon },
  { id: "performance", label: "Performance & Tuning", searchQuery: "performance auto shop", icon: TuningIcon },
  { id: "detailing", label: "Detailing", searchQuery: "auto detailing", icon: PaintIcon },
  { id: "audio", label: "Car Audio", searchQuery: "car audio shop", icon: SpeakerIcon },
];

export function isShopCategoryId(value: string): value is ShopCategoryId {
  return SHOP_CATEGORIES.some((c) => c.id === value);
}

export function getShopCategory(id: ShopCategoryId): ShopCategoryDef {
  // Non-null: ShopCategoryId is a closed union and SHOP_CATEGORIES covers
  // every member, unlike PART_CATEGORIES' free-text id.
  return SHOP_CATEGORIES.find((c) => c.id === id)!;
}
