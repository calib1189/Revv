import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { installNativeKeyboardTracking, useNativeKeyboardHeight } from "./keyboard";

function fire(name: string, data: Record<string, unknown> = {}) {
  // The shape Capacitor's triggerEvent dispatches: a plain Event with the
  // data copied onto it.
  const e = new Event(name);
  Object.assign(e, data);
  act(() => {
    window.dispatchEvent(e);
  });
}

describe("native keyboard tracking", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    act(() => cleanup?.());
    cleanup = null;
  });

  it("follows the keyboard as it opens and closes", () => {
    cleanup = installNativeKeyboardTracking();
    const { result } = renderHook(() => useNativeKeyboardHeight());
    expect(result.current).toBe(0);

    fire("keyboardWillShow", { keyboardHeight: 336 });
    expect(result.current).toBe(336);
    expect(document.documentElement.style.getPropertyValue("--keyboard-h")).toBe("336px");
    expect(document.documentElement.hasAttribute("data-keyboard-open")).toBe(true);

    fire("keyboardWillHide");
    expect(result.current).toBe(0);
    expect(document.documentElement.hasAttribute("data-keyboard-open")).toBe(false);
  });

  it("ignores a show event without a usable height", () => {
    cleanup = installNativeKeyboardTracking();
    const { result } = renderHook(() => useNativeKeyboardHeight());
    fire("keyboardWillShow", { keyboardHeight: "tall" });
    expect(result.current).toBe(0);
  });

  it("stays at 0 when nothing is listening", () => {
    const { result } = renderHook(() => useNativeKeyboardHeight());
    fire("keyboardWillShow", { keyboardHeight: 300 });
    expect(result.current).toBe(0);
  });
});
