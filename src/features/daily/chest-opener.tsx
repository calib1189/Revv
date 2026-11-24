"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { openStreakChestAction } from "@/features/daily/chest-actions";
import { equipItemAction } from "@/features/store/actions";
import { StyledName } from "@/features/store/look-preview";
import { getStoreItem, STORE_CATEGORY_LABELS, type StoreItem } from "@/lib/store/catalog";
import type { ChestTier } from "@/lib/streak/chest";
import { hapticLanding, hapticTierUp } from "@/lib/haptics";
import { CheckIcon } from "@/components/ui/icons";

const TIER_LABEL: Record<ChestTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** The colour of the light that bursts out: it tells you how good the
 * prize is a beat before you read it. */
const TIER_COLOR: Record<ChestTier, string> = {
  common: "#b8c0cc",
  uncommon: "#4ade80",
  rare: "#4ea8ff",
  epic: "#a78bfa",
  legendary: "#f5b93c",
};

const SHAKE_MS = 950;
const BURST_MS = 650;

type Prize = { tier: ChestTier; points: number; item: StoreItem | null };
type Phase = "shake" | "burst" | "reveal" | "error";

/** The chest itself: a box and a lid that come apart. Drawn rather than
 * an icon so the lid can fly off on its own. */
function ChestArt({ phase, color }: { phase: Phase | "idle"; color: string }) {
  const open = phase === "burst" || phase === "reveal";
  // Unique per chest: two on screen (the card and the open one) mustn't
  // share gradients, or the burst would glow in the other one's colour.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `chest-${name}-${uid}`;
  return (
    <svg viewBox="0 0 120 110" className="h-full w-full overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id("body")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b5491" />
          <stop offset="1" stopColor="#18213d" />
        </linearGradient>
        <linearGradient id={id("lid")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5672b8" />
          <stop offset="1" stopColor="#25345f" />
        </linearGradient>
        <linearGradient id={id("metal")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4f8bff" />
          <stop offset="0.5" stopColor="#eaf5ff" />
          <stop offset="1" stopColor="#4f8bff" />
        </linearGradient>
        <radialGradient id={id("inside")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* What's inside, pouring light out of the open top. */}
      <ellipse
        cx="60"
        cy="47"
        rx="52"
        ry="14"
        fill={`url(#${id("inside")})`}
        opacity={open ? 1 : 0}
        className="transition-opacity duration-150"
      />
      <g className={open ? "chest-body-sink" : ""}>
        <rect x="14" y="46" width="92" height="56" rx="10" fill={`url(#${id("body")})`} stroke="rgba(255,255,255,0.22)" />
        {/* Metal corners and a top rim catching the light. */}
        <path d="M14 58 V56 a10 10 0 0 1 10 -10 h6 v6 h-6 a4 4 0 0 0 -4 4 v2 Z" fill={`url(#${id("metal")})`} opacity="0.8" />
        <path d="M106 58 V56 a10 10 0 0 0 -10 -10 h-6 v6 h6 a4 4 0 0 1 4 4 v2 Z" fill={`url(#${id("metal")})`} opacity="0.8" />
        <rect x="18" y="47" width="84" height="2" rx="1" fill="rgba(255,255,255,0.28)" />
        <rect x="51" y="46" width="18" height="56" fill={`url(#${id("metal")})`} />
        <rect x="14" y="76" width="92" height="3" fill="rgba(0,0,0,0.25)" />
      </g>
      <g className={open ? "chest-lid-pop" : ""} style={{ transformOrigin: "60px 46px" }}>
        <path d="M10 46 Q10 16 60 16 Q110 16 110 46 Z" fill={`url(#${id("lid")})`} stroke="rgba(255,255,255,0.25)" />
        <path d="M22 30 Q40 21 60 21" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="51" y="16" width="18" height="30" fill={`url(#${id("metal")})`} />
        {/* The lock, lit from inside. */}
        <rect x="51" y="36" width="18" height="18" rx="4" fill="#f2f8ff" stroke="#4f8bff" strokeWidth="2.5" />
        <circle cx="60" cy="44" r="2.6" fill="#2563eb" />
        <rect x="59" y="45" width="2" height="5" rx="1" fill="#2563eb" />
      </g>
    </svg>
  );
}

/** Sparks thrown out when it bursts, in the prize's colour. */
const SPARKS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.17;
  const distance = 110 + ((i * 37) % 70);
  return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance - 20, size: 4 + (i % 3) * 2, delay: (i % 4) * 25 };
});

