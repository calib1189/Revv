export type StoreCategory =
  | "name_color"
  | "profile_background"
  | "showcase_frame"
  | "vehicle_name_color"
  | "garage_backdrop"
  | "crew_name_color"
  | "crew_banner"
  | "crew_frame";

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  name_color: "Name Color",
  profile_background: "Profile Background",
  showcase_frame: "Showcase Frame",
  vehicle_name_color: "Nameplate Color",
  garage_backdrop: "Garage Backdrop",
  crew_name_color: "Crew Name Color",
  crew_banner: "Crew Banner",
  crew_frame: "Crew Badge Frame",
};

export interface StoreItem {
  id: string;
  category: StoreCategory;
  name: string;
  price: number;
  /** *_name_color categories: a CSS color or gradient applied to text.
   *  *_background/*_banner categories: a CSS `background` value for a
   *  panel. *_frame categories: a className (defined in globals.css)
   *  applied as a ring — the whole effect, animation included, lives in
   *  the class for this category. */
  value: string;
  /** Epic-tier *_name_color / *_background / *_banner items only: an
   *  additional className (defined in globals.css) that layers a moving
   *  background-position animation (or, for Neon, a glow-pulse) on top
   *  of `value`. Kept separate from `value` because `value` alone still
   *  has to work as a plain static color/gradient — this field is the
   *  opt-in for the shimmer. */
  effectClassName?: string;
  /** Reserved for profiles.is_founder — never sold, never shown, never
   *  equippable by anyone else. Checked server-side in
   *  purchaseItemAction and every equip action, not just hidden from
   *  the UI: listStoreItemsByCategory's own filtering is the normal
   *  path, but a request naming the id directly still has to be
   *  rejected the same way an under-priced purchase would be. */
  founderOnly?: boolean;
}

/** A fixed, code-defined catalog — same relationship to
 * store_items_owned that the achievement catalog has to
 * user_achievements: a real, permanent list, not a database table.
 * Prices are looked up from here server-side (features/store/actions.ts),
 * never trusted from the client, so there's no way to buy an item for
 * less than its real price no matter what a request claims. */
