"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { TutorialShowcase } from "@/lib/tutorial/showcase";
import { RANK_LABELS, RANK_TEXT_COLORS, RANK_TIERS, rankForScore } from "@/lib/rating/rank";
import { RANK_ICON_SRC } from "@/features/garage/rank-material-icons";
import { SHOP_CATEGORIES } from "@/lib/shops/categories";
import { formatDateTime } from "@/lib/format/date";
import {
  CameraIcon,
  CheckIcon,
  CommentIcon,
  ExhaustIcon,
  PersonIcon,
  PinIcon,
  PlayIcon,
  SearchIcon,
  SuspensionIcon,
  UsersIcon,
  WheelIcon,
  HeartIcon,
} from "@/components/ui/icons";

// ---------- shared ----------

export function StepHeader({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
      <h2 id="tour-step-title" tabIndex={-1} className="text-balance text-[1.875rem] font-bold leading-[1.08] tracking-[-0.03em] outline-none">
        {title}
      </h2>
      <p className="text-pretty text-[0.9375rem] leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-skeleton rounded-[22px] bg-white/[0.06] ${className}`} />;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-white/[0.04] ring-1 ring-inset ring-white/[0.07] ${className}`}>{children}</div>;
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  const i = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div role="tablist" aria-label={label} className="relative grid rounded-full bg-white/[0.06] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full bg-white/[0.14] transition-transform duration-500 ease-[var(--ease-ios)]"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${i * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={`relative h-9 rounded-full text-[0.8125rem] font-semibold transition-colors ${o.value === value ? "text-white" : "text-white/55"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Photo({ src, sizes, className = "" }: { src: string | null; sizes: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-white/[0.06] ${className}`}>
      {src && <Image src={src} alt="" fill unoptimized sizes={sizes} className="object-cover" />}
    </div>
  );
}

// ---------- 0: welcome ----------

export function WelcomeStep() {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center text-center">
      <div aria-hidden className="animate-tour-breathe pointer-events-none absolute left-1/2 top-[38%] h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_68_51/0.32),transparent)]" />
      <div className="animate-tour-in relative h-44 w-44" style={{ "--tour-dir": 0 } as React.CSSProperties}>
        <Image src="/logo-full-v2.png" alt="SORZA" fill priority sizes="176px" className="object-contain" />
        <span aria-hidden className="tour-logo-shine absolute inset-0" />
      </div>
      <h1 className="mt-10 flex flex-col text-[2.25rem] font-bold leading-[1.05] tracking-[-0.035em]">
        {["Your cars.", "Your community.", "Your platform."].map((line, i) => (
          <span
            key={line}
            className={`animate-tour-in ${i === 2 ? "text-accent" : ""}`}
            style={{ "--delay": `${250 + i * 140}ms`, "--tour-dir": 0 } as React.CSSProperties}
          >
            {line}
          </span>
        ))}
      </h1>
      <p className="animate-tour-in mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-white/55" style={{ "--delay": "700ms", "--tour-dir": 0 } as React.CSSProperties}>
        Take a one-minute tour of how SORZA works.
      </p>
    </div>
  );
}

// ---------- 2: garage ----------

const MOD_STATUSES = ["planned", "ordered", "installed"] as const;
type ModStatus = (typeof MOD_STATUSES)[number];
const STATUS_STYLE: Record<ModStatus, string> = {
  planned: "bg-white/[0.08] text-white/70",
  ordered: "bg-[#ff9f0a]/15 text-[#ffb340]",
  installed: "bg-success/15 text-success",
};
const DEMO_MODS = [
  { key: "wheels", label: "Wheels", Icon: WheelIcon },
  { key: "exhaust", label: "Exhaust", Icon: ExhaustIcon },
  { key: "suspension", label: "Suspension", Icon: SuspensionIcon },
] as const;

