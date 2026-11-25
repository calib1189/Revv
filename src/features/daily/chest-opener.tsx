"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { openStreakChestAction, type OpenChestResult } from "@/features/daily/chest-actions";
import { equipItemAction } from "@/features/store/actions";
import { StyledName } from "@/features/store/look-preview";
import { getStoreItem, STORE_CATEGORY_LABELS, type StoreItem } from "@/lib/store/catalog";
import type { ChestTier } from "@/lib/streak/chest";
import { hapticLanding, hapticSnap, hapticTierUp } from "@/lib/haptics";
import { CheckIcon, GarageIcon, WheelIcon } from "@/components/ui/icons";
import { GarageScene, hexToRgb, type GarageLayout } from "@/features/daily/garage-scene";

/*
 * The streak's seventh-day reward, opened as a garage (garage-scene.ts
 * renders it). A building at night: the SORZA sign comes on over the
 * door, you open it, and it rises at an opener's pace while the light
 * inside spills out across the driveway. The prize is in there, revealed
 * by the door as it goes up. Under the hood it's still a "chest"
 * (streak_chests, lib/streak/chest.ts).
 */

const TIER_LABEL: Record<ChestTier, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  epic: "Epic",
  legendary: "Legendary",
};

/** The colour of the strip lighting inside: how good the prize is, a
 * beat before you read it. */
const TIER_COLOR: Record<ChestTier, string> = {
  common: "#c4ccd8",
  uncommon: "#4ade80",
  rare: "#4ea8ff",
  epic: "#a78bfa",
  legendary: "#f5b93c",
};

/** The scene fades up, then the sign comes on. */
const FADE_MS = 1100;
const SIGN_AT = 1050;
const SIGN_MS = 650;
const READY_AT = 1900;
/** The opener engaging, then the door's travel. */
const MOTOR_MS = 350;
const TRAVEL_MS = 3300;
const PUSH_MS = 4300;
/** Where the prize hangs in the doorway, from the top, or for one that
 * stands, where the floor it stands on is. */
const PRIZE_AT = 0.66;
const PRIZE_FLOOR = 0.9;

type Prize = { tier: ChestTier; points: number; item: StoreItem | null };
type Stage = "intro" | "ready" | "opening" | "reveal" | "error";

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
/** A door opener's travel: it spins up, runs steady, and slows into the top. */
function travel(p: number) {
  const a = 0.14;
  const d = 0.24;
  const v = 1 / (1 - a / 2 - d / 2);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (p < a) return (v * p * p) / (2 * a);
  if (p < 1 - d) return v * (a / 2 + (p - a));
  const q = 1 - p;
  return 1 - (v * q * q) / (2 * d);
}
function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Prizes shown as things standing on the garage floor (with a
 * reflection under them), rather than floating in the doorway. */
function standsOnFloor(prize: Prize) {
  return prize.item?.category === "profile_background" || prize.item?.category === "showcase_frame";
}

/** The prize, in the garage. Points and name colours hang in the light;
 * a background or ring is shown the way it looks in the app, on a panel
 * standing on the floor and lit like everything else in there. */