const PROFILE_ITEMS: StoreItem[] = [
  // ---- Name colors ----
  // Every stop has to read on a near-black header: gradients shimmer
  // each stop across the letters, so one dark stop makes the name
  // vanish mid-sweep. Darkest stops sit around #8b5cf6/#ef4444
  // brightness, never navy, forest or near-black.
  // The solid colors are lit like paint on a panel: a bright top edge
  // falling into the base color, so even the 50-point ones read as
  // metallic rather than flat type.
  { id: "name_ice", category: "name_color", name: "Ice Blue", price: 50, value: "linear-gradient(180deg, #e0f4ff, #7dd3fc 45%, #38bdf8)" },
  { id: "name_emerald", category: "name_color", name: "Emerald", price: 50, value: "linear-gradient(180deg, #d1fae5, #4ade80 45%, #22c55e)" },
  { id: "name_violet", category: "name_color", name: "Violet", price: 75, value: "linear-gradient(180deg, #ede9fe, #c4b5fd 45%, #a78bfa)" },
  { id: "name_gold", category: "name_color", name: "Gold", price: 100, value: "linear-gradient(180deg, #fff3c4, #fcd34d 40%, #f59e0b 78%, #fbbf24)" },
  { id: "name_pink", category: "name_color", name: "Hot Pink", price: 100, value: "linear-gradient(180deg, #fde2f1, #f9a8d4 45%, #f472b6)" },
  {
    id: "name_chrome",
    category: "name_color",
    name: "Chrome",
    price: 150,
    value: "linear-gradient(120deg, #e4e4e7, #fafafa, #a1a1aa, #f4f4f5)",
  },
  {
    id: "name_royal",
    category: "name_color",
    name: "Royal",
    price: 160,
    value: "linear-gradient(120deg, #4f6fe0, #fbbf24, #4f6fe0)",
  },
  {
    id: "name_titanium",
    category: "name_color",
    name: "Titanium",
    price: 220,
    value:
      "linear-gradient(90deg, #8b8b94, #c4c4cc, #f4f4f5, #a1a1aa, #8b8b94, #c4c4cc, #8b8b94)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_toxic",
    category: "name_color",
    name: "Toxic",
    price: 200,
    value: "linear-gradient(90deg, #22c55e, #a3e635, #4ade80, #a3e635, #22c55e)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_inferno",
    category: "name_color",
    name: "Inferno",
    price: 240,
    value: "linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #f97316, #ef4444)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_holographic",
    category: "name_color",
    name: "Holographic",
    price: 380,
    value:
      "linear-gradient(90deg, #f472b6, #a78bfa, #38bdf8, #4ade80, #fbbf24, #f472b6, #a78bfa)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_carbon",
    category: "name_color",
    name: "Carbon Fiber",
    price: 140,
    // Same layered-weave technique as bg_carbon and frame_carbon, just a
    // tighter period so the weave still reads at text size.
    value:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 1px, transparent 1px, transparent 6px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.3) 0px, rgba(0,0,0,0.3) 2px, transparent 2px, transparent 6px), repeating-linear-gradient(45deg, #a1a1aa 0px, #a1a1aa 3px, #63636b 3px, #63636b 6px)",
  },
  {
    id: "name_bronze",
    category: "name_color",
    name: "Bronze",
    price: 70,
    value: "linear-gradient(120deg, #b07a45, #c98a52, #e8b989, #c98a52, #b07a45)",
  },
  {
    id: "name_neon",
    category: "name_color",
    name: "Neon",
    price: 90,
    value: "#22d3ee",
    effectClassName: "text-neon-pulse",
  },
  {
    id: "name_cosmic",
    category: "name_color",
    name: "Cosmic",
    price: 200,
    value: "linear-gradient(90deg, #8b5cf6, #a78bfa, #e9d5ff, #a78bfa, #8b5cf6, #c4b5fd, #8b5cf6)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_aurora",
    category: "name_color",
    name: "Aurora",
    price: 280,
    value: "linear-gradient(90deg, #0f766e, #22d3ee, #4ade80, #22d3ee, #0f766e)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_diamond",
    category: "name_color",
    name: "Diamond",
    price: 420,
    value:
      "linear-gradient(90deg, #6bc4ea, #ffffff, #bff4ff, #7dd3fc, #ffffff, #a5f3fc, #ffffff, #6bc4ea)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_legendary",
    category: "name_color",
    name: "Legendary",
    price: 550,
    value: "linear-gradient(90deg, #f59e0b, #fbbf24, #ef4444, #d946ef, #f59e0b, #fbbf24)",
    effectClassName: "text-shimmer-anim",
  },
  { id: "name_ruby", category: "name_color", name: "Ruby", price: 110, value: "linear-gradient(180deg, #ff9ab8, #ff3d78 45%, #e0115f)" },
  // ---- Car-culture name colors ----
  {
    id: "name_redline",
    category: "name_color",
    name: "Redline",
    price: 120,
    // Brake-light red that kicks twice every few seconds, like a motor
    // bouncing off the rev limiter.
    value: "#ff3b30",
    effectClassName: "text-redline-glow",
  },
  {
    id: "name_candy",
    category: "name_color",
    name: "Candy Apple",
    price: 130,
    // Deep candy red with a bright flake catching the light as it passes.
    value: "linear-gradient(90deg, #f43f5e, #ff6b81, #ffd1d9, #ff6b81, #f43f5e, #fb7185, #f43f5e)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_pearl",
    category: "name_color",
    name: "Pearl White",
    price: 180,
    // Tri-coat pearl: white with pink, mint and blue hiding in the flake.
    value: "linear-gradient(90deg, #f4f4f5, #fce7f3, #ffffff, #d1fae5, #f4f4f5, #dbeafe, #ffffff, #f4f4f5)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_nitrous",
    category: "name_color",
    name: "Nitrous",
    price: 240,
    // The blue-white of a purge cloud.
    value: "linear-gradient(90deg, #60a5fa, #93c5fd, #e0f2fe, #ffffff, #93c5fd, #3b82f6, #60a5fa)",
    effectClassName: "text-shimmer-anim",
  },
  {
    id: "name_chameleon",
    category: "name_color",
    name: "Chameleon",
    price: 320,
    // Color-flip paint: purple to teal to gold depending on the angle,
    // swinging back and forth instead of looping one way.
    value: "linear-gradient(90deg, #a78bfa, #818cf8, #22d3ee, #34d399, #fcd34d, #34d399, #22d3ee, #818cf8, #a78bfa)",
    effectClassName: "text-flip-anim",
  },
  {
    id: "name_founder",
    category: "name_color",
    name: "Founder",
    price: 0,
    // No black stops: the shimmer sweeps every stop across the letters,
    // and a black one made the name vanish on dark and red headers.
    value: "linear-gradient(90deg, #ff4433, #ff8a3d, #fbbf24, #ffe4a8, #fbbf24, #ff8a3d, #ff4433)",
    effectClassName: "text-shimmer-anim",
    founderOnly: true,
  },

  // ---- Profile backgrounds ----
  {
    id: "bg_midnight",
    category: "profile_background",
    name: "Midnight",
    price: 60,
    // A cold glow off one corner, like a streetlight over a lot at 2am.
    value:
      "radial-gradient(110% 80% at 85% 0%, rgba(99,102,241,0.38), transparent 60%), radial-gradient(70% 60% at 0% 30%, rgba(56,189,248,0.14), transparent 70%), linear-gradient(160deg, #0b1023, #1e1b4b)",
  },
  {
    id: "bg_sunset",
    category: "profile_background",
    name: "Sunset",
    price: 90,
    // Golden hour: a low sun burning through dusk, high in the panel
    // since profile backgrounds fade out toward the bottom.
    value:
      "radial-gradient(70% 55% at 70% 30%, rgba(253,186,116,0.6), transparent 70%), linear-gradient(180deg, #2a0f2e, #7c1d3f 45%, #c2410c 85%, #9a3412)",
  },
  {
    id: "bg_racing",
    category: "profile_background",
    name: "Racing Stripes",
    price: 120,
    // Two thick vertical stripes down the middle — classic Shelby/GT
    // livery — rather than the old thin repeating diagonal pattern.
    value:
      "linear-gradient(90deg, #18181b 0%, #18181b 40%, #ff4433 40%, #ff4433 48%, #18181b 48%, #18181b 52%, #ff4433 52%, #ff4433 60%, #18181b 60%, #18181b 100%)",
  },
  {
    id: "bg_carbon",
    category: "profile_background",
    name: "Carbon Fiber",
    price: 150,
    // Three layered diagonal gradients (a light sheen, a dark cross-hatch,
    // and the base weave) rather than one flat diagonal stripe — reads as
    // an actual woven twill instead of a candy-cane pattern.
    value:
      "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 4px, transparent 4px, transparent 8px), repeating-linear-gradient(45deg, #26262a 0px, #26262a 4px, #131315 4px, #131315 8px)",
  },
  {
    id: "bg_cosmic",
    category: "profile_background",
    name: "Cosmic",
    price: 250,
    // Scattered stars over the nebula, so it reads as space, not a purple wash.
    value:
      "radial-gradient(1.5px 1.5px at 12% 18%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 28% 42%, #e9d5ff 50%, transparent 51%), radial-gradient(1.5px 1.5px at 46% 12%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 63% 34%, #fff 50%, transparent 51%), radial-gradient(2px 2px at 81% 20%, #f5f3ff 50%, transparent 51%), radial-gradient(1px 1px at 90% 48%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 8% 58%, #c4b5fd 50%, transparent 51%), radial-gradient(1.5px 1.5px at 37% 66%, #fff 50%, transparent 51%), radial-gradient(1px 1px at 72% 62%, #fff 50%, transparent 51%), linear-gradient(160deg, #2e1065, #7c3aed, #4c1d95, #0a0a0b)",
  },
  {
    id: "bg_velocity",
    category: "profile_background",
    name: "Velocity",
    price: 220,
    value:
      "repeating-linear-gradient(115deg, #18181b 0px, #18181b 40px, #ff8800 40px, #ff8800 46px, #18181b 46px, #18181b 86px)",
    effectClassName: "bg-velocity-anim",
  },
  {
    id: "bg_chrome_flow",
    category: "profile_background",
    name: "Chrome Flow",
    price: 260,
    // Exactly 90deg (perfectly horizontal), not an angle — bg-chrome-flow-anim
    // seamlessly tiles by panning background-position on the X axis alone;
    // any angled gradient varies by Y too, so wrapping the pan produces a
    // visible diagonal seam where the loop restarts. Horizontal is the only
    // angle this specific animation technique can loop with no seam at all.
    value: "linear-gradient(90deg, #18181b, #71717a, #f4f4f5, #71717a, #18181b, #a1a1aa, #18181b)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_inferno",
    category: "profile_background",
    name: "Inferno",
    price: 280,
    value: "linear-gradient(200deg, #1c0a00, #7f1d1d, #f97316, #fbbf24, #7f1d1d, #1c0a00)",
    effectClassName: "bg-inferno-anim",
  },
  {
    id: "bg_aurora",
    category: "profile_background",
    name: "Aurora",
    price: 320,
    value:
      "linear-gradient(120deg, #041016, #0f766e, #22d3ee, #4ade80, #0f766e, #041016, #7c3aed)",
    effectClassName: "bg-aurora-anim",
  },
  {
    id: "bg_galaxy",
    category: "profile_background",
    name: "Galaxy",
    price: 380,
    value:
      "conic-gradient(from var(--rank-angle, 0deg) at 50% 50%, #0a0a1f, #2e1065, #7c3aed, #1e3a8a, #0a0a1f, #4c1d95, #0a0a1f)",
    effectClassName: "bg-galaxy-anim",
  },
  {
    id: "bg_bronze",
    category: "profile_background",
    name: "Bronze",
    price: 130,
    value: "linear-gradient(160deg, #2b1a0d, #7c4a1e, #c98a52, #3a2412)",
  },
  {
    id: "bg_gold",
    category: "profile_background",
    name: "Gold",
    price: 150,
    value: "linear-gradient(160deg, #3a2c05, #b8860b, #fbbf24, #fff4c2, #b8860b)",
  },
  {
    id: "bg_neon",
    category: "profile_background",
    name: "Neon",
    price: 190,
    // A lit tube across the top, glowing onto dark tile.
    value:
      "linear-gradient(180deg, transparent 21%, rgba(165,243,252,0.95) 21.6%, rgba(34,211,238,0.9) 22.4%, transparent 23%), radial-gradient(80% 28% at 50% 22%, rgba(34,211,238,0.35), transparent 70%), linear-gradient(160deg, #041016, #0e2a30, #041016)",
    effectClassName: "bg-neon-pulse",
  },
  {
    id: "bg_toxic",
    category: "profile_background",
    name: "Toxic",
    price: 230,
    value: "linear-gradient(160deg, #052e16, #14532d, #a3e635, #4ade80, #14532d, #052e16)",
    effectClassName: "bg-inferno-anim",
  },
  {
    id: "bg_titanium",
    category: "profile_background",
    name: "Titanium",
    price: 250,
    // Heat-blued titanium (the anodized tint on a titanium exhaust tip)
    // instead of plain brushed-metal grays — a lot more premium and a
    // direct, recognizable car-culture reference, not just a flat gray
    // sweep.
    // 90deg exactly (see bg_chrome_flow's comment) so the pan loop has no seam.
    value:
      "linear-gradient(90deg, #14161c, #3c4656, #6b5b95, #93a8c2, #6b5b95, #3c4656, #14161c)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_diamond",
    category: "profile_background",
    name: "Diamond",
    price: 420,
    // Pure #ffffff at the peak used to sweep across as a stark white
    // flash against the dark UI — replaced with a pale ice-blue so the
    // highlight still reads as a sparkle without blowing out.
    // 90deg exactly (see bg_chrome_flow's comment) so the pan loop has no seam.
    value: "linear-gradient(90deg, #0a1520, #2a6f8f, #a8e6f5, #e4faff, #a8e6f5, #2a6f8f, #0a1520)",
    effectClassName: "bg-chrome-flow-anim",
  },
  {
    id: "bg_ruby",
    category: "profile_background",
    name: "Ruby",
    price: 480,
    // Near-black bookends swelling into a saturated, almost-neon red
    // core — the gemstone's own glint, not a flat red wash. Positioned
    // just above Diamond in price, matching Ruby's own spot one rung
    // above Diamond on the rank ladder (lib/rating/rank.ts).
    value: "linear-gradient(150deg, #1a0004, #5c0014, #ff0a2e, #ff4d6d, #ff0a2e, #5c0014, #1a0004)",
    effectClassName: "bg-ruby-anim",
  },
  {
    id: "bg_legendary",
    category: "profile_background",
    name: "Legendary",
    price: 550,
    value: "linear-gradient(150deg, #1c0a00, #451a03, #fbbf24, #ef4444, #a21caf, #1c0a00)",
    effectClassName: "bg-inferno-anim",
  },
  // ---- Car-culture backgrounds ----
  {
    id: "bg_checkered",
    category: "profile_background",
    name: "Checkered Flag",
    price: 110,
    // Muted checks rather than black and white, so a name still reads on top.
    value:
      "linear-gradient(180deg, rgba(10,10,11,0) 0%, rgba(10,10,11,0.75) 100%), repeating-conic-gradient(#3f3f46 0 25%, #141416 0 50%)",
    effectClassName: "bg-checker",
  },
  {
    id: "bg_track_day",
    category: "profile_background",
    name: "Track Day",
    price: 140,
    // A red-and-white kerb along the top edge over asphalt.
    value:
      "repeating-linear-gradient(120deg, #dc2626 0 18px, #f4f4f5 18px 36px), linear-gradient(#f4f4f5, #f4f4f5), radial-gradient(90% 60% at 50% 0%, rgba(255,255,255,0.08), transparent 70%), linear-gradient(180deg, #2a2a2e, #18181b)",
    effectClassName: "bg-kerb",
  },
  {
    id: "bg_redline",
    category: "profile_background",
    name: "Redline",
    price: 180,
    // A tach face: the tick arc with the red zone glowing at the top of
    // the sweep, flaring when the needle hits it.
    value:
      "radial-gradient(55% 60% at 88% 8%, rgba(255,42,42,0.55), transparent 70%), radial-gradient(circle at 50% 135%, #0d0b0c 0 58%, transparent 58.3% 64%, #0d0b0c 64.3%), repeating-conic-gradient(from 0deg at 50% 135%, rgba(255,255,255,0.32) 0deg 0.5deg, transparent 0.5deg 4deg), linear-gradient(#0d0b0c, #0d0b0c)",
    effectClassName: "bg-redline-anim",
  },
  {
    id: "bg_candy",
    category: "profile_background",
    name: "Candy Apple",
    price: 170,
    // Candy red over metal flake, with a slow highlight rolling across.
    value:
      "linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.18) 50%, transparent 65%), radial-gradient(rgba(255,220,226,0.14) 0.5px, transparent 0.9px), radial-gradient(rgba(255,255,255,0.1) 0.5px, transparent 0.9px), linear-gradient(155deg, #2a0007, #8a0018, #d1102b, #8a0018, #2a0007)",
    effectClassName: "bg-candy-anim",
  },
  {
    id: "bg_night_meet",
    category: "profile_background",
    name: "Night Meet",
    price: 210,
    // A lot after dark: sodium lamps, someone's pink underglow, a blue
    // headlight, drifting slowly as cars roll in.
    value:
      "radial-gradient(38% 32% at 20% 38%, rgba(255,159,64,0.68), transparent 70%), radial-gradient(34% 30% at 78% 30%, rgba(236,72,153,0.58), transparent 70%), radial-gradient(26% 22% at 52% 55%, rgba(56,189,248,0.48), transparent 70%), linear-gradient(180deg, #07070c, #12101c 60%, #1a1220)",
    effectClassName: "bg-nightmeet-anim",
  },
  {
    id: "bg_tunnel",
    category: "profile_background",
    name: "Tunnel Run",
    price: 260,
    // Sodium lights streaking overhead, flat out through a tunnel.
    value:
      "radial-gradient(28% 34% at 50% 50%, #fff1d6 0 35%, rgba(255,179,71,0.85) 55%, transparent 100%), radial-gradient(40% 50% at 50% 50%, rgba(255,170,60,0.28), transparent 100%), radial-gradient(120% 45% at 50% 14%, rgba(255,140,40,0.42), transparent 70%), linear-gradient(180deg, #24160a, #0f0a07 55%, #050403)",
    effectClassName: "bg-tunnel-anim",
  },
  {
    id: "bg_nitrous",
    category: "profile_background",
    name: "Nitrous",
    price: 290,
    // A blue purge blasting in from the left, streaks and all.
    value:
      "radial-gradient(50% 7% at 50% 50%, rgba(219,234,254,0.55), transparent), radial-gradient(50% 5% at 50% 50%, rgba(191,219,254,0.4), transparent), radial-gradient(60% 45% at 0% 35%, rgba(224,242,254,0.55), transparent 70%), radial-gradient(120% 75% at 0% 35%, rgba(59,130,246,0.6), transparent 65%), linear-gradient(160deg, #020617, #0b1e4a 55%, #020617)",
    effectClassName: "bg-nitrous-anim",
  },
  {
    id: "bg_chameleon",
    category: "profile_background",
    name: "Chameleon",
    price: 360,
    value: "linear-gradient(120deg, #12061f, #6d28d9, #2563eb, #0891b2, #10b981, #0891b2, #2563eb, #6d28d9, #12061f)",
    effectClassName: "bg-flip-anim",
  },
  {
    id: "bg_founder",
    category: "profile_background",
    name: "Founder",
    price: 0,
    // 90deg exactly (see bg_chrome_flow's comment) so the pan loop has no seam.
    value: "linear-gradient(90deg, #050505, #1a0000, #450a0a, #1a0000, #050505)",
    effectClassName: "bg-chrome-flow-anim",
    founderOnly: true,
  },

  // ---- Showcase frames ----
  { id: "frame_bronze", category: "showcase_frame", name: "Bronze Ring", price: 40, value: "frame-bronze-ring" },
  { id: "frame_neon", category: "showcase_frame", name: "Neon Ring", price: 100, value: "frame-neon-ring" },
  { id: "frame_gold", category: "showcase_frame", name: "Gold Ring", price: 140, value: "frame-gold-ring" },
  { id: "frame_inferno", category: "showcase_frame", name: "Inferno Ring", price: 220, value: "frame-inferno-ring" },
  { id: "frame_prism", category: "showcase_frame", name: "Prism Ring", price: 300, value: "frame-prism-ring" },
  { id: "frame_aurora", category: "showcase_frame", name: "Aurora Ring", price: 340, value: "frame-aurora-ring" },
  { id: "frame_diamond", category: "showcase_frame", name: "Diamond Ring", price: 420, value: "frame-diamond-ring" },
  {
    id: "frame_legendary",
    category: "showcase_frame",
    name: "Legendary Ring",
    price: 550,
    value: "frame-legendary-ring",
  },
  { id: "frame_carbon", category: "showcase_frame", name: "Carbon Ring", price: 90, value: "frame-carbon-ring" },
  { id: "frame_toxic", category: "showcase_frame", name: "Toxic Ring", price: 230, value: "frame-toxic-ring" },
  {
    id: "frame_titanium",
    category: "showcase_frame",
    name: "Titanium Ring",
    price: 180,
    value: "frame-titanium-ring",
  },
  { id: "frame_cosmic", category: "showcase_frame", name: "Cosmic Ring", price: 180, value: "frame-cosmic-ring" },
  { id: "frame_checkered", category: "showcase_frame", name: "Checkered Ring", price: 120, value: "frame-checkered-ring" },
  { id: "frame_candy", category: "showcase_frame", name: "Candy Ring", price: 150, value: "frame-candy-ring" },
  { id: "frame_redline", category: "showcase_frame", name: "Redline Ring", price: 240, value: "frame-redline-ring" },
  { id: "frame_nitrous", category: "showcase_frame", name: "Nitrous Ring", price: 280, value: "frame-nitrous-ring" },
  { id: "frame_chameleon", category: "showcase_frame", name: "Chameleon Ring", price: 360, value: "frame-chameleon-ring" },
  {
    id: "frame_founder",
    category: "showcase_frame",
    name: "Founder Ring",
    price: 0,
    value: "frame-founder-ring",
    founderOnly: true,
  },
];

