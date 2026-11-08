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

/** The challenge's picture: the admin's cover photo when there is one,
 * otherwise the challenge's own icon set large on a dark plate, with a
 * thin red rule, so a rotation day still has a deliberate visual
 * instead of a stock placeholder. */
export function ChallengeVisual({
  icon,
  coverUrl,
  priority = false,
}: {
  icon: ChallengeIcon;
  coverUrl: string | null;
  priority?: boolean;
}) {
  if (coverUrl) {
    return (
      <Image src={coverUrl} alt="" fill priority={priority} sizes="(min-width: 768px) 672px, 100vw" className="object-cover" />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_90%_at_70%_20%,#2a2a2e_0%,#121214_55%,#0a0a0b_100%)]">
      <ChallengeIconGlyph icon={icon} className="h-28 w-28 text-white/[0.85]" />
      <span className="absolute bottom-0 left-0 h-1 w-24 bg-accent" />
    </div>
  );
}