function PrizeHero({ prize, color, username, avatarUrl }: { prize: Prize; color: string; username: string; avatarUrl: string | null }) {
  const item = prize.item;
  if (!item) {
    return (
      <p
        className="numeral text-[5rem] font-bold leading-none tracking-[-0.05em] text-white"
        style={{ textShadow: `0 0 34px ${rgba(color, 0.55)}, 0 6px 24px rgba(0,0,0,0.6)` }}
      >
        +{prize.points}
      </p>
    );
  }
  if (item.category === "name_color") {
    return (
      <p className="max-w-[80vw] truncate px-2 text-[2.1rem] font-bold tracking-[-0.03em]" style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.6))" }}>
        <StyledName item={item}>@{username}</StyledName>
      </p>
    );
  }
  // The room's light on a panel: the honeycomb's sheen across the top,
  // the strip's colour along the bottom edge.
  const lit = {
    boxShadow: `0 0 0 1px rgba(255,255,255,0.07), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 ${rgba(color, 0.55)}`,
  };
  if (item.category === "profile_background") {
    // A profile header wearing it, as other people will see it.
    const initial = username.charAt(0).toUpperCase() || "S";
    return (
      <span className="relative block h-[118px] w-[208px] overflow-hidden rounded-[14px] bg-[#0c0c0f]" style={lit}>
        <span className={`absolute inset-0 ${item.effectClassName ?? ""}`} style={{ backgroundImage: item.value }} />
        <span className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/75 to-transparent" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),transparent_40%)]" />
        <span className="absolute bottom-2.5 left-3 right-3 flex min-w-0 items-center gap-2">
          <span className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15 text-[0.75rem] font-bold">
            {avatarUrl ? <Image src={avatarUrl} alt="" fill sizes="28px" className="object-cover" /> : initial}
          </span>
          <span className="min-w-0 truncate text-[0.875rem] font-bold tracking-[-0.01em]">@{username}</span>
        </span>
      </span>
    );
  }
  // A showcase ring goes round the badges pinned to your profile: shown
  // on the same tile the shop previews it with, at twice the size.
  return (
    <span className="block h-[112px] w-[144px] p-[3px]">
      <span
        className={`relative flex h-14 w-[4.5rem] origin-top-left scale-200 items-center justify-center rounded-[12px] bg-gradient-to-br from-neutral-600 to-neutral-900 ${item.value}`}
        style={lit}
      >
        <WheelIcon className="h-6 w-6 text-white/70" />
      </span>
    </span>
  );
}