/** How the prize looks on you: your name in the colour, a profile panel
 * in the background, your picture in the frame. */
function PrizePreview({ item, username, avatarUrl }: { item: StoreItem; username: string; avatarUrl: string | null }) {
  if (item.category === "name_color") {
    return (
      <p className="text-[1.75rem] font-bold tracking-[-0.02em]">
        <StyledName item={item}>@{username}</StyledName>
      </p>
    );
  }
  if (item.category === "profile_background") {
    return (
      <span
        className="block h-28 w-56 rounded-[18px] ring-1 ring-white/15"
        style={{ background: item.value }}
        aria-hidden
      />
    );
  }
  return (
    <span className={`relative block h-24 w-24 rounded-full ${item.value}`}>
      <span className="relative block h-full w-full overflow-hidden rounded-full bg-white/10">
        {avatarUrl && <Image src={avatarUrl} alt="" fill sizes="96px" className="object-cover" />}
      </span>
    </span>
  );
}

function ChestOverlay({
  chestDate,
  username,
  avatarUrl,
  onClose,
}: {
  chestDate: string;
  username: string;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("shake");
  const [prize, setPrize] = useState<Prize | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wearing, setWearing] = useState(false);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shakeDone = new Promise<void>((resolve) => {
      if (reduce) return resolve();
      // A tap on each big wobble.
      for (const at of [120, 420, 720]) window.setTimeout(hapticTierUp, at);
      window.setTimeout(resolve, SHAKE_MS);
    });
    void Promise.all([openStreakChestAction(chestDate), shakeDone]).then(([result]) => {
      if (result.error !== null) {
        setError(result.error);
        setPhase("error");
        return;
      }
      setPrize({ tier: result.tier, points: result.points, item: result.itemId ? (getStoreItem(result.itemId) ?? null) : null });
      hapticLanding();
      if (reduce) {
        setPhase("reveal");
        return;
      }
      setPhase("burst");
      window.setTimeout(() => setPhase("reveal"), BURST_MS);
    });
  }, [chestDate]);

  const color = prize ? TIER_COLOR[prize.tier] : "#7cc4ff";

  function wear(item: StoreItem) {
    startTransition(async () => {
      const result = await equipItemAction(item.category, item.id);
      if (!result.error) setWearing(true);
      else setError(result.error);
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Streak chest"
      data-no-edge-swipe
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden bg-black/85 px-6 text-white backdrop-blur-md"
    >
      <div className="relative flex w-full max-w-sm flex-col items-center">
      {/* The light that bursts out of the chest, in the prize's tier
          colour. Anchored on the chest itself (h-44: its centre is 88px
          down), fading out well before the edges of the screen. */}
      {(phase === "burst" || phase === "reveal") && (
        <span aria-hidden className="pointer-events-none absolute left-1/2 top-[88px] h-0 w-0">
          {/* Light rays: burst in, then keep slowly turning behind the prize. */}
          <span className="chest-rays absolute left-0 top-0 h-[760px] w-[760px]">
            <span
              className="chest-rays-spin absolute inset-0"
              style={{
                background: `repeating-conic-gradient(from 0deg, color-mix(in srgb, ${color} 42%, transparent) 0deg 5deg, transparent 5deg 18deg)`,
                maskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.45) 18%, transparent 46%)",
                WebkitMaskImage: "radial-gradient(circle, #000 0%, rgba(0,0,0,0.45) 18%, transparent 46%)",
              }}
            />
          </span>
          <span
            className="chest-flash absolute left-0 top-0 h-48 w-48 rounded-full"
            style={{ background: `radial-gradient(circle, #fff 0%, ${color} 30%, transparent 70%)` }}
          />
          {SPARKS.map((s, i) => (
            <span
              key={i}
              className="chest-spark absolute left-0 top-0 rounded-full"
              style={
                {
                  width: s.size,
                  height: s.size,
                  background: i % 4 === 0 ? "#fff" : color,
                  boxShadow: `0 0 8px ${color}`,
                  animationDelay: `${s.delay}ms`,
                  "--spark-x": `${s.dx}px`,
                  "--spark-y": `${s.dy}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      )}

        <div
          className={`relative h-44 w-44 ${phase === "shake" ? "chest-shake" : ""} ${phase === "reveal" ? "chest-fade-out" : ""}`}
          style={{ filter: "drop-shadow(0 18px 40px rgba(37, 99, 235, 0.45))" }}
        >
          <ChestArt phase={phase} color={color} />
        </div>

        {phase === "shake" && <p className="mt-6 text-[0.9375rem] text-white/60">Opening…</p>}

        {phase === "error" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <p className="text-center text-[0.9375rem] text-white/80">{error}</p>
            <button type="button" onClick={onClose} className="pressable h-12 rounded-full bg-white/15 px-8 font-semibold">
              Close
            </button>
          </div>
        )}

        {phase === "reveal" && prize && (
          <div className="chest-prize-rise -mt-24 flex w-full flex-col items-center gap-4 text-center">
            <p className="text-[0.8125rem] font-bold uppercase tracking-[0.18em]" style={{ color }}>
              {TIER_LABEL[prize.tier]}
              {prize.item ? " · Streak exclusive" : ""}
            </p>
            {prize.item ? (
              <>
                <PrizePreview item={prize.item} username={username} avatarUrl={avatarUrl} />
                <div>
                  <p className="text-[1.375rem] font-bold tracking-[-0.02em]">{prize.item.name}</p>
                  <p className="mt-0.5 text-[0.875rem] text-white/60">
                    {STORE_CATEGORY_LABELS[prize.item.category]}. Can&apos;t be bought, only found in chests.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="numeral text-[4rem] font-bold leading-none" style={{ color }}>
                  +{prize.points}
                </p>
                <p className="text-[0.9375rem] text-white/70">points</p>
              </>
            )}
            {error && <p className="text-[0.8125rem] text-white/70">{error}</p>}
            <div className="mt-2 flex w-full flex-col gap-2">
              {prize.item && (
                <button
                  type="button"
                  disabled={pending || wearing}
                  onClick={() => prize.item && wear(prize.item)}
                  className="pressable flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[0.9375rem] font-semibold text-black disabled:opacity-80"
                >
                  {wearing ? (
                    <>
                      <CheckIcon className="h-4 w-4" /> Wearing it
                    </>
                  ) : (
                    "Wear it"
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`pressable h-12 w-full rounded-full text-[0.9375rem] font-semibold ${
                  prize.item ? "bg-white/12 text-white" : "bg-white text-black"
                }`}
              >
                {prize.item ? "Done" : "Nice"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** "Your chest is ready": a card that bobs until you tap it, then the
 * chest shakes, bursts open in the colour of what's inside, and shows you
 * what you got (and lets you wear it there and then). */
export function ChestOpener({
  chestDate,
  username,
  avatarUrl,
}: {
  chestDate: string;
  username: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  if (done) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pressable flex w-full items-center gap-3 rounded-[18px] bg-[#0d1830] p-3 text-left text-white ring-1 ring-[#4f8bff]/40"
      >
        <span className="chest-idle h-12 w-12 flex-shrink-0">
          <ChestArt phase="idle" color="#7cc4ff" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold">Your chest is ready</span>
          <span className="block text-[0.8125rem] text-white/65">Points or a streak-only cosmetic. Tap to open.</span>
        </span>
        <span className="flex-shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[0.8125rem] font-semibold text-black">
          Open
        </span>
      </button>
      {open &&
        createPortal(
          <ChestOverlay
            chestDate={chestDate}
            username={username}
            avatarUrl={avatarUrl}
            onClose={() => {
              setOpen(false);
              setDone(true);
              router.refresh();
            }}
          />,
          document.body,
        )}
    </>
  );
}