const PROFILE_ITEM_BY_ID = new Map(PROFILE_ITEMS.map((item) => [item.id, item]));

/** Re-packages an existing profile-scope item's visual (value +
 * effectClassName + founderOnly) under a new id/category for the
 * garage and crew shops — same look, same exclusivity, different slot.
 * Keeps the CSS/gradients defined exactly once above instead of
 * re-typing every color string per shop; throws at module load (not
 * silently) if a theme id is ever wrong, since that's a real bug in
 * this file, not user input. */
function deriveItem(sourceId: string, newId: string, category: StoreCategory): StoreItem {
  const source = PROFILE_ITEM_BY_ID.get(sourceId);
  if (!source) throw new Error(`lib/store/catalog: unknown source item "${sourceId}"`);
  return {
    id: newId,
    category,
    name: source.name,
    price: source.price,
    value: source.value,
    effectClassName: source.effectClassName,
    founderOnly: source.founderOnly,
  };
}

/** Every theme below has a complete name/background/frame trio already
 * built for the profile shop — reused as-is (same colors, same
 * animations) for the garage and crew shops rather than inventing a
 * second wardrobe of colors. Pattern-only profile items (Midnight,
 * Sunset, Racing Stripes, Velocity, Chrome, Royal, Ice/Emerald/Violet/
 * Pink, Holographic, Prism, Pearl White, Checkered Flag, Track Day,
 * Night Meet, Tunnel Run) don't have a full trio and are deliberately
 * left as profile-only. */
