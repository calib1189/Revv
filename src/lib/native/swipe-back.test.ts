// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSwipeBack, settleMs, shouldFinish, swipesBackFromAnywhere } from "./swipe-back";

const STEP_MS = 16;

function fire(target: EventTarget, type: string, x: number, y: number) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: { clientX: number; clientY: number }[];
  };
  e.touches = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  target.dispatchEvent(e);
  return e;
}

/** A drag in `steps` moves, one frame apart, then let go. Returns the
 * first move event (to check whether scrolling was blocked). */
function drag(from: [number, number], to: [number, number], { steps = 6, stepMs = STEP_MS, on = document as EventTarget } = {}) {
  fire(on, "touchstart", from[0], from[1]);
  let first: Event | null = null;
  for (let i = 1; i <= steps; i++) {
    vi.advanceTimersByTime(stepMs);
    const x = from[0] + ((to[0] - from[0]) * i) / steps;
    const y = from[1] + ((to[1] - from[1]) * i) / steps;
    const e = fire(document, "touchmove", x, y);
    first ??= e;
  }
  fire(document, "touchend", to[0], to[1]);
  return first!;
}

/** Lets the finish/spring-back animation and the arrival wait run out. */
async function settle() {
  await vi.advanceTimersByTimeAsync(2000);
}

describe("swipesBackFromAnywhere", () => {
  it("is off on the tabs and on for everything under them", () => {
    for (const path of ["/", "/garage", "/feed", "/discover", "/leaderboard", "/feed/"]) {
      expect(swipesBackFromAnywhere(path)).toBe(false);
    }
    for (const path of ["/garage/abc", "/u/someone", "/battle", "/battle/xyz", "/daily", "/store"]) {
      expect(swipesBackFromAnywhere(path)).toBe(true);
    }
  });
});

describe("shouldFinish", () => {
  it("finishes past halfway, or on a flick right", () => {
    expect(shouldFinish(0.6, 0, 240)).toBe(true);
    expect(shouldFinish(0.2, 0.8, 80)).toBe(true);
  });
  it("springs back short of halfway, on a flick back, or a flick too small to mean it", () => {
    expect(shouldFinish(0.3, 0.1, 120)).toBe(false);
    expect(shouldFinish(0.7, -0.5, 280)).toBe(false);
    expect(shouldFinish(0.05, 2, 20)).toBe(false);
  });
});

describe("settleMs", () => {
  it("is quicker for a short way left or a fast flick, within bounds", () => {
    expect(settleMs(40, 0)).toBe(160);
    expect(settleMs(400, 0)).toBe(340);
    expect(settleMs(300, 3)).toBeLessThan(settleMs(300, 1));
  });
});

