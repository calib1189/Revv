// Swipe left on a feed post to open its creator's profile, the way TikTok
// does: the post slides away under your finger with the profile attached
// to its right edge, like the next page of a pager. Let go past halfway,
// or flick, and it carries on to the profile; otherwise it springs back.
//
// The Feed is the last tab (tab-order.ts), so a leftward swipe on it has
// nothing else to do. The profile is usually already loaded (the feed
// preloads it once you've stayed on a post, lib/navigation/prefetch.ts),
// so it's there as soon as the swipe lands. The copy of the feed taken
// for the swipe is kept, so swiping back from the profile shows the feed
// underneath (page-history.ts, swipe-back.ts).
//
// Installed with swipe-back, inside the app only (NativeAppBridge).
import { capturePage, type PageSnapshot } from "@/lib/native/page-snapshot";
import { noteLeavingWith } from "@/lib/native/page-history";
import { settleMs, shouldFinish } from "@/lib/native/swipe-back";

/** Marks a feed post; carries where a swipe left goes and who it is. */
export const PROFILE_SWIPE_ATTR = "data-profile-swipe";

const LOCK_PX = 8;
const VELOCITY_WINDOW_MS = 50;
const EASE = "cubic-bezier(0.2, 0.9, 0.3, 1)";
const ARRIVE_TIMEOUT_MS = 2500;
const ARRIVE_POLL_MS = 40;

interface Target {
  href: string;
  username: string;
  avatarUrl: string | null;
}

/** Something under the finger that drags left on its own: a field, a
 * scrubber (anything with its own touch-action), or a photo carousel
 * that still has photos to its right. On the last photo the swipe is
 * the profile's, as in TikTok. */
function ownsLeftwardDrag(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el && el !== document.body; el = el.parentElement) {
    if (el.matches("input, textarea, select, [contenteditable='true']")) return true;
    const style = getComputedStyle(el);
    if (style.touchAction && style.touchAction !== "auto" && style.touchAction !== "manipulation") return true;
    const scrollsX = style.overflowX === "auto" || style.overflowX === "scroll";
    // (The tab pager is one of these too, but with the Feed last it has
    // nothing to its right, so it never claims the swipe.)
    if (scrollsX && el.scrollWidth - el.clientWidth - el.scrollLeft > 1) return true;
  }
  return false;
}

function readTarget(el: Element): Target | null {
  const href = el.getAttribute(PROFILE_SWIPE_ATTR);
  const username = el.getAttribute("data-profile-username");
  if (!href || !username || !href.startsWith("/u/")) return null;
  return { href, username, avatarUrl: el.getAttribute("data-profile-avatar") || null };
}

interface Scene {
  root: HTMLDivElement;
  page: HTMLDivElement;
  next: HTMLDivElement;
  copy: PageSnapshot;
}

/** The profile that rides in: its avatar and name where the real page
 * puts them, and quiet placeholders for the rest, which the real page
 * replaces the moment it's there. */
function profilePanel(target: Target, background: string, color: string): HTMLDivElement {
  const panel = document.createElement("div");
  panel.style.cssText = `position:absolute;inset:0;background:${background};color:${color};will-change:transform;`;
  const inner = document.createElement("div");
  inner.style.cssText =
    "display:flex;flex-direction:column;align-items:center;gap:14px;" +
    "padding-top:calc(env(safe-area-inset-top) + 56px + 36px);";
  const avatar = document.createElement("div");
  avatar.style.cssText =
    "width:128px;height:128px;border-radius:9999px;overflow:hidden;background:rgba(127,127,127,0.18);" +
    "box-shadow:0 0 0 3px rgba(127,127,127,0.25);";
  if (target.avatarUrl) {
    const img = document.createElement("img");
    img.src = target.avatarUrl;
    img.alt = "";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;";
    avatar.appendChild(img);
  }
  const name = document.createElement("div");
  name.textContent = `@${target.username}`;
  name.style.cssText = "font-size:1.75rem;font-weight:700;letter-spacing:-0.02em;margin-top:6px;";
  inner.append(avatar, name);
  for (const width of ["38%", "72%", "56%"]) {
    const bar = document.createElement("div");
    bar.style.cssText = `width:${width};height:14px;border-radius:7px;background:rgba(127,127,127,0.14);`;
    inner.appendChild(bar);
  }
  panel.appendChild(inner);
  return panel;
}

function buildScene(target: Target, copy: PageSnapshot): Scene {
  const bodyStyle = getComputedStyle(document.body);
  const background = bodyStyle.backgroundColor || "#000";
  const root = document.createElement("div");
  // Marked like swipe-back's scene, so page-history never mistakes a tap
  // on it for leaving the page.
  root.setAttribute("data-swipe-back", "");
  root.setAttribute("aria-hidden", "true");
  root.style.cssText = "position:fixed;inset:0;z-index:2147483646;pointer-events:none;overflow:hidden;";
  const page = document.createElement("div");
  page.style.cssText = `position:absolute;inset:0;overflow:hidden;background:${background};transform:translate3d(0,0,0);will-change:transform;`;
  const next = profilePanel(target, background, bodyStyle.color || "#fff");
  root.append(page, next);
  document.body.appendChild(root);
  copy.mount(page);
  return { root, page, next, copy };
}

