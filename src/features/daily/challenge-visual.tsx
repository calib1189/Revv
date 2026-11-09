import Image from "next/image";
import {
  EngineIcon,
  FlagIcon,
  GaugeIcon,
  SeatIcon,
  SteeringWheelIcon,
  StarIcon,
  WheelIcon,
  WrenchIcon,
} from "@/components/ui/icons";
import type { ChallengeIcon } from "@/lib/daily/rotation";

const ICONS: Record<ChallengeIcon, typeof EngineIcon> = {
  engine: EngineIcon,
  wheel: WheelIcon,
  steering: SteeringWheelIcon,
  seat: SeatIcon,
  gauge: GaugeIcon,
  wrench: WrenchIcon,
  star: StarIcon,
  flag: FlagIcon,
};

export function ChallengeIconGlyph({ icon, className }: { icon: ChallengeIcon; className?: string }) {
  const Icon = ICONS[icon];
  return <Icon className={className} />;
}

/**
 * The stock photo for each challenge icon, used whenever the admin hasn't
 * set a cover photo. Files live in public/daily/ (served by the app, not
 * Supabase Storage). All from Unsplash, free under the Unsplash License
 * (commercial use, no attribution required; credited here anyway):
 *   engine    unsplash.com/photos/QCDM7eeYm_o  @abstract_ion
 *   wheel     unsplash.com/photos/2KD6Z-SmTQE  @giorgiotrovato
 *   steering  unsplash.com/photos/FFAq3r9u0-Y  @zachwileydesign
 *   seat      unsplash.com/photos/O_DZkRlr6Tc  @mike_marchi
 *   gauge     unsplash.com/photos/s40VRZ1HqXs  @schiepatrick
 *   wrench    unsplash.com/photos/YkBaEl7f1C8  @sl33vo
 *   star      unsplash.com/photos/pYjGj5XnNlI  @romanellophotos
 *   flag      unsplash.com/photos/_QlczAt-Ffc  @spencerdavis
 *
 * `focus` is the photo's subject (CSS object-position), so it stays in
 * frame in the square Daily card, the wide Garage banner and the tall
 * feed slide alike.
 */
const DAILY_PHOTOS: Record<ChallengeIcon, { src: string; focus: string }> = {
  engine: { src: "/daily/engine.jpg", focus: "50% 40%" },
  wheel: { src: "/daily/wheel.jpg", focus: "62% 50%" },
  steering: { src: "/daily/steering.jpg", focus: "45% 45%" },
  seat: { src: "/daily/seat.jpg", focus: "60% 45%" },
  gauge: { src: "/daily/gauge.jpg", focus: "40% 60%" },
  wrench: { src: "/daily/wrench.jpg", focus: "48% 55%" },
  star: { src: "/daily/star.jpg", focus: "50% 62%" },
  flag: { src: "/daily/flag.jpg", focus: "72% 62%" },
};

/** The challenge's picture: the admin's cover photo when there is one,
 * otherwise the stock photo for the challenge's icon. */
export function ChallengeVisual({
  icon,
  coverUrl,
  priority = false,
}: {
  icon: ChallengeIcon;
  coverUrl: string | null;
  priority?: boolean;
}) {
  const stock = DAILY_PHOTOS[icon];
  return (
    <Image
      src={coverUrl ?? stock.src}
      alt=""
      fill
      priority={priority}
      sizes="(min-width: 768px) 672px, 100vw"
      className="object-cover"
      style={coverUrl ? undefined : { objectPosition: stock.focus }}
    />
  );
}
