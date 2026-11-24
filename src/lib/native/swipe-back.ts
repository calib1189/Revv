// Swipe right to go back, the way TikTok (and iOS itself) does it: the
// page you're on follows your finger, the page you're going back to sits
// underneath, a little to the left and dimmed, and slides into place as
// you drag. Let go past halfway, or flick, and it finishes; otherwise it
// springs back.
//
// Where it starts: on the four tabs, which swipe sideways between each
// other, only from the left edge. Everywhere else (a car, a profile, a
// post, a battle) from anywhere on the screen, unless what's under the
// finger drags sideways itself.
//
// Done in the page rather than with WKWebView's own back gesture so it
// ships with the web build (no app update) and can start mid-screen.
// Only installed inside the native shell (NativeAppBridge); a phone
// browser has its own edge gesture, and both would go back twice.
import { TAB_HREFS } from "@/components/shell/tab-order";
import { capturePage, type PageSnapshot } from "@/lib/native/page-snapshot";
import {
  forgetCurrentPageSnapshot,
  installPageHistory,
  previousPageSnapshot,
} from "@/lib/native/page-history";

const EDGE_PX = 24; // a touch this close to the left edge is an edge swipe
const LOCK_PX = 8; // movement before we decide horizontal vs. vertical
const PARALLAX = 0.3; // the page underneath starts 30% of a screen to the left
const DIM = 0.3; // and this much darker
const FLICK_SPEED = 0.35; // px/ms, about 350pt a second: a flick right finishes
const FLICK_MIN_PX = 30; // ...once it has moved this far
const RETURN_SPEED = -0.2; // a flick back to the left cancels
const VELOCITY_WINDOW_MS = 50; // release speed from the last few frames, like UIKit
const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)"; // fast, then settles, like UIKit
const ARRIVE_TIMEOUT_MS = 1200;
const RESTORE_POLL_MS = 40;
const RESTORE_TIMEOUT_MS = 900;

/** Whether a swipe from anywhere goes back on this page: everywhere but
 * the tabs, whose pager owns sideways swipes. */
export function swipesBackFromAnywhere(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  return path !== "/" && !(TAB_HREFS as readonly string[]).includes(path);
}

/** UIKit's rule for finishing an interactive back: a flick decides it,
 * otherwise whether you let go past halfway. Speeds in px/ms. */
export function shouldFinish(progress: number, velocity: number, dx: number): boolean {
  if (velocity >= FLICK_SPEED && dx >= FLICK_MIN_PX) return true;
  if (velocity <= RETURN_SPEED) return false;
  return progress > 0.5;
}

/** How long the page takes to finish or spring back from where it was
 * let go: quicker the further along and the faster the flick. */
export function settleMs(remainingPx: number, velocity: number): number {
  const speed = Math.max(Math.abs(velocity), 1);
  return Math.round(Math.min(340, Math.max(160, (remainingPx / speed) * 1.4)));
}

/** True when something under the finger drags sideways on its own: a text
 * field or slider, anything that set touch-action (editors, scrubbers, the
 * story viewer, chip rows), or a carousel that can still scroll back. A
 * carousel already on its first item has nowhere to go, so the swipe is
 * a back swipe, as in TikTok. */
function ownsSidewaysDrag(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches("input, textarea, select, [contenteditable='true']")) return true;
    const style = getComputedStyle(el);
    if (style.touchAction && style.touchAction !== "auto" && style.touchAction !== "manipulation") return true;
    const scrollsX = style.overflowX === "auto" || style.overflowX === "scroll";
    if (scrollsX && el.scrollWidth > el.clientWidth && el.scrollLeft > 0) return true;
  }
  return false;
}

interface Scene {
  root: HTMLDivElement;
  under: HTMLDivElement;
  dim: HTMLDivElement;
  top: HTMLDivElement;
  shadow: HTMLDivElement;
  current: PageSnapshot;
  previous: PageSnapshot | null;
}

function layer(background: string): HTMLDivElement {
  const el = document.createElement("div");
  // Always transformed, so the copy's fixed bars (the tab bar) are placed
  // against this layer rather than the screen.
  el.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${background};transform:translate3d(0,0,0);will-change:transform;`;
  return el;
}

function buildScene(): Scene {
  const bodyStyle = getComputedStyle(document.body);
  const background = bodyStyle.backgroundColor || "#000";
  const current = capturePage();
  const previous = previousPageSnapshot();

  const root = document.createElement("div");
  root.setAttribute("data-swipe-back", "");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;";

  const under = layer(background);
  const dim = document.createElement("div");
  dim.style.cssText = `position:absolute;inset:0;background:#000;opacity:${DIM};will-change:opacity;`;
  const top = layer(background);
  top.style.overflow = "visible";
  const clip = document.createElement("div");
  clip.style.cssText = "position:absolute;inset:0;overflow:hidden;transform:translate3d(0,0,0);";
  const shadow = document.createElement("div");
  shadow.style.cssText =
    "position:absolute;top:0;bottom:0;left:-18px;width:18px;pointer-events:none;" +
    "background:linear-gradient(to left, rgba(0,0,0,0.32), rgba(0,0,0,0));will-change:opacity;";
  top.append(shadow, clip);
  root.append(under, dim, top);
  document.body.appendChild(root);

  previous?.mount(under);
  current.mount(clip);
  return { root, under, dim, top, shadow, current, previous };
}

function place(scene: Scene, dx: number, width: number) {
  const progress = Math.min(1, Math.max(0, dx / width));
  scene.top.style.transform = `translate3d(${dx}px,0,0)`;
  scene.under.style.transform = `translate3d(${-PARALLAX * width * (1 - progress)}px,0,0)`;
  scene.dim.style.opacity = String(DIM * (1 - progress));
  scene.shadow.style.opacity = String(1 - progress * 0.6);
}

