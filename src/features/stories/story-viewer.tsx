"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StoryFrame, fitStoryFrame, useBoxSize } from "@/features/stories/story-frame";
import { DEFAULT_DESIGN } from "@/lib/stories/design";
import { Avatar } from "@/features/feed/avatar";
import { CloseIcon, EyeIcon, MoreIcon, VolumeIcon } from "@/components/ui/icons";
import {
  deleteStoryAction,
  listStoryViewersAction,
  loadStoryGroupsAction,
  markStorySeenAction,
  votePollAction,
  answerQuestionAction,
  listQuestionAnswersAction,
  type StoryGroup,
} from "@/features/stories/actions";
import { PollCard, QuestionCard } from "@/features/stories/story-frame";
import { QUESTION_ANSWER_MAX, type StoryLayer } from "@/lib/stories/design";
import type { StoryPerson } from "@/lib/stories/load";
import { PHOTO_MUSIC_STORY_MS, PHOTO_STORY_MS, startIndex, storyAge } from "@/lib/stories/tray";
import { isFeedMuted, setFeedMuted } from "@/features/feed/feed-sound";

type Viewer = StoryPerson & { viewedAt: string };

/** Story ids of this person's that count as watched: already seen when
 * loaded, or watched since. */
function seenIn(g: StoryGroup, watched: Set<string>): Set<string> {
  return new Set(g.stories.filter((s) => s.seen || watched.has(s.id)).map((s) => s.id));
}

const subscribeNever = () => () => {};

/**
 * Full-screen stories: segmented progress along the top, tap the right
 * side for the next story and the left for the one before, hold to
 * pause, swipe down to close. Plays through each person in turn. Your
 * own stories show who watched them and can be deleted.
 */
