import type { ReactElement, SVGProps } from "react";
import {
  WheelIcon,
  ExhaustIcon,
  SuspensionIcon,
  TurboIcon,
  BrakeIcon,
  EngineIcon,
  TuningIcon,
  SeatIcon,
  BodyKitIcon,
  SpeakerIcon,
  BoltIcon,
  WrenchIcon,
} from "@/components/ui/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

/** Keyword -> icon, checked in order against the mod's category (falling
 * back to its raw name if category wasn't filled in). Cosmetic only —
 * worst case a slightly-off icon, not a data-correctness concern, so a
 * plain substring check is enough here (unlike the vehicle-category
 * guesser, which needed word-boundary matching to avoid actually
 * miscategorizing a car). */
const CATEGORY_ICONS: { keywords: string[]; icon: IconComponent }[] = [
  { keywords: ["wheel", "tire", "tyre", "rim"], icon: WheelIcon },
  { keywords: ["exhaust", "muffler", "cat-back", "catback", "header", "downpipe"], icon: ExhaustIcon },
  { keywords: ["suspension", "coilover", "spring", "strut", "shock", "sway"], icon: SuspensionIcon },
  { keywords: ["turbo", "supercharger", "intake", "intercooler", "boost"], icon: TurboIcon },
  { keywords: ["brake", "caliper", "rotor", "pad"], icon: BrakeIcon },
  { keywords: ["engine", "motor", "block", "piston", "cam"], icon: EngineIcon },
  { keywords: ["ecu", "tune", "tuning", "software", "chip", "flash"], icon: TuningIcon },
  { keywords: ["interior", "seat", "steering wheel", "shifter"], icon: SeatIcon },
  { keywords: ["exterior", "body", "bumper", "splitter", "spoiler", "wing", "aero", "fender", "widebody"], icon: BodyKitIcon },
  { keywords: ["audio", "speaker", "stereo", "sound", "subwoofer", "amp"], icon: SpeakerIcon },
  { keywords: ["light", "led", "headlight", "taillight", "electrical", "wiring"], icon: BoltIcon },
];

export function getCategoryIcon(category: string | null, rawName: string): IconComponent {
  const haystack = `${category ?? ""} ${rawName}`.toLowerCase();
  for (const { keywords, icon } of CATEGORY_ICONS) {
    if (keywords.some((kw) => haystack.includes(kw))) return icon;
  }
  return WrenchIcon;
}