/** `dx` is how far left the post has gone (0 to width). */
function place(scene: Scene, dx: number, width: number) {
  scene.page.style.transform = `translate3d(${-dx}px,0,0)`;
  scene.next.style.transform = `translate3d(${width - dx}px,0,0)`;
}

function animate(scene: Scene, ms: number, on: boolean) {
  const t = on ? `transform ${ms}ms ${EASE}` : "none";
  scene.page.style.transition = t;
  scene.next.style.transition = t;
}

function teardown(scene: Scene, fadeMs = 0) {
  const finish = () => {
    // The copy lives on as the feed's back-swipe copy: only take it out
    // of this scene, don't throw it away.
    scene.copy.unmount();
    scene.root.remove();
  };
  if (fadeMs <= 0) return finish();
  scene.root.style.transition = `opacity ${fadeMs}ms ease-out`;
  scene.root.style.opacity = "0";
  setTimeout(finish, fadeMs + 20);
}

/** Resolves once the profile is the page on screen (its path is in the
 * address bar and it has had a frame to draw), or gives up. */
function waitForProfile(username: string): Promise<void> {
  return new Promise((resolve) => {
    const started = Date.now();
    const target = `/u/${username}`;
    const tick = () => {
      if (window.location.pathname === target) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      } else if (Date.now() - started > ARRIVE_TIMEOUT_MS) {
        resolve();
      } else {
        setTimeout(tick, ARRIVE_POLL_MS);
      }
    };
    tick();
  });
}

export function installSwipeToProfile(navigate: (href: string) => void): () => void {
  let scene: Scene | null = null;
  let target: Target | null = null;
  let busy = false;
  let tracking = false;
  let horizontal = false;
  let startX = 0;
  let startY = 0;
  let dx = 0; // leftward distance, positive
  let width = 1;
  let samples: { x: number; t: number }[] = [];

  /** Leftward speed in px/ms, positive when moving left. */
  function velocity(): number {
    const now = Date.now();
    const recent = samples.filter((s) => now - s.t <= VELOCITY_WINDOW_MS);
    if (recent.length < 2) return 0;
    const first = recent[0];
    const last = recent[recent.length - 1];
    return (first.x - last.x) / Math.max(1, last.t - first.t);
  }

  function onStart(e: TouchEvent) {
    if (busy || e.touches.length !== 1 || !(e.target instanceof Element)) return;
    const post = e.target.closest(`[${PROFILE_SWIPE_ATTR}]`);
    if (!post || e.target.closest("[data-no-edge-swipe]") || ownsLeftwardDrag(e.target)) return;
    target = readTarget(post);
    if (!target) return;
    const t = e.touches[0];
    tracking = true;
    horizontal = false;
    startX = t.clientX;
    startY = t.clientY;
    dx = 0;
    width = window.innerWidth || 1;
    samples = [{ x: t.clientX, t: Date.now() }];
  }

  function onMove(e: TouchEvent) {
    if (!tracking || !target) return;
    const t = e.touches[0];
    const moved = startX - t.clientX;
    const dy = t.clientY - startY;
    samples.push({ x: t.clientX, t: Date.now() });
    if (samples.length > 12) samples.shift();
    if (!horizontal) {
      if (Math.abs(moved) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      // Clearly sideways and to the left; anything else is the feed's
      // own vertical swipe (or the pager's rightward one) and is left
      // completely alone.
      if (moved > 0 && moved > Math.abs(dy) * 1.5) {
        horizontal = true;
        try {
          scene = buildScene(target, capturePage());
        } catch (err) {
          console.error("swipe to profile: couldn't draw the pages", err);
          scene = null;
        }
      } else {
        tracking = false;
        return;
      }
    }
    if (e.cancelable) e.preventDefault();
    dx = Math.min(width, Math.max(0, moved));
    if (scene) place(scene, dx, width);
  }

  function onEnd() {
    if (!tracking) return;
    tracking = false;
    if (!horizontal || !target) return;
    const v = velocity();
    const go = shouldFinish(dx / width, v, dx);
    const active = scene;
    const to = target;
    scene = null;

    if (!active) {
      if (go) navigate(to.href);
      return;
    }
    busy = true;
    const ms = settleMs(go ? width - dx : dx, v);
    animate(active, ms, true);
    place(active, go ? width : 0, width);

    setTimeout(() => {
      if (!go) {
        animate(active, 0, false);
        teardown(active);
        busy = false;
        return;
      }
      noteLeavingWith(active.copy);
      navigate(to.href);
      void waitForProfile(to.username).then(() => {
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
  };
}