const MATERIAL_THEMES = [
  "carbon",
  "bronze",
  "gold",
  "neon",
  "toxic",
  "titanium",
  "cosmic",
  "aurora",
  "diamond",
  "legendary",
  "inferno",
  "redline",
  "candy",
  "nitrous",
  "chameleon",
  "founder",
] as const;

const GARAGE_ITEMS: StoreItem[] = [
  ...MATERIAL_THEMES.flatMap((theme) => [
    deriveItem(`name_${theme}`, `vname_${theme}`, "vehicle_name_color"),
    deriveItem(`bg_${theme}`, `gbackdrop_${theme}`, "garage_backdrop"),
  ]),
  // Ruby only ever had a name color (NAME_COLOR_ONLY_THEMES below) —
  // this is its garage backdrop, added on its own rather than promoting
  // ruby into MATERIAL_THEMES, since that loop also derives a crew_frame
  // from frame_ruby, which doesn't exist and isn't part of this ask.
  deriveItem("bg_ruby", "gbackdrop_ruby", "garage_backdrop"),
];

const CREW_ITEMS: StoreItem[] = MATERIAL_THEMES.flatMap((theme) => [
  deriveItem(`name_${theme}`, `cname_${theme}`, "crew_name_color"),
  deriveItem(`bg_${theme}`, `cbanner_${theme}`, "crew_banner"),
  deriveItem(`frame_${theme}`, `cframe_${theme}`, "crew_frame"),
]);