export function StoryViewer({
  authorIds,
  startAuthorId,
  startStoryId,
  onCaughtUp,
  onClose,
}: {
  authorIds: string[];
  startAuthorId?: string;
  /** Open at this story (from a notification), rather than the first unwatched one. */
  startStoryId?: string;
  onCaughtUp: (authorId: string) => void;
  /** `changed`: a story was watched or deleted, so server-rendered rings
   * and rows are stale. */
  onClose: (changed: boolean) => void;
}) {
  // Portalled, so only once there's a document to portal into.
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState({ g: 0, s: 0 });
  const [held, setHeld] = useState(false);
  const [panel, setPanel] = useState<"viewers" | "menu" | "answer" | "answers" | null>(null);
  // Poll results after voting here: "storyId:layerId" -> tallies and vote.
  const [voted, setVoted] = useState<Record<string, { counts: [number, number]; mine: 0 | 1 }>>({});
  const [answering, setAnswering] = useState<{ layerId: string; prompt: string } | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "sending" | "sent" | string>("idle");
  const [answers, setAnswers] = useState<{ answerId: string; username: string; avatarUrl: string | null; body: string; createdAt: string }[] | null>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [viewers, setViewers] = useState<Viewer[] | null>(null);
  const [muted, setMuted] = useState(() => isFeedMuted());
  const [readyId, setReadyId] = useState<string | null>(null);
  const [dragY, setDragY] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const router = useRouter();
  const [surfaceRef, surface] = useBoxSize<HTMLDivElement>();
  const frame = fitStoryFrame(surface.w, surface.h);
  const changedRef = useRef(false);
  const seenRef = useRef(new Set<string>());
  const fillRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const elapsedRef = useRef({ id: "", ms: 0 });
  const gestureRef = useRef<{ x: number; y: number; holdTimer: number; held: boolean; moved: boolean } | null>(null);
  const onCloseRef = useRef(onClose);
  const onCaughtUpRef = useRef(onCaughtUp);
  useEffect(() => {
    onCloseRef.current = onClose;
    onCaughtUpRef.current = onCaughtUp;
  });

  const group = groups?.[pos.g] ?? null;
  const story = group?.stories[pos.s] ?? null;
  const paused = held || panel !== null || readyId !== story?.id;

  const close = useCallback(() => onCloseRef.current(changedRef.current), []);

  // Load once, starting at the first story of that person you haven't watched.
  useEffect(() => {
    let cancelled = false;
    loadStoryGroupsAction(authorIds)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.length === 0) {
          onCloseRef.current(false);
          return;
        }
        const g = Math.max(0, startAuthorId ? loaded.findIndex((x) => x.author.id === startAuthorId) : 0);
        const first = loaded[g];
        const at = startStoryId ? first.stories.findIndex((x) => x.id === startStoryId) : -1;
        setGroups(loaded);
        setPos({ g, s: at >= 0 ? at : startIndex(first.stories.map((s) => s.id), new Set(first.stories.filter((s) => s.seen).map((s) => s.id))) });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // The viewer is keyed per opening; these props never change while it's up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No page scroll behind it, and Escape closes it.
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      html.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [close]);

  const next = useCallback(() => {
    if (!groups) return;
    const g = groups[pos.g];
    if (pos.s < g.stories.length - 1) setPos({ g: pos.g, s: pos.s + 1 });
    else if (pos.g < groups.length - 1) {
      const ng = groups[pos.g + 1];
      setPos({ g: pos.g + 1, s: startIndex(ng.stories.map((s) => s.id), seenIn(ng, seenRef.current)) });
    } else close();
  }, [groups, pos, close]);

  const prev = useCallback(() => {
    if (!groups) return;
    if (pos.s > 0) setPos({ g: pos.g, s: pos.s - 1 });
    else if (pos.g > 0) setPos({ g: pos.g - 1, s: 0 });
    else {
      elapsedRef.current = { id: "", ms: 0 };
      if (videoRef.current) videoRef.current.currentTime = 0;
    }
  }, [groups, pos]);

  // Counts as watched the moment it shows; the last one of a person
  // means you're caught up on them.
  useEffect(() => {
    if (!group || !story) return;
    if (!group.isOwn && !story.seen && !seenRef.current.has(story.id)) {
      seenRef.current.add(story.id);
      changedRef.current = true;
      void markStorySeenAction(story.id);
    }
    if (!group.isOwn && pos.s === group.stories.length - 1) onCaughtUpRef.current(group.author.id);
  }, [group, story, pos.s]);

  // The progress bar, driven straight from the clock (photos) or the
  // video's own position, without re-rendering every frame.
  useEffect(() => {
    if (!story) return;
    if (elapsedRef.current.id !== story.id) elapsedRef.current = { id: story.id, ms: 0 };
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      let p: number;
      if (story.kind === "image") {
        if (!paused) elapsedRef.current.ms += dt;
        p = elapsedRef.current.ms / (story.music ? PHOTO_MUSIC_STORY_MS : PHOTO_STORY_MS);
      } else {
        const v = videoRef.current;
        p = v && v.duration ? v.currentTime / v.duration : 0;
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${Math.min(1, p)})`;
      if (story.kind === "image" && p >= 1) {
        next();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [story, paused, next]);

  // Video follows pause and mute. If the browser refuses sound before a
  // tap, play muted rather than not at all.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || story?.kind !== "video") return;
    // A story's song replaces the video's own sound.
    v.muted = muted || Boolean(story.music);
    if (held || panel !== null) {
      v.pause();
      return;
    }
    v.play().catch(() => {
      if (!v.muted) {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      }
    });
  }, [story, held, panel, muted]);

  // The story's song: from its start point, paused and muted with the story.
  useEffect(() => {
    const a = musicRef.current;
    if (!a) return;
    if (!story?.music) {
      a.pause();
      return;
    }
    if (a.dataset.storyId !== story.id) {
      a.dataset.storyId = story.id;
      a.src = story.music.url;
      a.currentTime = story.music.startMs / 1000;
    }
    a.muted = muted;
    if (held || panel !== null) {
      a.pause();
      return;
    }
    a.play().catch(() => {
      if (!a.muted) {
        a.muted = true;
        setMuted(true);
        a.play().catch(() => {});
      }
    });
  }, [story, held, panel, muted]);

  useEffect(() => () => musicRef.current?.pause(), []);

  function toggleMute() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setFeedMuted(nextMuted);
  }

  function onPointerDown(e: React.PointerEvent) {
    const holdTimer = window.setTimeout(() => {
      if (gestureRef.current) gestureRef.current.held = true;
      setHeld(true);
    }, 180);
    gestureRef.current = { x: e.clientX, y: e.clientY, holdTimer, held: false, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gestureRef.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      g.moved = true;
      window.clearTimeout(g.holdTimer);
    }
    if (dy > 0 && Math.abs(dy) > Math.abs(dx)) setDragY(dy);
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    window.clearTimeout(g.holdTimer);
    if (dragY > 110) {
      close();
      return;
    }
    setDragY(0);
    if (g.held) {
      setHeld(false);
      return;
    }
    if (g.moved) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX - box.left < box.width * 0.3) prev();
    else next();
  }

  function onPointerCancel() {
    const g = gestureRef.current;
    if (g) window.clearTimeout(g.holdTimer);
    gestureRef.current = null;
    setHeld(false);
    setDragY(0);
  }

  function openViewers() {
    if (!story) return;
    setPanel("viewers");
    setViewers(null);
    listStoryViewersAction(story.id)
      .then(setViewers)
      .catch(() => setViewers([]));
  }

  function openAnswer(layerId: string, prompt: string) {
    setAnswering({ layerId, prompt });
    setAnswerText("");
    setAnswerState("idle");
    setPanel("answer");
  }

  async function sendAnswer() {
    if (!story || !answering || !answerText.trim()) return;
    setAnswerState("sending");
    const result = await answerQuestionAction(story.id, answering.layerId, answerText).catch(() => ({ ok: false, error: "Couldn't send that. Try again." }));
    if (result.ok) {
      setAnswerState("sent");
      window.setTimeout(() => setPanel(null), 700);
    } else setAnswerState(result.error ?? "Couldn't send that. Try again.");
  }

  function openAnswers() {
    if (!story) return;
    setPanel("answers");
    setAnswers(null);
    listQuestionAnswersAction(story.id)
      .then(setAnswers)
      .catch(() => setAnswers([]));
  }

  async function vote(layerId: string, option: 0 | 1) {
    if (!story) return;
    const key = `${story.id}:${layerId}`;
    const before = story.polls[layerId]?.counts ?? [0, 0];
    // Show the result right away; the server's tally replaces it.
    const optimistic: [number, number] = option === 0 ? [before[0] + 1, before[1]] : [before[0], before[1] + 1];
    setVoted((v) => ({ ...v, [key]: { counts: optimistic, mine: option } }));
    const result = await votePollAction(story.id, layerId, option).catch(() => null);
    if (result) setVoted((v) => ({ ...v, [key]: { counts: result.counts, mine: option } }));
  }

  /** Live polls and questions in the viewer. */
  function renderLayer(layer: StoryLayer) {
    if (!story || !group) return null;
    if (layer.kind === "poll") {
      const local = voted[`${story.id}:${layer.id}`];
      const server = story.polls[layer.id];
      const mine = local?.mine ?? server?.mine ?? null;
      const showResults = group.isOwn || mine !== null;
      return (
        <PollCard
          layer={layer}
          results={showResults ? (local?.counts ?? server?.counts ?? [0, 0]) : null}
          myVote={mine}
          onVote={!group.isOwn && mine === null ? (o) => void vote(layer.id, o) : undefined}
        />
      );
    }
    if (layer.kind === "question") {
      if (group.isOwn) {
        const n = story.answerCount ?? 0;
        return <QuestionCard layer={layer} onOpen={openAnswers} footer={n === 1 ? "1 response" : `${n} responses`} />;
      }
      return <QuestionCard layer={layer} onOpen={() => openAnswer(layer.id, layer.prompt)} />;
    }
    return null;
  }

  async function removeStory() {
    if (!groups || !story) return;
    setDeleting(true);
    const result = await deleteStoryAction(story.id).catch(() => ({ ok: false }));
    setDeleting(false);
    if (!result.ok) return;
    changedRef.current = true;
    setPanel(null);
    const nextGroups = groups
      .map((g, i) => (i === pos.g ? { ...g, stories: g.stories.filter((s) => s.id !== story.id) } : g))
      .filter((g) => g.stories.length > 0);
    if (nextGroups.length === 0) {
      close();
      return;
    }
    const g = Math.min(pos.g, nextGroups.length - 1);
    setGroups(nextGroups);
    setPos({ g, s: Math.min(pos.s, nextGroups[g].stories.length - 1) });
  }

  const nextStory = groups && group ? (group.stories[pos.s + 1] ?? groups[pos.g + 1]?.stories[0] ?? null) : null;

  const body = (
    <div
      className="fixed inset-0 z-[90] bg-black text-white"
      style={{
        transform: dragY ? `translateY(${dragY}px)` : undefined,
        opacity: dragY ? Math.max(0.4, 1 - dragY / 500) : 1,
        transition: dragY ? "none" : "transform 220ms var(--ease-ios), opacity 220ms",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={group ? (group.isOwn ? "Your story" : `${group.author.username}'s story`) : "Story"}
    >
      <div className="relative mx-auto h-full w-full max-w-[480px] overflow-hidden">
        {/* The story itself, and the tap/hold/swipe surface over it. */}
        <div
          ref={surfaceRef}
          className="absolute inset-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          {story && frame.width > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <StoryFrame
                design={story.design ?? DEFAULT_DESIGN}
                width={frame.width}
                height={frame.height}
                blurUrl={story.kind === "image" && story.design ? story.url : null}
                className="rounded-[12px]"
                renderLayer={renderLayer}
                onStickerTap={(layer) => {
                  if (layer.kind === "location") {
                    window.open(`https://maps.apple.com/?q=${encodeURIComponent(layer.name)}`, "_blank", "noopener");
                    return;
                  }
                  const href =
                    layer.kind === "mention" ? `/u/${layer.username}` : layer.kind === "car" ? `/garage/${layer.vehicleId}` : null;
                  if (!href) return;
                  close();
                  router.push(href);
                }}
                media={
                  story.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element -- full-size story photo, shown as uploaded
                    <img
                      key={story.id}
                      src={story.url}
                      alt=""
                      draggable={false}
                      onLoad={() => setReadyId(story.id)}
                      onError={() => setReadyId(story.id)}
                    />
                  ) : (
                    <video
                      key={story.id}
                      ref={videoRef}
                      src={story.url}
                      playsInline
                      autoPlay
                      muted={muted}
                      preload="auto"
                      onLoadedData={() => setReadyId(story.id)}
                      onError={() => setReadyId(story.id)}
                      onEnded={next}
                    />
                  )
                }
              />
            </div>
          )}
          {nextStory?.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element -- preloads the next story
            <img src={nextStory.url} alt="" aria-hidden className="hidden" />
          )}
          {(!groups || (story && readyId !== story.id && !held)) && !failed && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            </span>
          )}
          {failed && (
            <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[0.9375rem] text-white/70">
              Couldn&apos;t load these stories. Close and try again.
            </p>
          )}
        </div>

        {/* Top: progress, who, when. Fades while you hold to look. */}
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 to-transparent px-2.5 pb-10 pt-[calc(env(safe-area-inset-top)+8px)] transition-opacity duration-200 ${
            held ? "opacity-0" : "opacity-100"
          }`}
        >
          {group && (
            <div className="flex gap-1">
              {group.stories.map((s, i) => (
                <span key={s.id} className="relative h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/30">
                  {/* The current bar is filled frame by frame from a ref, so
                      React leaves its transform alone. */}
                  <span
                    ref={i === pos.s ? fillRef : undefined}
                    className={`absolute inset-0 origin-left rounded-full bg-white ${i === pos.s ? "scale-x-0" : ""}`}
                    style={i === pos.s ? undefined : { transform: `scaleX(${i < pos.s ? 1 : 0})` }}
                  />
                </span>
              ))}
            </div>
          )}
          {group && story && (
            <div className="pointer-events-auto mt-3 flex items-center gap-2.5">
              <Link
                href={`/u/${group.author.username}`}
                onClick={close}
                className="flex min-w-0 items-center gap-2.5 [text-shadow:0_1px_3px_rgb(0_0_0/0.5)]"
              >
                <Avatar username={group.author.username} avatarUrl={group.author.avatarUrl} className="h-8 w-8 text-xs" />
                <span className="truncate text-[0.9375rem] font-semibold">{group.isOwn ? "Your story" : group.author.username}</span>
                <span className="flex-shrink-0 text-[0.8125rem] text-white/70" suppressHydrationWarning>
                  {storyAge(story.createdAt)}
                </span>
              </Link>
              <span className="flex-1" />
              {(story.kind === "video" || story.music) && (
                <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"} className="pressable flex h-9 w-9 items-center justify-center">
                  <VolumeIcon muted={muted} className="h-6 w-6" />
                </button>
              )}
              {group.isOwn && (
                <button type="button" onClick={() => setPanel("menu")} aria-label="Story options" className="pressable flex h-9 w-9 items-center justify-center">
                  <MoreIcon className="h-6 w-6" />
                </button>
              )}
              <button type="button" onClick={close} aria-label="Close" className="pressable flex h-9 w-9 items-center justify-center">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom: the caption, and on your own story, who watched. */}
        {story && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-16 transition-opacity duration-200 ${
              held ? "opacity-0" : "opacity-100"
            }`}
          >
            {story.caption && (
              <p className="text-center text-[1rem] font-medium leading-snug [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">{story.caption}</p>
            )}
            {group?.isOwn && (
              <button
                type="button"
                onClick={openViewers}
                className="pressable pointer-events-auto mt-4 flex items-center gap-1.5 text-[0.875rem] font-semibold"
              >
                <EyeIcon className="h-[18px] w-[18px]" />
                {story.viewCount === 1 ? "1 viewer" : `${story.viewCount ?? 0} viewers`}
              </button>
            )}
          </div>
        )}

        <audio ref={musicRef} preload="none" loop />

        {panel && (
          <div className="absolute inset-0 z-10 flex items-end" onClick={() => setPanel(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div
              className="relative max-h-[62%] w-full overflow-y-auto rounded-t-[26px] bg-[#141416] px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-white/20" />
              {panel === "answer" && answering ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendAnswer();
                  }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-center text-[0.9375rem] font-semibold">{answering.prompt}</p>
                  <textarea
                    autoFocus
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value.slice(0, QUESTION_ANSWER_MAX))}
                    placeholder={`Reply to ${group?.author.username ?? "them"}…`}
                    rows={3}
                    className="w-full resize-none rounded-2xl bg-white/[0.07] px-4 py-3 text-[1rem] outline-none placeholder:text-white/40"
                  />
                  <button
                    type="submit"
                    disabled={!answerText.trim() || answerState === "sending" || answerState === "sent"}
                    className="pressable h-12 rounded-full bg-white text-[0.9375rem] font-semibold text-black disabled:opacity-50"
                  >
                    {answerState === "sending" ? "Sending…" : answerState === "sent" ? "Sent" : "Send"}
                  </button>
                  <p className="text-center text-[0.75rem] text-white/45">Only {group?.author.username ?? "they"} will see your answer.</p>
                  {answerState !== "idle" && answerState !== "sending" && answerState !== "sent" && (
                    <p className="text-center text-[0.8125rem] text-danger">{answerState}</p>
                  )}
                </form>
              ) : panel === "answers" ? (
                <>
                  <p className="mb-2 text-center text-[0.9375rem] font-semibold">Responses</p>
                  {answers === null ? (
                    <p className="py-6 text-center text-[0.875rem] text-white/50">Loading…</p>
                  ) : answers.length === 0 ? (
                    <p className="py-6 text-center text-[0.875rem] text-white/50">No answers yet.</p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {answers.map((a) => (
                        <li key={a.answerId} className="flex gap-3 rounded-2xl bg-white/[0.05] p-3">
                          <Avatar username={a.username} avatarUrl={a.avatarUrl} className="h-9 w-9 flex-shrink-0 text-xs" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-[0.875rem] font-semibold">{a.username}</span>
                              <span className="flex-shrink-0 text-[0.75rem] text-white/40">{storyAge(a.createdAt)}</span>
                            </span>
                            <span className="mt-0.5 block whitespace-pre-wrap break-words text-[0.9375rem] leading-snug text-white/90">{a.body}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : panel === "menu" ? (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => void removeStory()}
                    disabled={deleting}
                    className="pressable h-12 rounded-2xl bg-white/[0.06] text-[0.9375rem] font-semibold text-danger disabled:opacity-60"
                  >
                    {deleting ? "Deleting…" : "Delete story"}
                  </button>
                  <button type="button" onClick={() => setPanel(null)} className="pressable h-12 rounded-2xl text-[0.9375rem] font-semibold text-white/80">
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-center text-[0.9375rem] font-semibold">Viewers</p>
                  {viewers === null ? (
                    <p className="py-6 text-center text-[0.875rem] text-white/50">Loading…</p>
                  ) : viewers.length === 0 ? (
                    <p className="py-6 text-center text-[0.875rem] text-white/50">No one has watched this yet.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {viewers.map((v) => (
                        <li key={v.id}>
                          <Link href={`/u/${v.username}`} onClick={close} className="flex items-center gap-3 rounded-xl px-1 py-2">
                            <Avatar username={v.username} avatarUrl={v.avatarUrl} className="h-10 w-10 text-sm" />
                            <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{v.username}</span>
                            <span className="text-[0.8125rem] text-white/45">{storyAge(v.viewedAt)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return isClient ? createPortal(body, document.body) : null;
}
