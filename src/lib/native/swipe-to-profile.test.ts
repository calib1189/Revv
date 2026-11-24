// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installSwipeToProfile } from "./swipe-to-profile";

const STEP_MS = 16;

function fire(target: EventTarget, type: string, x: number, y: number) {
  const e = new Event(type, { bubbles: true, cancelable: true }) as Event & {
    touches: { clientX: number; clientY: number }[];
  };
  e.touches = type === "touchend" ? [] : [{ clientX: x, clientY: y }];
  target.dispatchEvent(e);
  return e;
}

function drag(on: EventTarget, from: [number, number], to: [number, number], { steps = 6, stepMs = STEP_MS } = {}) {
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

describe("installSwipeToProfile", () => {
  let navigate: ReturnType<typeof vi.fn<(href: string) => void>>;
  let remove: () => void;
  let post: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    navigate = vi.fn<(href: string) => void>();
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    post = document.createElement("div");
    post.setAttribute("data-profile-swipe", "/u/mike?from=p1");
    post.setAttribute("data-profile-username", "mike");
    post.innerHTML = "<span>photo</span>";
    document.body.appendChild(post);
    remove = installSwipeToProfile(navigate);
  });

  afterEach(() => {
    remove();
    document.body.innerHTML = "";
    vi.useRealTimers();
  });

  it("opens the creator's profile on a swipe left past halfway", async () => {
    const first = drag(post.firstElementChild!, [380, 300], [120, 310]);
    expect(first.defaultPrevented).toBe(true); // the feed doesn't scroll under it
    await vi.advanceTimersByTimeAsync(3000);
    expect(navigate).toHaveBeenCalledWith("/u/mike?from=p1");
  });

  it("opens it on a short, fast flick", async () => {
    drag(post, [300, 300], [230, 302], { steps: 3, stepMs: 12 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("springs back on a slow, short drag", async () => {
    drag(post, [300, 300], [240, 300], { steps: 10, stepMs: 60 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves vertical swipes (the feed) and rightward ones (the tabs) alone", async () => {
    const vertical = drag(post, [200, 600], [210, 150]);
    const rightward = drag(post, [100, 300], [380, 300]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(vertical.defaultPrevented).toBe(false);
    expect(rightward.defaultPrevented).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("only works on a post", async () => {
    const elsewhere = document.createElement("div");
    document.body.appendChild(elsewhere);
    drag(elsewhere, [380, 300], [60, 300]);
    await vi.advanceTimersByTimeAsync(3000);
    expect(navigate).not.toHaveBeenCalled();
  });
});