describe("installSwipeBack", () => {
  let back: ReturnType<typeof vi.fn>;
  let remove: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    back = vi.fn();
    vi.spyOn(window.history, "back").mockImplementation(back as () => void);
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    remove = installSwipeBack();
  });

  afterEach(() => {
    remove();
    window.history.replaceState(null, "", "/");
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  const overlay = () => document.querySelector("[data-swipe-back]");

  it("goes back after a long rightward swipe from the left edge, once the page has slid off", async () => {
    drag([4, 400], [260, 410]);
    expect(back).not.toHaveBeenCalled();
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("draws the page riding the finger while dragging, and clears it after", async () => {
    document.body.innerHTML = "<main><p>On this page</p></main>";
    fire(document, "touchstart", 4, 400);
    vi.advanceTimersByTime(STEP_MS);
    fire(document, "touchmove", 40, 400);
    vi.advanceTimersByTime(STEP_MS);
    fire(document, "touchmove", 120, 400);
    const scene = overlay();
    expect(scene).not.toBeNull();
    expect(scene!.textContent).toContain("On this page");
    expect(scene!.querySelector("[data-swipe-snapshot]")).not.toBeNull();
    fire(document, "touchend", 120, 400);
    await settle();
    expect(overlay()).toBeNull();
  });

  it("blocks the page from scrolling sideways under the drag", () => {
    expect(drag([4, 400], [260, 400]).defaultPrevented).toBe(true);
  });

  it("springs back on a slow drag that stops short of halfway", async () => {
    drag([4, 400], [150, 400], { steps: 10, stepMs: 60 });
    await settle();
    expect(back).not.toHaveBeenCalled();
    expect(overlay()).toBeNull();
  });

  it("goes back on a quick flick even short of halfway", async () => {
    drag([4, 400], [120, 400], { steps: 3 });
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("springs back if you drag right and then flick back left", async () => {
    fire(document, "touchstart", 4, 400);
    for (const x of [60, 140, 240, 300]) {
      vi.advanceTimersByTime(STEP_MS);
      fire(document, "touchmove", x, 400);
    }
    for (const x of [260, 200, 150]) {
      vi.advanceTimersByTime(STEP_MS);
      fire(document, "touchmove", x, 400);
    }
    fire(document, "touchend", 150, 400);
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("on a tab, ignores a swipe that doesn't start at the edge (the pager owns it)", async () => {
    window.history.replaceState(null, "", "/garage");
    drag([120, 400], [380, 400]);
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("on any other page, goes back on a swipe from the middle of the screen", async () => {
    window.history.replaceState(null, "", "/garage/abc");
    drag([140, 400], [390, 410]);
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("leaves a mostly vertical drag alone, and lets it scroll", async () => {
    window.history.replaceState(null, "", "/garage/abc");
    expect(drag([140, 300], [220, 520]).defaultPrevented).toBe(false);
    await settle();
    expect(back).not.toHaveBeenCalled();
    expect(overlay()).toBeNull();
  });

  it("ignores a leftward swipe", async () => {
    window.history.replaceState(null, "", "/garage/abc");
    drag([300, 400], [40, 400]);
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("from mid-screen, leaves a carousel that can still scroll back to itself", async () => {
    window.history.replaceState(null, "", "/p/abc");
    const strip = document.createElement("div");
    strip.style.overflowX = "auto";
    Object.defineProperty(strip, "scrollWidth", { value: 1200 });
    Object.defineProperty(strip, "clientWidth", { value: 400 });
    const photo = document.createElement("img");
    strip.appendChild(photo);
    document.body.appendChild(strip);

    strip.scrollLeft = 400;
    drag([140, 400], [390, 400], { on: photo });
    await settle();
    expect(back).not.toHaveBeenCalled();

    // On its first photo there's nothing to scroll back to: that's a back swipe.
    strip.scrollLeft = 0;
    drag([140, 400], [390, 400], { on: photo });
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("from mid-screen, leaves sliders and things with their own drag alone", async () => {
    window.history.replaceState(null, "", "/garage/abc");
    const slider = document.createElement("input");
    slider.type = "range";
    const pad = document.createElement("div");
    pad.style.touchAction = "none";
    document.body.append(slider, pad);
    drag([140, 400], [390, 400], { on: slider });
    drag([140, 400], [390, 400], { on: pad });
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("does nothing when there is no earlier screen to return to", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    drag([4, 400], [300, 400]);
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores a swipe that starts inside an opted-out screen", async () => {
    const screen = document.createElement("div");
    screen.setAttribute("data-no-edge-swipe", "");
    const inner = document.createElement("button");
    screen.appendChild(inner);
    document.body.appendChild(screen);
    drag([4, 400], [300, 400], { on: inner });
    await settle();
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores new touches while the page is still sliding off", async () => {
    drag([4, 400], [300, 400]);
    drag([4, 400], [300, 400]);
    await settle();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("stops listening once removed", async () => {
    remove();
    drag([4, 400], [300, 400]);
    await settle();
    expect(back).not.toHaveBeenCalled();
    remove = () => {};
  });
});
