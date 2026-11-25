import Image from "next/image";
import Link from "next/link";
import { CREW_CATEGORY_LABELS } from "@/lib/crews/category";
import { RANK_MATERIAL_ICONS } from "@/features/garage/rank-material-icons";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { FlagIcon, LockIcon } from "@/components/ui/icons";
import type { CrewStats } from "@/lib/db/crew-stats";
import { bannerStyle, crewLook, CrewLogo, CrewName } from "@/features/crews/crew-look";

/** A crew as a cover card: banner photo full-bleed, logo and name over
 * a scrim at the bottom, and, once a member has a rated build, the crew's
 * tier and score (lib/crews/crew-score.ts) as a frosted chip up top. */
export function CrewCard({ data }: { data: CrewStats }) {
  const { crew, logoUrl, bannerUrl, memberCount, score } = data;
  const tier = score.tierScore != null ? rankForScore(score.tierScore) : null;
  const TierIcon = tier ? RANK_MATERIAL_ICONS[tier] : null;
  const look = crewLook(crew);
  const banner = bannerStyle(look);

  return (
    // A bought banner edges the card in its colours (round the crew's own
    // photo), or fills it when there's no photo.
    <Link
      href={`/crews/${crew.id}`}
      className={`pressable group relative block aspect-[4/3] overflow-hidden rounded-[24px] bg-neutral-900 elev-2 ${
        look.banner ? `p-[3px] ${banner.className}` : ""
      }`}
      style={banner.style}
    >
      <div className={`relative h-full w-full overflow-hidden ${look.banner ? "rounded-[21px]" : ""} ${bannerUrl ? "bg-neutral-900" : ""}`}>
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[900ms] ease-[var(--ease-ios)] group-hover:scale-[1.04]"
        />
      ) : look.banner ? null : (
        <div className="flex h-full w-full items-center justify-center">
          <FlagIcon className="h-9 w-9 text-white/25" />
        </div>
      )}

      <div className="photo-scrim pointer-events-none absolute inset-0" />

      <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
        {tier && TierIcon && score.score != null ? (
          <span className="flex items-center gap-1.5 rounded-full bg-black/45 py-1 pl-1 pr-2.5 backdrop-blur-md">
            <TierIcon className="h-5 w-5" />
            <span className="text-[0.75rem] font-semibold leading-none" style={{ color: RANK_TEXT_COLORS[tier] }}>
              {RANK_LABELS[tier]}
            </span>
            <span className="numeral text-[0.75rem] leading-none text-white/85">{Math.round(score.score)}</span>
          </span>
        ) : (
          <span />
        )}
        {crew.visibility === "private" && (
          <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-[0.6875rem] font-semibold text-white backdrop-blur-md">
            <LockIcon className="h-3 w-3" />
            Private
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
        <CrewLogo
          crew={crew}
          logoUrl={logoUrl}
          look={look}
          size={48}
          radius={14}
          className={`bg-neutral-800 ${look.frame ? "" : "ring-2 ring-white/15"}`}
          initialClassName="text-lg font-bold text-white"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.125rem] font-bold tracking-[-0.01em] text-white">
            <CrewName crew={crew} look={look} />
          </h3>
          <p className="truncate text-[0.8125rem] text-white/75">
            {CREW_CATEGORY_LABELS[crew.category]}
            {crew.location_text ? ` · ${crew.location_text}` : ""}
            {" · "}
            <span className="numeral">{memberCount}</span> member{memberCount === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      </div>
    </Link>
  );
}
