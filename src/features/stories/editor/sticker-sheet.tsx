"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/features/feed/avatar";
import { listMyStoryCarsAction, searchMentionsAction } from "@/features/stories/actions";
import type { StoryPerson } from "@/lib/stories/load";
import type { StoryCar } from "@/lib/stories/resolve";
import { LOCATION_MAX, POLL_OPTION_MAX, POLL_QUESTION_MAX, QUESTION_PROMPT_MAX, type StoryLayer } from "@/lib/stories/design";
import { rankForScore, RANK_LABELS, RANK_TEXT_COLORS } from "@/lib/rating/rank";
import { formatScore } from "@/lib/rating/share-text";
import { BackIcon, ClockIcon, MusicIcon, PinIcon, SearchIcon, WheelIcon } from "@/components/ui/icons";

export type StickerPick =
  | { kind: "mention"; username: string }
  | { kind: "car"; car: StoryCar }
  | { kind: "time"; label: string }
  | { kind: "location"; name: string }
  | { kind: "poll"; question: string; options: [string, string] }
  | { kind: "question"; prompt: string }
  | { kind: "music" };

type View = "home" | "mention" | "car" | "location" | "poll" | "question";

function timeLabel(now = new Date()): string {
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** The sticker tray. Polls, questions and music are one per story, so
 * their tiles go once one's on. */
export function StickerSheet({
  onPick,
  onClose,
  has,
}: {
  onPick: (pick: StickerPick) => void;
  onClose: () => void;
  /** Sticker kinds already on the story. */
  has: Set<StoryLayer["kind"]>;
}) {
  const [view, setView] = useState<View>("home");

  return (
    <div className="absolute inset-0 z-30 flex items-end" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="animate-sheet-up max-h-[78%] w-full overflow-y-auto rounded-t-[26px] bg-[#141416]/95 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl">
        <div className="mx-auto mb-2 mt-2.5 h-1 w-9 rounded-full bg-white/20" />
        {view === "home" && (
          <div className="grid grid-cols-3 gap-3 px-4 pb-2 pt-2">
            <Tile label="Mention" onClick={() => setView("mention")}>
              <span className="text-[1.5rem] font-bold leading-none text-accent">@</span>
            </Tile>
            <Tile label="My car" onClick={() => setView("car")}>
              <WheelIcon className="h-7 w-7" />
            </Tile>
            <Tile label="Location" onClick={() => setView("location")}>
              <PinIcon className="h-7 w-7" />
            </Tile>
            {!has.has("music") && (
              <Tile label="Music" onClick={() => onPick({ kind: "music" })}>
                <MusicIcon className="h-7 w-7" />
              </Tile>
            )}
            {!has.has("poll") && (
              <Tile label="Poll" onClick={() => setView("poll")}>
                <PollGlyph />
              </Tile>
            )}
            {!has.has("question") && (
              <Tile label="Questions" onClick={() => setView("question")}>
                <span className="text-[1.5rem] font-bold leading-none">?</span>
              </Tile>
            )}
            <Tile label="Time" onClick={() => onPick({ kind: "time", label: timeLabel() })}>
              <ClockIcon className="h-7 w-7" />
            </Tile>
          </div>
        )}
        {view === "mention" && <MentionSearch onBack={() => setView("home")} onPick={(username) => onPick({ kind: "mention", username })} />}
        {view === "car" && <CarList onBack={() => setView("home")} onPick={(car) => onPick({ kind: "car", car })} />}
        {view === "location" && (
          <TextForm
            title="Add a location"
            onBack={() => setView("home")}
            fields={[{ placeholder: "Where are you? (Cars & Coffee, Dallas…)", max: LOCATION_MAX, initial: "" }]}
            action="Add location"
            onSubmit={([name]) => onPick({ kind: "location", name })}
          />
        )}
        {view === "poll" && (
          <TextForm
            title="Poll"
            onBack={() => setView("home")}
            fields={[
              { placeholder: "Ask a question", max: POLL_QUESTION_MAX, initial: "" },
              { placeholder: "Option 1", max: POLL_OPTION_MAX, initial: "Yes" },
              { placeholder: "Option 2", max: POLL_OPTION_MAX, initial: "No" },
            ]}
            action="Add poll"
            onSubmit={([question, a, b]) => onPick({ kind: "poll", question, options: [a, b] })}
          />
        )}
        {view === "question" && (
          <TextForm
            title="Questions"
            onBack={() => setView("home")}
            fields={[{ placeholder: "Ask me a question", max: QUESTION_PROMPT_MAX, initial: "Ask me a question" }]}
            action="Add questions"
            onSubmit={([prompt]) => onPick({ kind: "question", prompt })}
          />
        )}
      </div>
    </div>
  );
}

function PollGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="5" rx="2.5" />
      <rect x="3.5" y="14" width="17" height="5" rx="2.5" />
      <path d="M6.5 7.5h7M6.5 16.5h4" strokeWidth={2.4} />
    </svg>
  );
}

