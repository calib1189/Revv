import Image from "next/image";
import { getStoreItem, type StoreItem } from "@/lib/store/catalog";
import { StyledName } from "@/features/store/look-preview";
import type { Crew } from "@/lib/db/crews";

/**
 * A crew's bought look (store cosmetics: name colour, banner, badge frame),
 * shown the same way everywhere the crew appears: its page, its card in
 * Discover, its row on the crew leaderboard. A cosmetic that only showed
 * on the crew's own page wasn't worth buying; these are what make a crew
 * stand out in a list of them.
 */
export interface CrewLook {
  nameColor: StoreItem | null;
  banner: StoreItem | null;
  frame: StoreItem | null;
}

export function crewLook(crew: Pick<Crew, "equipped_crew_name_color" | "equipped_crew_banner" | "equipped_crew_frame">): CrewLook {
  const item = (id: string | null) => (id ? (getStoreItem(id) ?? null) : null);
  return {
    nameColor: item(crew.equipped_crew_name_color),
    banner: item(crew.equipped_crew_banner),
    frame: item(crew.equipped_crew_frame),
  };
}

/** The crew's name in its bought colour, or plain (inheriting the colour
 * around it) without one. */
export function CrewName({ crew, look, className = "" }: { crew: Pick<Crew, "name">; look: CrewLook; className?: string }) {
  if (!look.nameColor) return <span className={className}>{crew.name}</span>;
  return (
    <StyledName item={look.nameColor} className={className}>
      {crew.name}
    </StyledName>
  );
}

/** The crew's logo (or initial), inside its bought badge frame. */
export function CrewLogo({
  crew,
  logoUrl,
  look,
  size,
  radius,
  className = "",
  initialClassName = "text-lg font-bold",
}: {
  crew: Pick<Crew, "name">;
  logoUrl: string | null;
  look: CrewLook;
  size: number;
  radius: number;
  className?: string;
  initialClassName?: string;
}) {
  return (
    <span
      className={`relative block flex-shrink-0 ${look.frame?.value ?? ""}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <span className={`relative block h-full w-full overflow-hidden ${className}`} style={{ borderRadius: radius }}>
        {logoUrl ? (
          <Image src={logoUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${initialClassName}`}>
            {crew.name.charAt(0).toUpperCase()}
          </span>
        )}
      </span>
    </span>
  );
}

/** The bought banner as a CSS background (with its animation class). */
export function bannerStyle(look: CrewLook): { className: string; style: React.CSSProperties | undefined } {
  if (!look.banner) return { className: "", style: undefined };
  return { className: look.banner.effectClassName ?? "", style: { backgroundImage: look.banner.value } };
}