export function GarageOverlay({
  chestDate,
  username,
  avatarUrl,
  onClose,
  openChest = openStreakChestAction,
}: {
  chestDate: string;
  username: string;
  avatarUrl: string | null;
  onClose: () => void;
  /** Swappable only so the scene can be previewed without spending a real garage. */
  openChest?: (chestDate: string) => Promise<OpenChestResult>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const prizeRef = useRef<Prize | null>(null);
  const failed = useRef(false);
  const started = useRef(false);
  const wantOpen = useRef(false);
  const [stage, setStage] = useState<Stage>("intro");
  const [prize, setPrize] = useState<Prize | null>(null);
  const [box, setBox] = useState<GarageLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wearing, setWearing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [pending, startTransition] = useTransition();

  // The prize: asked for once (opening it can't be repeated), while the
  // sign comes on, so it's there by the time you open the door.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void openChest(chestDate).then((result) => {
      if (result.error !== null) {
        failed.current = true;
        setError(result.error);
        setStage("error");
        return;
      }
      const p = { tier: result.tier, points: result.points, item: result.itemId ? (getStoreItem(result.itemId) ?? null) : null };
      prizeRef.current = p;
      setPrize(p);
    });
  }, [chestDate, openChest]);

  // The scene: baked once, then one animation loop with its state in refs.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const logo = new window.Image();
    const scene = new GarageScene(el, logo);
    let raf = 0;
    let bakeTimer = 0;
    let resizeTimer = 0;
    let alive = true;
    let t0 = 0; // when the scene was ready to show
    let openAt = 0;
    let stage: Stage = "intro";
    let tierSet = false;
    let nextTick = 0;

    const go = (next: Stage) => {
      stage = next;
      setStage(next);
    };
    const bake = () => {
      if (!alive) return;
      scene.prepare();
      setBox(scene.layout());
      if (!t0) t0 = performance.now();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!scene.ready || !t0) return;
      const p = prizeRef.current;
      if (p && !tierSet) {
        tierSet = true;
        scene.setTier(hexToRgb(TIER_COLOR[p.tier]));
      }
      const since = now - t0;
      let fade = easeOut(clamp(since / FADE_MS));
      let logoOn = easeInOut(clamp((since - SIGN_AT) / SIGN_MS));
      let open = 0;
      let lurch = 0;
      let push = 0;

      if (failed.current) {
        // Nothing to open; the scene stays as it is behind the message.
      } else if (reduce) {
        if (p && stage !== "reveal") go("reveal");
        if (stage === "reveal") {
          fade = 1;
          logoOn = 1;
          open = 1;
          push = 1;
        }
      } else {
        if (stage === "intro" && since > READY_AT) go("ready");
        if (stage === "ready" && wantOpen.current && p) {
          openAt = now;
          hapticSnap();
          go("opening");
        }
        if (stage === "opening" || stage === "reveal") {
          const run = now - openAt - MOTOR_MS;
          open = travel(clamp(run / TRAVEL_MS));
          // The opener's jolt as it takes the door's weight.
          if (run > 0 && run < 200) lurch = -1.2 * Math.sin((Math.PI * run) / 200);
          push = easeInOut(clamp((now - openAt) / PUSH_MS));
          if (stage === "opening") {
            if (run > 0 && now >= nextTick) {
              if (nextTick === 0) hapticTierUp();
              else hapticSnap();
              nextTick = now + 420;
            }
            if (run >= TRAVEL_MS) {
              hapticLanding();
              go("reveal");
            }
          }
        }
      }
      const zoom = 1 + 0.015 * easeOut(clamp(since / 6000)) + 0.085 * push;
      scene.draw({ fade, logo: logoOn, open, zoom, lurch });

      // The prize is inside: only what the door has cleared shows.
      const clip = clipRef.current;
      const hero = heroRef.current;
      const L = scene.layout();
      if (clip) {
        const [x0, y0] = scene.project(L.left, L.top + L.height * (1 - open), zoom);
        const [x1, y1] = scene.project(L.left + L.width, L.top + L.height, zoom);
        clip.style.clipPath = `inset(${y0}px ${window.innerWidth - x1}px ${window.innerHeight - y1}px ${x0}px)`;
      }
      if (hero) {
        const stand = hero.dataset.stand === "1";
        const [hx, hy] = scene.project(L.anchorX, L.top + L.height * (stand ? PRIZE_FLOOR : PRIZE_AT), zoom);
        hero.style.transform = `translate(${hx}px, ${hy}px) translate(-50%, ${stand ? "-100%" : "-50%"}) scale(${zoom})`;
      }
    };

    // Let the black overlay paint before the heavy bake.
    const start = () => {
      raf = requestAnimationFrame(() => {
        bakeTimer = window.setTimeout(bake, 30);
        raf = requestAnimationFrame(frame);
      });
    };
    logo.onload = start;
    logo.onerror = start;
    logo.src = "/logo-mark.png";

    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(bake, 160);
    };
    window.addEventListener("resize", onResize);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(bakeTimer);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      logo.onload = null;
      logo.onerror = null;
    };
  }, []);

  const color = prize ? TIER_COLOR[prize.tier] : "#ffffff";

  function wear(item: StoreItem) {
    startTransition(async () => {
      const result = await equipItemAction(item.category, item.id);
      if (!result.error) setWearing(true);
      else setError(result.error);
    });
  }

  function openDoor() {
    wantOpen.current = true;
    if (!prizeRef.current) setWaiting(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Streak garage"
      data-no-edge-swipe
      className="fixed inset-0 z-[80] select-none overflow-hidden bg-black text-white [-webkit-touch-callout:none]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />

      {/* The prize, inside the garage. */}
      {prize && box && (stage === "opening" || stage === "reveal") && (
        <div ref={clipRef} className="pointer-events-none absolute inset-0" style={{ clipPath: "inset(100% 0 0 0)" }}>
          {standsOnFloor(prize) ? (
            <div
              ref={heroRef}
              data-stand="1"
              className="absolute left-0 top-0 origin-bottom"
              style={{ transform: `translate(${box.anchorX}px, ${box.top + box.height * PRIZE_FLOOR}px) translate(-50%, -100%)` }}
            >
              <PrizeHero prize={prize} color={color} username={username} avatarUrl={avatarUrl} />
              {/* Its reflection in the epoxy floor. */}
              <div className="absolute left-0 top-full w-full opacity-25 [-webkit-mask-image:linear-gradient(to_bottom,#000,transparent_45%)] [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" aria-hidden>
                <div className="-scale-y-100">
                  <PrizeHero prize={prize} color={color} username={username} avatarUrl={avatarUrl} />
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={heroRef}
              className="absolute left-0 top-0"
              style={{ transform: `translate(${box.anchorX}px, ${box.top + box.height * PRIZE_AT}px) translate(-50%, -50%)` }}
            >
              <PrizeHero prize={prize} color={color} username={username} avatarUrl={avatarUrl} />
            </div>
          )}
        </div>
      )}

      {(stage === "intro" || stage === "ready") && (
        <p
          className="garage-copy-in absolute inset-x-0 top-[calc(env(safe-area-inset-top)+1.25rem)] text-center text-[0.6875rem] font-semibold uppercase tracking-[0.32em] text-white/45"
          style={{ animationDelay: "700ms" }}
        >
          Streak garage
        </p>
      )}

      {stage === "ready" && (
        <div className="garage-copy-in absolute inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+2.25rem)] mx-auto flex max-w-sm flex-col items-center gap-3">
          <button
            type="button"
            onClick={openDoor}
            disabled={waiting}
            className="pressable flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-white text-[0.9375rem] font-semibold text-black disabled:opacity-80"
          >
            <GarageIcon className="h-5 w-5" />
            {waiting ? "Opening" : "Open the garage"}
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="absolute inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+2.5rem)] flex flex-col items-center gap-4">
          <p className="text-center text-[0.9375rem] text-white/85">{error}</p>
          <button type="button" onClick={onClose} className="pressable h-12 rounded-full bg-white/15 px-8 font-semibold">
            Close
          </button>
        </div>
      )}

      {stage === "reveal" && prize && (
        <div className="absolute inset-x-6 bottom-[calc(env(safe-area-inset-bottom)+1.75rem)] mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="garage-copy-in text-[0.75rem] font-bold uppercase tracking-[0.3em]" style={{ color, animationDelay: "120ms" }}>
            {TIER_LABEL[prize.tier]}
            {prize.item ? " · Streak exclusive" : ""}
          </p>
          {prize.item ? (
            <div className="garage-copy-in" style={{ animationDelay: "200ms" }}>
              <p className="text-[2rem] font-bold leading-tight tracking-[-0.035em]">{prize.item.name}</p>
              <p className="mt-1 text-[0.875rem] text-white/60">
                {STORE_CATEGORY_LABELS[prize.item.category]}. Can&apos;t be bought, only found in streak garages.
              </p>
            </div>
          ) : (
            <div className="garage-copy-in" style={{ animationDelay: "200ms" }}>
              <p className="text-[2rem] font-bold leading-tight tracking-[-0.035em]">
                <span className="numeral">{prize.points}</span> points
              </p>
              <p className="mt-1 text-[0.875rem] text-white/60">Added to your balance.</p>
            </div>
          )}
          {error && <p className="text-[0.8125rem] text-white/70">{error}</p>}
          <div className="garage-copy-in mt-3 flex w-full flex-col gap-2" style={{ animationDelay: "300ms" }}>
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
                prize.item ? "bg-white/12 text-white backdrop-blur-md" : "bg-white text-black"
              }`}
            >
              {prize.item ? "Done" : "Nice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Your garage is ready": a card that opens the garage full screen (and
 * lets you wear what you got there and then). */
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
        className="pressable flex w-full items-center gap-3 rounded-[18px] bg-[linear-gradient(135deg,#111725,#0b0e16)] p-3 text-left text-white ring-1 ring-[#4f8bff]/35"
      >
        <span className="garage-idle relative flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#0a0d14] text-[#8fc0ff] ring-1 ring-white/10">
          <GarageIcon className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-semibold">Your garage is ready</span>
          <span className="block text-[0.8125rem] text-white/65">Points or a streak-only cosmetic. Tap to open.</span>
        </span>
        <span className="flex-shrink-0 rounded-full bg-white px-3.5 py-1.5 text-[0.8125rem] font-semibold text-black">Open</span>
      </button>
      {open &&
        createPortal(
          <GarageOverlay
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
