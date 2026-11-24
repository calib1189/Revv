// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ENTRY_KEY,
  FROM_KEY,
  installPageHistory,
  previousPageSnapshot,
  stateForPush,
  stateForReplace,
} from "./page-history";

describe("stateForPush", () => {
  it("gives the new entry its own key and the key it came from", () => {
    const next = stateForPush({ __NA: true }, "abc");
    expect(next.__NA).toBe(true);
    expect(typeof next[ENTRY_KEY]).toBe("string");
    expect(next[ENTRY_KEY]).not.toBe("abc");
    expect(next[FROM_KEY]).toBe("abc");
  });
});

describe("stateForReplace", () => {
  it("carries the entry's keys over when Next.js rewrites its state", () => {
    const next = stateForReplace({ __NA: true, tree: 1 }, { [ENTRY_KEY]: "k", [FROM_KEY]: "f" }) as Record<string, unknown>;
    expect(next).toMatchObject({ __NA: true, tree: 1, [ENTRY_KEY]: "k", [FROM_KEY]: "f" });
  });
  it("leaves state alone when there's nothing to carry", () => {
    const data = { a: 1 };
    expect(stateForReplace(data, null)).toBe(data);
    expect(stateForReplace(null, { [ENTRY_KEY]: "k" })).toBeNull();
  });
});

describe("installPageHistory", () => {
  let remove: () => void;

  beforeEach(() => {
    window.history.replaceState({ __NA: true }, "", "/garage/one");
    document.body.innerHTML = '<main><h1>Car one</h1><a href="/u/owner">Owner</a></main>';
    remove = installPageHistory();
  });

  afterEach(() => {
    remove();
    window.history.replaceState(null, "", "/");
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("keeps a copy of the page you left by tapping, for going back to it", () => {
    document.querySelector("a")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    // Next.js swaps the page, then records the new entry.
    document.body.innerHTML = "<main><h1>Owner profile</h1></main>";
    window.history.pushState({ __NA: true }, "", "/u/owner");

    const holder = document.createElement("div");
    document.body.appendChild(holder);
    const snapshot = previousPageSnapshot();
    expect(snapshot).not.toBeNull();
    snapshot!.mount(holder);
    expect(holder.textContent).toContain("Car one");
    expect(holder.textContent).not.toContain("Owner profile");
  });

  it("keeps the link between pages when Next.js rewrites the entry", () => {
    document.querySelector("a")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    window.history.pushState({ __NA: true }, "", "/u/owner");
    window.history.replaceState({ __NA: true, fresh: true }, "", "/u/owner");
    expect(previousPageSnapshot()).not.toBeNull();
  });

  it("has nothing to show for a page left without a tap", () => {
    window.history.pushState({ __NA: true }, "", "/u/owner");
    expect(previousPageSnapshot()).toBeNull();
  });

  it("doesn't take copies for taps on plain text", () => {
    document.querySelector("h1")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    window.history.pushState({ __NA: true }, "", "/u/owner");
    expect(previousPageSnapshot()).toBeNull();
  });
});
