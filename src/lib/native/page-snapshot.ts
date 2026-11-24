// A still copy of the page as it looks right now, for the swipe-back
// gesture (swipe-back.ts) to draw: the page you're leaving rides your
// finger and the one you're going back to sits underneath, as in TikTok
// and iOS. Next.js unmounts a page when you leave it, so the one
// underneath is a copy taken on the way out (page-history.ts).
//
// It's a clone of the body's DOM, adjusted to look exactly as it did:
// the window scroll becomes an offset, inner scrollers (the tab pager, a
// carousel) keep their positions, sticky bars stay where they were stuck,
// and playing videos become a still of their current frame. Fixed
// elements (the tab bar) land in the right place because the layer the
// copy is drawn into is transformed, which makes it their containing block.

const SNAPSHOT_ATTR = "data-swipe-snapshot";
const SCROLLERS = '[class*="overflow-"], [class*="snap-"]';
// Elements that must not run or play twice, or aren't part of the page.
const DROP = "script, noscript, template, audio, iframe, next-route-announcer, [data-swipe-back]";

export interface PageSnapshot {
  /** window.scrollY when it was taken. */
  scrollY: number;
  /** Draws the copy into a layer that's already in the document. */
  mount(into: HTMLElement): void;
  /** Once you're back on the real page, scrolls it (the window and its
   * inner lists) to where the copy shows it. True once everything is
   * there; call again while the page is still drawing. */
  restoreScroll(): boolean;
  unmount(): void;
}

let styleInstalled = false;

/** A copy shouldn't replay entrance animations or transitions when it's
 * put on screen: it should look like a photo of the page. */
function installSnapshotStyle() {
  if (styleInstalled) return;
  styleInstalled = true;
  const style = document.createElement("style");
  style.textContent =
    `[${SNAPSHOT_ATTR}], [${SNAPSHOT_ATTR}] * { animation: none !important; transition: none !important; caret-color: transparent !important; }`;
  document.head.appendChild(style);
}

/** An element's position under body, as child indexes. */
function pathOf(el: Element): number[] {
  const path: number[] = [];
  let node: Element = el;
  while (node.parentElement) {
    path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    if (node.parentElement === document.body) break;
    node = node.parentElement;
  }
  return path;
}

function elementAt(path: number[]): Element | null {
  let found: Element | undefined = document.body;
  for (const i of path) found = found?.children[i];
  return found ?? null;
}

/** The clone of `el` inside `copy`, found by its position under body. */
function counterpart(el: Element, tops: Element[], copy: HTMLElement): HTMLElement | null {
  const path: number[] = [];
  let node: Element = el;
  while (node.parentElement && node.parentElement !== document.body) {
    path.unshift(Array.prototype.indexOf.call(node.parentElement.children, node));
    node = node.parentElement;
  }
  const top = tops.indexOf(node);
  if (top < 0) return null;
  let found: Element | undefined = copy.children[top];
  for (const i of path) found = found?.children[i];
  return found instanceof HTMLElement ? found : null;
}