function Tile({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="pressable flex aspect-[1.1] flex-col items-center justify-center gap-2 rounded-[20px] bg-white/[0.07] text-white">
      {children}
      <span className="text-[0.8125rem] font-semibold">{label}</span>
    </button>
  );
}

function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-1 px-2 pb-2">
      <button type="button" onClick={onBack} aria-label="Back" className="pressable flex h-9 w-9 items-center justify-center text-white">
        <BackIcon className="h-5 w-5" />
      </button>
      <p className="text-[0.9375rem] font-semibold text-white">{title}</p>
    </div>
  );
}

/** A few text fields and an Add button: location, poll, question. */
function TextForm({
  title,
  onBack,
  fields,
  action,
  onSubmit,
}: {
  title: string;
  onBack: () => void;
  fields: { placeholder: string; max: number; initial: string }[];
  action: string;
  onSubmit: (values: string[]) => void;
}) {
  const [values, setValues] = useState(() => fields.map((f) => f.initial));
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);
  const ready = values.every((v) => v.trim().length > 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) onSubmit(values.map((v) => v.trim()));
      }}
    >
      <SubHeader title={title} onBack={onBack} />
      <div className="flex flex-col gap-2 px-4">
        {fields.map((f, i) => (
          <input
            key={i}
            ref={i === 0 ? firstRef : undefined}
            value={values[i]}
            maxLength={f.max}
            onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={f.placeholder}
            className="h-12 rounded-xl bg-white/[0.08] px-3.5 text-[1rem] text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-white/30"
          />
        ))}
        <button type="submit" disabled={!ready} className="pressable mt-1 h-12 rounded-full bg-white text-[0.9375rem] font-semibold text-black disabled:opacity-40">
          {action}
        </button>
      </div>
    </form>
  );
}

function MentionSearch({ onBack, onPick }: { onBack: () => void; onPick: (username: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StoryPerson[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      searchMentionsAction(query)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults([]));
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q]);

  return (
    <div>
      <SubHeader title="Mention someone" onBack={onBack} />
      <label className="mx-4 flex h-11 items-center gap-2 rounded-xl bg-white/[0.08] px-3 text-white">
        <SearchIcon className="h-4 w-4 text-white/50" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search usernames"
          autoCapitalize="none"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-white/40"
        />
      </label>
      <ul className="mt-2 max-h-[40dvh] overflow-y-auto px-2">
        {q.trim() &&
          results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.username)} className="pressable flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-white">
                <Avatar username={p.username} avatarUrl={p.avatarUrl} className="h-10 w-10 text-sm" />
                <span className="truncate text-[0.9375rem] font-medium">{p.username}</span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

function CarList({ onBack, onPick }: { onBack: () => void; onPick: (car: StoryCar) => void }) {
  const [cars, setCars] = useState<StoryCar[] | null>(null);
  useEffect(() => {
    listMyStoryCarsAction()
      .then(setCars)
      .catch(() => setCars([]));
  }, []);

  return (
    <div>
      <SubHeader title="Pick your car" onBack={onBack} />
      {cars === null ? (
        <p className="px-4 py-6 text-center text-[0.875rem] text-white/50">Loading your garage…</p>
      ) : cars.length === 0 ? (
        <p className="px-6 py-6 text-center text-[0.875rem] text-white/60">Add a car to your garage to put it on your story.</p>
      ) : (
        <ul className="max-h-[42dvh] overflow-y-auto px-2">
          {cars.map((car) => {
            const tier = car.score == null ? null : rankForScore(car.score);
            return (
              <li key={car.id}>
                <button type="button" onClick={() => onPick(car)} className="pressable flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-white">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
                    <WheelIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{car.name}</span>
                  {tier && car.score != null ? (
                    <span className="numeral flex-shrink-0 text-[0.875rem] font-semibold" style={{ color: RANK_TEXT_COLORS[tier] }}>
                      {formatScore(car.score)} · {RANK_LABELS[tier]}
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-[0.8125rem] text-white/45">Not rated</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