/** Themes that only need the name-color slot everywhere (no matching
 * background/frame requested) — same deriveItem reuse as
 * MATERIAL_THEMES, just for the one category instead of a full trio. */
const NAME_COLOR_ONLY_THEMES = ["ruby"] as const;

const NAME_COLOR_ONLY_ITEMS: StoreItem[] = NAME_COLOR_ONLY_THEMES.flatMap((theme) => [
  deriveItem(`name_${theme}`, `vname_${theme}`, "vehicle_name_color"),
  deriveItem(`name_${theme}`, `cname_${theme}`, "crew_name_color"),
]);

export const STORE_ITEMS: StoreItem[] = [
  ...PROFILE_ITEMS,
  ...GARAGE_ITEMS,
  ...CREW_ITEMS,
  ...NAME_COLOR_ONLY_ITEMS,
];

const STORE_ITEM_BY_ID = new Map(STORE_ITEMS.map((item) => [item.id, item]));

export function getStoreItem(id: string): StoreItem | undefined {
  return STORE_ITEM_BY_ID.get(id);
}

/** `includeFounderOnly` defaults to false so every existing call site
 * (the vast majority of them) automatically excludes founder-exclusive
 * items without having to know that concept exists — a caller has to
 * deliberately opt in (after checking the viewer's own
 * profiles.is_founder) to ever see one listed. This is the display
 * side of the exclusivity; purchaseItemAction and the equip actions
 * separately enforce it server-side regardless of what the UI shows. */
export function listStoreItemsByCategory(
  category: StoreCategory,
  { includeFounderOnly = false }: { includeFounderOnly?: boolean } = {},
): StoreItem[] {
  return STORE_ITEMS.filter(
    (item) => item.category === category && (includeFounderOnly || !item.founderOnly),
  );
}