/** A still of a video's current frame, sized for the screen. */
function videoStill(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  const rect = video.getBoundingClientRect();
  const scale = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round((rect.width || video.videoWidth) * scale));
  canvas.height = Math.max(1, Math.round((rect.height || video.videoHeight) * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Same cover crop the video draws with (object-cover everywhere in SORZA).
  const ratio = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
  const w = video.videoWidth * ratio;
  const h = video.videoHeight * ratio;
  try {
    ctx.drawImage(video, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  } catch {
    return null;
  }
  canvas.className = video.className;
  canvas.style.cssText = video.style.cssText;
  return canvas;
}

export function capturePage(): PageSnapshot {
  installSnapshotStyle();
  const body = document.body;
  const scrollY = window.scrollY;
  const tops = Array.from(body.children).filter((el) => !el.matches("[data-swipe-back]"));

  const copy = document.createElement("div");
  copy.className = body.className;
  copy.setAttribute(SNAPSHOT_ATTR, "");
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  for (const el of tops) copy.appendChild(el.cloneNode(true));

  // Find every clone that needs adjusting before changing any of them:
  // the adjustments move nodes, which would throw off the lookups.
  const stuck: { clone: HTMLElement; rect: DOMRect }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(".sticky")) {
    if (el.closest("[data-swipe-back]") || getComputedStyle(el).position !== "sticky") continue;
    const clone = counterpart(el, tops, copy);
    if (clone) stuck.push({ clone, rect: el.getBoundingClientRect() });
  }
  const scrolled: { clone: HTMLElement; top: number; left: number; path: number[]; className: string }[] = [];
  for (const el of document.querySelectorAll<HTMLElement>(SCROLLERS)) {
    if (!el.scrollTop && !el.scrollLeft) continue;
    const clone = counterpart(el, tops, copy);
    if (clone) scrolled.push({ clone, top: el.scrollTop, left: el.scrollLeft, path: pathOf(el), className: el.className });
  }
  const videos: { clone: HTMLElement; still: HTMLCanvasElement | null }[] = [];
  for (const el of document.querySelectorAll("video")) {
    const clone = counterpart(el, tops, copy);
    if (clone) videos.push({ clone, still: videoStill(el) });
  }
  const canvases: { clone: HTMLCanvasElement; source: HTMLCanvasElement }[] = [];
  for (const el of document.querySelectorAll("canvas")) {
    const clone = counterpart(el, tops, copy);
    if (clone instanceof HTMLCanvasElement) canvases.push({ clone, source: el });
  }
  const fields: { clone: HTMLElement; source: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement }[] = [];
  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select",
  )) {
    const clone = counterpart(el, tops, copy);
    if (clone) fields.push({ clone, source: el });
  }

  for (const { clone, rect } of stuck) {
    const spacer = document.createElement("div");
    spacer.style.height = `${rect.height}px`;
    clone.before(spacer);
    clone.style.position = "fixed";
    clone.style.top = `${rect.top}px`;
    clone.style.left = `${rect.left}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.margin = "0";
  }
  for (const { clone, still } of videos) {
    if (still) {
      clone.replaceWith(still);
    } else {
      // Not playing yet: keep its poster, and never load or play it.
      clone.removeAttribute("src");
      clone.removeAttribute("autoplay");
      clone.setAttribute("preload", "none");
      clone.querySelectorAll("source").forEach((s) => s.remove());
    }
  }
  for (const { clone, source } of canvases) {
    clone.width = source.width;
    clone.height = source.height;
    try {
      clone.getContext("2d")?.drawImage(source, 0, 0);
    } catch {
      // A WebGL or tainted canvas: left blank.
    }
  }
  for (const { clone, source } of fields) {
    if (source instanceof HTMLInputElement && clone instanceof HTMLInputElement) {
      clone.value = source.value;
      clone.checked = source.checked;
    } else if (clone instanceof HTMLTextAreaElement || clone instanceof HTMLSelectElement) {
      clone.value = source.value;
    }
  }
  copy.querySelectorAll(DROP).forEach((el) => el.remove());
  copy.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  copy.querySelectorAll("[autofocus]").forEach((el) => el.removeAttribute("autofocus"));

  return {
    scrollY,
    mount(into) {
      copy.style.cssText = `position:absolute;left:0;top:${-scrollY}px;width:${window.innerWidth}px;min-height:${window.innerHeight}px;margin:0;`;
      into.appendChild(copy);
      for (const { clone, top, left } of scrolled) {
        clone.scrollTop = top;
        clone.scrollLeft = left;
      }
    },
    restoreScroll() {
      let there = true;
      if (Math.abs(window.scrollY - scrollY) > 2) {
        window.scrollTo(0, scrollY);
        there = Math.abs(window.scrollY - scrollY) <= 2;
      }
      // Lists only, by the same spot in the page and the same classes:
      // sideways scrollers (the tab pager, carousels) place themselves.
      for (const { top, path, className } of scrolled) {
        if (!top) continue;
        const el = elementAt(path);
        if (!(el instanceof HTMLElement) || el.className !== className || el.closest("[data-swipe-back]")) continue;
        if (Math.abs(el.scrollTop - top) > 2) el.scrollTop = top;
        if (Math.abs(el.scrollTop - top) > 2) there = false;
      }
      return there;
    },
    unmount() {
      copy.remove();
    },
  };
}
