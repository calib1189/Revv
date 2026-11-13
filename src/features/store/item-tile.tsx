import type { StoreCategory, StoreItem } from "@/lib/store/catalog";
import { StyledName } from "@/features/store/look-preview";
import { WheelIcon } from "@/components/ui/icons";

/** Which of the three visual treatments a category's items use — every
 * shop's categories fall into one of these, whether it's a profile
 * name, a garage nameplate, or a crew name (same for backgrounds/
 * banners and frames), so one ItemTile handles every shop. */
export const CATEGORY_KIND: Record<StoreCategory, "text" | "background" | "ring"> = {
  name_color: "text",
  vehicle_name_color: "text",
  crew_name_color: "text",
  profile_background: "background",
  garage_backdrop: "background",
  crew_banner: "background",
  showcase_frame: "ring",
  crew_frame: "ring",
};

const STAGE = "absolute inset-0 flex items-center justify-center bg-[#0c0c0f] bg-[radial-gradient(80%_70%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]";

/** The item itself, shown as itself: the name in that color, the
 * background as a panel, the frame around a showcase. Name colors sit on
 * a fixed near-black stage in both themes, since several (silver,
 * chrome, white) vanish on a light card. */
export function ItemTile({ item, previewLabel }: { item: StoreItem; previewLabel: string }) {
  const kind = CATEGORY_KIND[item.category];
  if (kind === "background") {
    return <div className={`absolute inset-0 ${item.effectClassName ?? ""}`} style={{ backgroundImage: item.value }} />;
  }
  if (kind === "text") {
    return (
      <div className={`${STAGE} px-3`}>
        <StyledName item={item} className="truncate text-[1.125rem] font-bold tracking-[-0.02em]">
          {previewLabel}
        </StyledName>
      </div>
    );
  }
  return (
    <div className={STAGE}>
      <span className={`relative flex h-12 w-16 items-center justify-center rounded-[12px] bg-gradient-to-br from-neutral-600 to-neutral-900 ${item.value}`}>
        <WheelIcon className="h-5 w-5 text-white/70" />
      </span>
    </div>
  );
}
