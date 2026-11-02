// Swipe in from the left edge to go back, like Safari and native iOS apps.
//
// Done in the page rather than with WKWebView's own back gesture so it works
// on the web build that's already live — flipping the native flag needs a new
// TestFlight build, and doing both would go back twice. Only started inside
// the native shell (NativeAppBridge); a normal mobile browser already has its
// own edge gesture.

const EDGE_PX = 24; // the touch has to start this close to the left edge
const LOCK_PX = 8; // movement before we decide horizontal vs. vertical
const COMMIT_PX = 72; // drag distance that counts as a back swipe
const MAX_PULL_PX = 56;

function createIndicator(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:fixed;left:0;top:50%;z-index:2147483647;width:40px;height:40px;margin-top:-20px;" +
    "border-radius:9999px;background:rgba(20,20,22,0.82);display:flex;align-items:center;" +
    "justify-content:center;pointer-events:none;opacity:0;transform:translateX(-48px)";
  el.innerHTML =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  return el;
}

export function installEdgeSwipeBack(): () => void {
  let indicator: HTMLDivElement | null = null;
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let horizontal = false;
  let dx = 0;

  function reset() {
    tracking = false;
    horizontal = false;
    dx = 0;
    if (indicator) {
      const el = indicator;
      el.style.transition = "transform 160ms ease-out, opacity 160ms ease-out";
      el.style.transform = "translateX(-48px)";
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 180);
      indicator = null;
    }
  }

  function onStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (t.clientX > EDGE_PX || window.history.length <= 1) return;
    // Screens where a stray swipe from the edge would throw away work in
    // progress (the camera mid-recording, an editor) opt out.
    if (e.target instanceof Element && e.target.closest("[data-no-edge-swipe]")) return;
    tracking = true;
    horizontal = false;
    startX = t.clientX;
    startY = t.clientY;
    dx = 0;
  }

  function onMove(e: TouchEvent) {
    if (!tracking) return;
    const t = e.touches[0];
    dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (!horizontal) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      // Mostly sideways and rightward is a back swipe; anything else is a
      // normal scroll/drag and is left completely alone.
      if (dx > 0 && dx > Math.abs(dy) * 1.5) {
        horizontal = true;
        indicator = createIndicator();
        document.body.appendChild(indicator);
      } else {
        tracking = false;
        return;
      }
    }
    // Stops the tab pager (or a carousel) scrolling sideways under the drag.
    if (e.cancelable) e.preventDefault();
    if (indicator) {
      const pull = Math.min(dx, MAX_PULL_PX);
      indicator.style.transition = "none";
      indicator.style.opacity = String(Math.min(1, dx / COMMIT_PX));
      indicator.style.transform = `translateX(${pull - 48 + 8}px)`;
    }
  }

  function onEnd() {
    if (!tracking) return;
    const commit = horizontal && dx >= COMMIT_PX;
    reset();
    if (commit) window.history.back();
  }

  document.addEventListener("touchstart", onStart, { passive: true });
  document.addEventListener("touchmove", onMove, { passive: false });
  document.addEventListener("touchend", onEnd, { passive: true });
  document.addEventListener("touchcancel", reset, { passive: true });

  return () => {
    document.removeEventListener("touchstart", onStart);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", onEnd);
    document.removeEventListener("touchcancel", reset);
    reset();
  };
}
