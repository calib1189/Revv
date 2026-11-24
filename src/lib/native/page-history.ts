// Remembers what each page looked like when you left it, so swiping back
// can show it underneath the page you're on (swipe-back.ts).
//
// Each history entry gets a key, and every new entry records the key of
// the one it came from. The copy of a page is taken when you tap the link
// or button that leaves it (capture phase, before Next.js swaps the page),
// and filed under that page's key when the new entry is pushed. Going back
// from an entry then means showing the copy filed under its "from" key.
import { capturePage, type PageSnapshot } from "@/lib/native/page-snapshot";

export const ENTRY_KEY = "__sorzaKey";
export const FROM_KEY = "__sorzaFrom";
const KEEP = 8; // copies kept, newest first
const TAP_WINDOW_MS = 3000; // a push this soon after a tap came from it

type State = Record<string, unknown>;

const snapshots = new Map<string, PageSnapshot>();
let pending: { href: string; at: number; snapshot: PageSnapshot } | null = null;

function newKey(): string {
  return Math.random().toString(36).slice(2, 12);
}

function currentState(): State | null {
  const state: unknown = window.history.state;
  return state && typeof state === "object" ? (state as State) : null;
}

function remember(key: string, snapshot: PageSnapshot) {
  snapshots.delete(key);
  snapshots.set(key, snapshot);
  while (snapshots.size > KEEP) {
    const oldest = snapshots.keys().next().value;
    if (oldest === undefined) break;
    snapshots.delete(oldest);
  }
}

/** The new entry's state: a key of its own and the key it came from. */
export function stateForPush(data: unknown, fromKey: string | null): State {
  const base = data && typeof data === "object" ? (data as State) : {};
  return { ...base, [ENTRY_KEY]: newKey(), [FROM_KEY]: fromKey };
}

/** Next.js rewrites the current entry's state as it works; carry our keys
 * over so the entry keeps its identity. */
export function stateForReplace(data: unknown, current: State | null): unknown {
  if (!data || typeof data !== "object" || !current || current[ENTRY_KEY] === undefined) return data;
  const next = data as State;
  if (next[ENTRY_KEY] !== undefined) return data;
  return { ...next, [ENTRY_KEY]: current[ENTRY_KEY], [FROM_KEY]: current[FROM_KEY] ?? null };
}

/** The copy of the page that going back from here lands on, if we have one. */
export function previousPageSnapshot(): PageSnapshot | null {
  const from = currentState()?.[FROM_KEY];
  return typeof from === "string" ? (snapshots.get(from) ?? null) : null;
}

/** Once you're back on a page it's live again: its old copy is stale, and
 * a fresh one is taken next time you leave it. */
export function forgetCurrentPageSnapshot() {
  const key = currentState()?.[ENTRY_KEY];
  if (typeof key === "string") snapshots.delete(key);
}

export function installPageHistory(): () => void {
  const history = window.history;
  const push = history.pushState;
  const replace = history.replaceState;

  // Give the entry the app opened on a key, without disturbing Next.js
  // (its own entries carry __NA, which it passes straight through).
  const state = currentState();
  if (state && state.__NA && state[ENTRY_KEY] === undefined) {
    replace.call(history, { ...state, [ENTRY_KEY]: newKey(), [FROM_KEY]: null }, "", window.location.href);
  }

  history.pushState = function pushState(data: unknown, unused: string, url?: string | URL | null) {
    const from = currentState()?.[ENTRY_KEY];
    const fromKey = typeof from === "string" ? from : null;
    if (fromKey && pending && pending.href === window.location.href && Date.now() - pending.at < TAP_WINDOW_MS) {
      remember(fromKey, pending.snapshot);
    }
    pending = null;
    return push.call(history, stateForPush(data, fromKey), unused, url);
  };
  history.replaceState = function replaceState(data: unknown, unused: string, url?: string | URL | null) {
    return replace.call(history, stateForReplace(data, currentState()), unused, url);
  };

  // A tap on a link to another page: take the copy now, while it's still
  // the page on screen. Only links, so ordinary taps (like, vote, play)
  // never pay for a copy; pages opened from a button get the plain
  // background underneath instead.
  function onClick(e: MouseEvent) {
    const target = e.target instanceof Element ? e.target : null;
    const link = target?.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.closest("[data-swipe-back]") || link.target === "_blank") return;
    let next: URL;
    try {
      next = new URL(link.href, window.location.href);
    } catch {
      return;
    }
    if (next.origin !== window.location.origin || next.pathname === window.location.pathname) return;
    try {
      pending = { href: window.location.href, at: Date.now(), snapshot: capturePage() };
    } catch {
      pending = null;
    }
  }
  document.addEventListener("click", onClick, { capture: true });

  return () => {
    document.removeEventListener("click", onClick, { capture: true });
    history.pushState = push;
    history.replaceState = replace;
    snapshots.clear();
    pending = null;
  };
}