export function GarageDemo({ viewer, loading }: { viewer: TutorialShowcase["viewer"]; loading: boolean }) {
  const [status, setStatus] = useState<Record<string, ModStatus>>({ wheels: "installed", exhaust: "ordered", suspension: "planned" });
  const [touched, setTouched] = useState(false);
  if (loading) return <Skeleton className="h-[340px] w-full" />;
  const vehicle = viewer?.vehicle ?? null;
  const installed = Object.values(status).filter((s) => s === "installed").length;
  const cycle = (key: string) => {
    setTouched(true);
    setStatus((s) => ({ ...s, [key]: MOD_STATUSES[(MOD_STATUSES.indexOf(s[key]) + 1) % MOD_STATUSES.length] }));
  };

  return (
    <div className="flex flex-col gap-3">
      <Panel className="overflow-hidden">
        {vehicle?.heroUrl ? (
          <Photo src={vehicle.heroUrl} sizes="420px" className="aspect-[16/9] w-full" />
        ) : (
          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 border-b border-dashed border-white/15 text-white/45">
            <CameraIcon className="h-7 w-7" />
            <span className="text-[0.8125rem] font-medium">Your photos go here</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-3.5">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/40">{vehicle ? "Your car" : "Year · Make · Model"}</p>
            <p className="truncate text-[1.0625rem] font-semibold">{vehicle ? vehicle.title : "Your car"}</p>
          </div>
          {/* derived live from the list below, the way the garage adds it up */}
          <p className="numeral flex-shrink-0 text-[0.8125rem] text-white/55">
            {DEMO_MODS.length} mods · {installed} installed
          </p>
        </div>
        <ul className="px-2 pb-2">
          {DEMO_MODS.map(({ key, label, Icon }) => (
            <li key={key} className="flex items-center gap-3 rounded-[14px] px-2 py-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-white/[0.06]">
                <Icon className="h-5 w-5 text-white/80" />
              </span>
              <span className="flex-1 text-[0.9375rem]">{label}</span>
              <button
                type="button"
                onClick={() => cycle(key)}
                aria-label={`${label}: ${status[key]}. Tap to change.`}
                className={`pressable h-8 min-w-[5.5rem] rounded-full px-3 text-[0.75rem] font-semibold capitalize transition-colors duration-300 ${STATUS_STYLE[status[key]]}`}
              >
                {status[key]}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <p className={`text-center text-[0.75rem] transition-colors ${touched ? "text-white/45" : "text-white/70"}`}>
        {touched ? "Mods move from planned to ordered to installed." : "Tap a status to move a mod along."}
      </p>
    </div>
  );
}

// ---------- 3: AI ratings ----------

const ASCENDING_TIERS = [...RANK_TIERS].reverse();

export function RatingDemo({
  topBuild,
  loading,
  watched,
  onWatch,
}: {
  topBuild: TutorialShowcase["topBuild"];
  loading: boolean;
  watched: boolean;
  onWatch: () => void;
}) {
  if (loading) return <Skeleton className="h-[320px] w-full" />;
  return (
    <div className="flex flex-col gap-4">
      {topBuild ? (
        <RatedBuildCard build={topBuild} watched={watched} onWatch={onWatch} />
      ) : (
        <Panel className="p-5 text-[0.875rem] leading-relaxed text-white/60">
          Once builds are rated you can watch one land here. Yours can be the first: rate it from your garage.
        </Panel>
      )}
      <div>
        <p className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/40">Ten tiers, Bronze to Cosmic</p>
        <div className="no-scrollbar -mx-6 flex gap-3 overflow-x-auto px-6 pb-1">
          {ASCENDING_TIERS.map(({ tier, min }, i) => (
            <div key={tier} className="animate-tour-in flex w-14 flex-shrink-0 flex-col items-center gap-1" style={{ "--delay": `${120 + i * 45}ms` } as React.CSSProperties}>
              <div className="relative h-12 w-12">
                <Image src={RANK_ICON_SRC[tier]} alt="" fill unoptimized sizes="48px" className="object-contain" />
              </div>
              <span className="text-[0.625rem] font-semibold" style={{ color: RANK_TEXT_COLORS[tier] }}>
                {RANK_LABELS[tier]}
              </span>
              <span className="numeral text-[0.5625rem] text-white/35">{min}+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatedBuildCard({
  build,
  watched,
  onWatch,
}: {
  build: NonNullable<TutorialShowcase["topBuild"]>;
  watched: boolean;
  onWatch: () => void;
}) {
  const tier = rankForScore(build.rating.score);
  const color = RANK_TEXT_COLORS[tier];
  const [whole, fraction] = build.rating.score.toFixed(2).split(".");
  return (
    <Panel className="overflow-hidden">
      <div className="relative">
        <Photo src={build.heroUrl} sizes="420px" className="aspect-[16/10] w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
          <div className="relative h-14 w-14 flex-shrink-0">
            <Image src={RANK_ICON_SRC[tier]} alt="" fill unoptimized sizes="56px" className="object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em]" style={{ color }}>
              {RANK_LABELS[tier]}
            </p>
            <p className="numeral flex items-baseline leading-none">
              <span className="text-[2.5rem] font-semibold tracking-[-0.04em]">{whole}</span>
              <span className="text-[1.125rem] text-white/45">.{fraction}</span>
            </p>
            <p className="mt-1 truncate text-[0.75rem] text-white/60">
              {build.vehicleTitle} · @{build.ownerUsername}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={onWatch}
          className="pressable flex h-12 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold text-[#0a0a0b]"
          style={{ background: color }}
        >
          <PlayIcon className="h-4 w-4" />
          {watched ? "Watch it again" : "Watch it get rated"}
        </button>
        <p className="text-center text-[0.6875rem] leading-relaxed text-white/40">
          The real rating of the top build on SORZA, replayed. Five scores: appearance, performance, wheels and fitment, interior,
          and mods.
        </p>
      </div>
    </Panel>
  );
}

// ---------- 4: leaderboards ----------

type Scope = "global" | "friends" | "crew";
const SCOPE_COPY: Record<Scope, string> = {
  global: "Every approved build on SORZA.",
  friends: "Only the people you follow.",
  crew: "Just the members of your crews.",
};

export function LeaderboardDemo({ podium, loading }: { podium: TutorialShowcase["podium"]; loading: boolean }) {
  const [scope, setScope] = useState<Scope>("global");
  const [selected, setSelected] = useState(0);
  if (loading) return <Skeleton className="h-[320px] w-full" />;
  if (podium.length === 0) {
    return (
      <Panel className="p-5 text-[0.875rem] leading-relaxed text-white/60">
        No builds are ranked yet. Add your car and get it rated to take the first spot.
      </Panel>
    );
  }
  // 2nd, 1st, 3rd — the podium shape
  const order = [1, 0, 2].filter((i) => podium[i]);
  const heights: Record<number, string> = { 0: "h-[118px]", 1: "h-[88px]", 2: "h-[68px]" };
  const pick = podium[selected] ?? podium[0];
  const pickTier = rankForScore(pick.score);

  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Leaderboard scope" value={scope} onChange={setScope} options={[
        { value: "global", label: "Global" },
        { value: "friends", label: "Friends" },
        { value: "crew", label: "Crew" },
      ]} />
      <p className="-mt-1 text-center text-[0.75rem] text-white/50">{SCOPE_COPY[scope]}</p>
      <div className="flex items-end justify-center gap-3">
        {order.map((i, col) => {
          const entry = podium[i];
          const tier = rankForScore(entry.score);
          const isSel = i === selected;
          return (
            <button
              key={entry.buildId}
              type="button"
              onClick={() => setSelected(i)}
              aria-pressed={isSel}
              aria-label={`Number ${i + 1}: ${entry.vehicleTitle}, ${entry.score.toFixed(2)}`}
              className="flex w-[30%] max-w-[118px] flex-col items-center gap-2"
            >
              <Photo
                src={entry.heroUrl}
                sizes="118px"
                className={`aspect-square w-full rounded-[18px] ring-2 transition-all duration-300 ${isSel ? "scale-100 ring-white/80" : "scale-[0.94] opacity-70 ring-transparent"}`}
              />
              <div
                className={`animate-tour-rise-bar flex w-full flex-col items-center justify-start rounded-t-[14px] pt-2 ${heights[i]}`}
                style={{
                  "--delay": `${200 + col * 120}ms`,
                  background: `linear-gradient(to bottom, ${RANK_TEXT_COLORS[tier]}33, transparent)`,
                  boxShadow: `inset 0 2px 0 0 ${RANK_TEXT_COLORS[tier]}`,
                } as React.CSSProperties}
              >
                <span className="numeral text-[1.5rem] font-bold leading-none">{i + 1}</span>
                <span className="numeral mt-1 text-[0.75rem] font-semibold" style={{ color: RANK_TEXT_COLORS[tier] }}>
                  {entry.score.toFixed(2)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <Panel className="flex items-center gap-3 px-4 py-3">
        <div className="relative h-9 w-9 flex-shrink-0">
          <Image src={RANK_ICON_SRC[pickTier]} alt="" fill unoptimized sizes="36px" className="object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">{pick.vehicleTitle}</p>
          <p className="truncate text-[0.75rem] text-white/50">
            @{pick.ownerUsername} · {RANK_LABELS[pickTier]}
          </p>
        </div>
        <span className="numeral text-[1rem] font-semibold">{pick.score.toFixed(2)}</span>
      </Panel>
      <p className="text-center text-[0.6875rem] text-white/40">SORZA approves every new car. Once yours is approved, its score puts it on the board.</p>
    </div>
  );
}

// ---------- 5: discover & meets ----------

type DiscoverTab = "meets" | "shops" | "search";

function meetDate(iso: string): { month: string; day: string; when: string } {
  const d = new Date(iso);
  return {
    month: d.toLocaleString("en-US", { month: "short" }).toUpperCase(),
    day: String(d.getDate()),
    when: formatDateTime(iso),
  };
}

export function DiscoverDemo({ meets, loading }: { meets: TutorialShowcase["meets"]; loading: boolean }) {
  const [tab, setTab] = useState<DiscoverTab>("meets");
  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Discover" value={tab} onChange={setTab} options={[
        { value: "meets", label: "Meets" },
        { value: "shops", label: "Shops" },
        { value: "search", label: "Search" },
      ]} />
      <div key={tab} className="animate-tour-in flex flex-col gap-3" style={{ "--tour-dir": 0 } as React.CSSProperties}>
        {tab === "meets" &&
          (loading ? (
            <>
              <Skeleton className="h-[88px] w-full" />
              <Skeleton className="h-[88px] w-full" />
            </>
          ) : meets.length === 0 ? (
            <Panel className="p-5 text-[0.875rem] leading-relaxed text-white/60">
              No meets are scheduled right now. Cars and coffee, cruises and track days show up here, and you can host one too.
            </Panel>
          ) : (
            <>
              {meets.map((m) => {
                const d = meetDate(m.startsAt);
                return (
                  <Panel key={m.id} className="flex items-center gap-3 p-2.5">
                    <div className="relative">
                      <Photo src={m.photoUrl} sizes="72px" className="h-[72px] w-[72px] rounded-[14px]" />
                      <span className="absolute left-1.5 top-1.5 flex flex-col items-center rounded-[8px] bg-white px-1.5 py-0.5 text-black">
                        <span className="text-[0.5rem] font-bold leading-none text-accent">{d.month}</span>
                        <span className="numeral text-[0.8125rem] font-bold leading-tight">{d.day}</span>
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug">{m.title}</p>
                      <p className="mt-1 flex items-center gap-1 truncate text-[0.75rem] text-white/50">
                        <PinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{m.locationName}</span>
                      </p>
                      <p className="mt-0.5 text-[0.75rem] text-white/40">{d.when}</p>
                    </div>
                  </Panel>
                );
              })}
              <p className="text-center text-[0.6875rem] text-white/40">Upcoming meets on SORZA right now. Turn on location to sort by distance.</p>
            </>
          ))}
        {tab === "shops" && (
          <>
            <div className="grid grid-cols-4 gap-2">
              {SHOP_CATEGORIES.map(({ id, label, icon: Icon }) => (
                <Panel key={id} className="flex flex-col items-center gap-1.5 px-1 py-3 text-center">
                  <Icon className="h-5 w-5 text-white/80" />
                  <span className="text-[0.625rem] font-medium leading-tight text-white/70">{label}</span>
                </Panel>
              ))}
            </div>
            <p className="text-center text-[0.75rem] leading-relaxed text-white/50">Find shops near you by what they do, from tint to tuning.</p>
          </>
        )}
        {tab === "search" && (
          <>
            <Panel className="flex h-12 items-center gap-2.5 px-4 text-white/45">
              <SearchIcon className="h-5 w-5" />
              <span className="text-[0.9375rem]">Accounts, cars, #hashtags</span>
            </Panel>
            <p className="text-center text-[0.75rem] leading-relaxed text-white/50">
              Find builders by username, or posts by car, caption or #hashtag.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- 6: connect ----------

const CONNECT_ROWS = [
  { Icon: HeartIcon, title: "Friends", body: "Everyone you follow and everyone following you, in one place." },
  { Icon: UsersIcon, title: "Crews", body: "Clubs, scenes and local groups, with their own feed and events." },
  { Icon: CommentIcon, title: "Messages", body: "Talk builds, parts and meets one on one." },
  { Icon: PersonIcon, title: "Your profile", body: "Your cars, posts, rank and followers on one page." },
];

export function ConnectDemo({ viewer, loading }: { viewer: TutorialShowcase["viewer"]; loading: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <Skeleton className="h-[76px] w-full" />
      ) : (
        viewer && (
          <Panel className="flex items-center gap-3 p-3.5">
            <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-white/10">
              {viewer.avatarUrl ? (
                <Image src={viewer.avatarUrl} alt="" fill unoptimized sizes="48px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[1.125rem] font-semibold uppercase">{viewer.username[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[1rem] font-semibold">@{viewer.username}</p>
              <p className="text-[0.75rem] text-white/50">This is you. People find you here.</p>
            </div>
            <CheckIcon className="h-5 w-5 text-success" />
          </Panel>
        )
      )}
      <ul className="flex flex-col">
        {CONNECT_ROWS.map(({ Icon, title, body }, i) => (
          <li
            key={title}
            className="animate-tour-in flex items-start gap-3.5 py-2.5"
            style={{ "--delay": `${150 + i * 90}ms` } as React.CSSProperties}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-accent/12 text-accent">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[0.9375rem] font-semibold">{title}</span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-white/55">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
