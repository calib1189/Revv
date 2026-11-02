// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installEdgeSwipeBack } from "./edge-swipe-back";

function touch(type: string, x: number, y: number) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: { clientX: number; clientY: number }[];
  };
  e.touches = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  document.dispatchEvent(e);
  return e;
}

function swipe(from: [number, number], to: [number, number]) {
  touch("touchstart", from[0], from[1]);
  const mid = touch("touchmove", (from[0] + to[0]) / 2, (from[1] + to[1]) / 2);
  touch("touchmove", to[0], to[1]);
  touch("touchend", to[0], to[1]);
  return mid;
}

describe("installEdgeSwipeBack", () => {
  let back: ReturnType<typeof vi.fn>;
  let remove: () => void;

  beforeEach(() => {
    back = vi.fn();
    vi.spyOn(window.history, "back").mockImplementation(back as () => void);
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    remove = installEdgeSwipeBack();
  });

  afterEach(() => {
    remove();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("goes back after a long rightward swipe that starts at the left edge", () => {
    swipe([4, 400], [140, 410]);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("blocks the page from scrolling sideways under the drag", () => {
    expect(swipe([4, 400], [140, 400]).defaultPrevented).toBe(true);
  });

  it("ignores a short swipe", () => {
    swipe([4, 400], [40, 400]);
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores a swipe that doesn't start at the edge", () => {
    swipe([120, 400], [260, 400]);
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores a mostly vertical drag from the edge, and leaves scrolling alone", () => {
    expect(swipe([4, 300], [60, 520]).defaultPrevented).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores a leftward swipe", () => {
    swipe([10, 400], [-80, 400]);
    expect(back).not.toHaveBeenCalled();
  });

  it("does nothing when there is no earlier screen to return to", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    swipe([4, 400], [140, 400]);
    expect(back).not.toHaveBeenCalled();
  });

  it("ignores a swipe that starts inside an opted-out screen", () => {
    const screen = document.createElement("div");
    screen.setAttribute("data-no-edge-swipe", "");
    const inner = document.createElement("button");
    screen.appendChild(inner);
    document.body.appendChild(screen);
    const start = new Event("touchstart", { bubbles: true, cancelable: true }) as Event & {
      touches: { clientX: number; clientY: number }[];
    };
    start.touches = [{ clientX: 4, clientY: 400 }];
    inner.dispatchEvent(start);
    touch("touchmove", 70, 400);
    touch("touchmove", 140, 400);
    touch("touchend", 140, 400);
    expect(back).not.toHaveBeenCalled();
  });

  it("stops listening once removed", () => {
    remove();
    swipe([4, 400], [140, 400]);
    expect(back).not.toHaveBeenCalled();
  });
});
