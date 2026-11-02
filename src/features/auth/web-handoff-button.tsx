"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { createWebHandoffAction, type WebHandoffResult } from "@/features/auth/actions";
import { webHandoffUrl } from "@/lib/auth/web-handoff-url";
import { openExternalBrowser } from "@/lib/native/open-external";
import { SITE_URL } from "@/lib/site-url";
import { Spinner } from "@/components/ui/spinner";

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

export const HANDOFF_BUTTON_CLASS =
  "pressable inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[0.9375rem] font-semibold text-accent-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25),0_8px_24px_-10px_rgb(255_68_51/0.55)]";

/** Supabase's default sign-in link lifetime is an hour; replacing ours
 * well inside that means a button left on screen never hands over a
 * lapsed one. */
const TOKEN_FRESH_MS = 10 * 60_000;
/** A new token voids the previous one, so none is minted while the
 * browser may still be redeeming the one just opened. */
const REMINT_AFTER_OPEN_MS = 10_000;
/** iOS switches to the browser well inside this; still in front after it
 * means nothing opened. */
const LEAVE_TIMEOUT_MS = 2_500;
const MINT_ERROR = "Couldn't reach the website. Try again.";

type Token = { hash: string; mintedAt: number };
type HandoffStore = { token: Token | null; error: string | null };

const EMPTY: HandoffStore = { token: null, error: null };

// One token shared by every button on screen — the Advertise page has two,
// and each minting its own would void the other's.
let store = EMPTY;
let inflight: Promise<Token | null> | null = null;
let lastOpenedAt = 0;
const listeners = new Set<() => void>();

function setStore(patch: Partial<HandoffStore>) {
  store = { ...store, ...patch };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    // A token only lives while a button is on screen, so signing out and
    // back in as someone else can never pick up the last person's.
    if (listeners.size === 0) store = EMPTY;
  };
}

function isFresh(token: Token | null): token is Token {
  return token !== null && Date.now() - token.mintedAt < TOKEN_FRESH_MS;
}

function mint(): Promise<Token | null> {
  if (inflight) return inflight;
  setStore({ error: null });
  inflight = createWebHandoffAction()
    .catch((): WebHandoffResult => ({ error: MINT_ERROR }))
    .then((result) => {
      inflight = null;
      if (listeners.size === 0) {
        store = EMPTY;
        return null;
      }
      const token = result.tokenHash ? { hash: result.tokenHash, mintedAt: Date.now() } : null;
      setStore({ token, error: token ? null : (result.error ?? MINT_ERROR) });
      return token;
    });
  return inflight;
}

/** Mints unless a usable token is already here or on its way. */
function prepare() {
  if (inflight || isFresh(store.token)) return;
  const wait = lastOpenedAt + REMINT_AFTER_OPEN_MS - Date.now();
  if (wait > 0) {
    setTimeout(prepare, wait);
    return;
  }
  void mint();
}

/** True once the app goes to the background (the browser came up), false
 * if it's still in front after LEAVE_TIMEOUT_MS. window.open can't say:
 * Capacitor hands the URL to iOS and returns null whether it opened or
 * not, which is how the old button came to claim a browser had opened
 * when it hadn't. */
function watchForLeave(): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (left: boolean) => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      resolve(left);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") finish(true);
    };
    const onBlur = () => finish(true);
    const timer = setTimeout(() => finish(false), LEAVE_TIMEOUT_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
  });
}

/**
 * The native app's way out to the website, signed in, landing on
 * `nextPath` (see createWebHandoffAction for why purchases leave the app).
 *
 * iOS only lets a page open the browser from inside the tap itself.
 * Fetching a sign-in token first and opening afterwards — what this used
 * to do — is no longer the tap by the time the token arrives, so iOS
 * quietly refused. Here the token is fetched ahead of time, and once it's
 * here the button is a plain link the tap follows directly. A tap that
 * beats the token still works, with one extra tap at worst, and the
 * message below only says the browser opened once the app has actually
 * gone to the background.
 *
 * Native only — callers render their web version off-native.
 */
export function WebHandoffButton({
  nextPath,
  label,
  note = `Opens ${SITE_HOST} in your browser, already signed in.`,
  prepareWhen = "mount",
  className = "",
}: {
  /** Where the browser lands: the page, and the spot on it, the person
   * tapped from. */
  nextPath: string;
  label: string;
  note?: string;
  /** "visible" waits until the button scrolls into view, for pages lots
   * of people open without meaning to leave the app. */
  prepareWhen?: "mount" | "visible";
  className?: string;
}) {
  const { token, error } = useSyncExternalStore(subscribe, () => store, () => EMPTY);
  const [phase, setPhase] = useState<"idle" | "opening" | "opened" | "stayed">("idle");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let seen = prepareWhen === "mount" || typeof IntersectionObserver === "undefined";
    let observer: IntersectionObserver | undefined;
    if (seen) {
      prepare();
    } else if (rootRef.current) {
      observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        seen = true;
        observer?.disconnect();
        prepare();
      });
      observer.observe(rootRef.current);
    }
    // Back in the app after a while, or after the browser used the last
    // token: have a fresh one ready before the next tap.
    const onVisibility = () => {
      if (seen && document.visibilityState === "visible") prepare();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [prepareWhen]);

  async function confirmLeft() {
    setPhase("opening");
    const left = await watchForLeave();
    if (left) {
      lastOpenedAt = Date.now();
      // Spent — the browser is redeeming it.
      setStore({ token: null });
    }
    setPhase(left ? "opened" : "stayed");
  }

  // Nothing usable yet (still on its way, failed, or lapsed): get a token,
  // then open. iOS may refuse by now, since it's no longer the tap doing
  // it; confirmLeft notices, and the button is a ready link by then, so
  // the next tap opens for certain.
  async function openAfterMint() {
    setPhase("opening");
    const fresh = isFresh(store.token) ? store.token : await mint();
    if (!fresh) {
      setPhase("idle");
      return;
    }
    openExternalBrowser(webHandoffUrl(fresh.hash, nextPath));
    await confirmLeft();
  }

  function handleLinkClick(event: MouseEvent<HTMLAnchorElement>) {
    if (phase === "opening") {
      event.preventDefault();
      return;
    }
    if (!isFresh(store.token)) {
      event.preventDefault();
      void openAfterMint();
      return;
    }
    void confirmLeft();
  }

  const busy = phase === "opening";
  let message = note;
  let isProblem = false;
  if (phase === "opened") message = "Opened in your browser. Finish up there.";
  if (phase === "stayed") {
    message = "Your browser didn't open. Tap again.";
    isProblem = true;
  }
  if (error && !token && !busy) {
    message = error;
    isProblem = true;
  }

  const content = (
    <>
      {busy && <Spinner className="h-4 w-4" />}
      {label}
    </>
  );

  return (
    <div ref={rootRef} className={`flex flex-col items-center gap-2 ${className}`}>
      {token ? (
        <a
          href={webHandoffUrl(token.hash, nextPath)}
          target="_blank"
          rel="noopener"
          onClick={handleLinkClick}
          aria-disabled={busy || undefined}
          className={`${HANDOFF_BUTTON_CLASS} w-full ${busy ? "opacity-70" : ""}`}
        >
          {content}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void openAfterMint()}
          disabled={busy}
          className={`${HANDOFF_BUTTON_CLASS} w-full disabled:opacity-70`}
        >
          {content}
        </button>
      )}
      <p
        aria-live="polite"
        className={`text-center text-[0.8125rem] ${isProblem ? "text-danger" : "text-muted"}`}
      >
        {message}
      </p>
    </div>
  );
}