function animate(scene: Scene, ms: number, on: boolean) {
  const t = on ? `transform ${ms}ms ${EASE}` : "none";
  const o = on ? `opacity ${ms}ms ${EASE}` : "none";
  scene.top.style.transition = t;
  scene.under.style.transition = t;
  scene.dim.style.transition = o;
  scene.shadow.style.transition = o;
}

function teardown(scene: Scene, fadeMs = 0) {
  const finish = () => {
    scene.previous?.unmount();
    scene.current.unmount();
    scene.root.remove();
  };
  if (fadeMs <= 0) return finish();
  scene.root.style.transition = `opacity ${fadeMs}ms ease-out`;
  scene.root.style.opacity = "0";
  setTimeout(finish, fadeMs + 20);
}

/** Resolves when the browser has moved back (popstate), or gives up. */
function waitForArrival(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", done);
      resolve();
    };
    const timer = setTimeout(done, ARRIVE_TIMEOUT_MS);
    window.addEventListener("popstate", done);
  });
}

/** Puts the page you came back to where it was left (what the copy
 * underneath showed), once it has drawn enough to get there. Gives up
 * after RESTORE_TIMEOUT_MS; resolves either way. */
function restoreScroll(landing: PageSnapshot | null): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    let settled = 0;
    const tick = () => {
      const there = landing ? landing.restoreScroll() : true;
      settled = there ? settled + 1 : 0;
      // Two checks in a row in the right place: the page isn't still
      // growing under us.
      if (settled >= 2 || Date.now() - started > RESTORE_TIMEOUT_MS) resolve();
      else setTimeout(tick, RESTORE_POLL_MS);
    };
    setTimeout(tick, RESTORE_POLL_MS);
  });
}

export function installSwipeBack(): () => void {
  const removeHistory = installPageHistory();
  let scene: Scene | null = null;
  let busy = false; // finishing or springing back
  let tracking = false;
  let horizontal = false;
  let fromEdge = true;
  let startX = 0;
  let startY = 0;
  let dx = 0;
  let width = 1;
  let samples: { x: number; t: number }[] = [];

  function velocity(): number {
    const now = Date.now();
    const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    return (last.x - first.x) / Math.max(1, last.t - first.t);
  }

  function onStart(e: TouchEvent) {
    if (busy || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (window.history.length <= 1) return;
    // Screens where a stray swipe would throw away work in progress (the
    // camera mid-recording, an editor) or close something open (a sheet,
    // the photo viewer) opt out.
    if (e.target instanceof Element && e.target.closest("[data-no-edge-swipe]")) return;
    fromEdge = t.clientX <= EDGE_PX;
    if (!fromEdge && (!swipesBackFromAnywhere(window.location.pathname) || ownsSidewaysDrag(e.target))) return;
    tracking = true;
    horizontal = false;
    startX = t.clientX;
    startY = t.clientY;
    dx = 0;
    width = window.innerWidth || 1;
    samples = [{ x: t.clientX, t: Date.now() }];
  }

  function onMove(e: TouchEvent) {
    if (!tracking) return;
    const t = e.touches[0];
    dx = t.clientX - startX;
    const dy = t.clientY - startY;
    samples.push({ x: t.clientX, t: Date.now() });
    if (samples.length > 12) samples.shift();
    if (!horizontal) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      // Mostly sideways and rightward is a back swipe; anything else is a
      // normal scroll/drag and is left completely alone. Mid-screen, where
      // people mostly scroll, it has to be clearly sideways.
      if (dx > 0 && dx > Math.abs(dy) * (fromEdge ? 1.5 : 2)) {
        horizontal = true;
        try {
          scene = buildScene();
        } catch (err) {
          console.error("swipe back: couldn't draw the pages", err);
          scene = null;
        }
      } else {
        tracking = false;
        return;
      }
    }
    // Stops the page scrolling, or the tab pager moving, under the drag.
    if (e.cancelable) e.preventDefault();
    if (scene) place(scene, Math.max(0, dx), width);
  }

  function onEnd() {
    if (!tracking) return;
    tracking = false;
    if (!horizontal) return;
    const v = velocity();
    const go = shouldFinish(Math.max(0, dx) / width, v, dx);
    const active = scene;
    scene = null;

    if (!active) {
      if (go) window.history.back();
      return;
    }
    busy = true;
    const ms = settleMs(go ? width - Math.max(0, dx) : Math.max(0, dx), v);
    animate(active, ms, true);
    place(active, go ? width : 0, width);

    setTimeout(() => {
      if (!go) {
        animate(active, 0, false);
        teardown(active);
        busy = false;
        return;
      }
      const landing = active.previous;
      const arrived = waitForArrival();
      window.history.back();
      void arrived
        .then(() => restoreScroll(landing))
        .then(() => {
          // The real page now matches the copy: lift the copy off it.
          forgetCurrentPageSnapshot();
          teardown(active, 140);
          busy = false;
        });
    }, ms);
  }

  function onCancel() {
    if (!tracking) return;
    tracking = false;
    const active = scene;
    scene = null;
    if (!active) return;
    busy = true;
    animate(active, 200, true);
    place(active, 0, width);
    setTimeout(() => {
      teardown(active);
      busy = false;
    }, 200);
  }

  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd, { passive: true });
  document.addEventListener("touchcancel", onCancel, { passive: true });

  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", onCancel);
    if (scene) teardown(scene);
    scene = null;
    removeHistory();
  };
}
