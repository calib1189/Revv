"use client";

import { useSyncExternalStore } from "react";

/*
 * The on-screen keyboard's height in the iOS app, known the moment it
 * starts to open rather than after it has finished.
 *
 * @capacitor/keyboard runs with `resize: "none"` (capacitor.config.ts):
 * the WebView is never resized or panned for the keyboard, and the gray
 * ⌃ ⌄ Done bar above it is gone. Instead the plugin fires
 * keyboardWillShow / keyboardWillHide on `window` with the final height,
 * and anything docked to the bottom (the DM composer, the comment sheet)
 * slides up by that much on the keyboard's own curve, the way TikTok's
 * and Instagram's composers ride on top of the keyboard.
 *
 * On the web, and in app builds without the plugin, these events never
 * fire: the height stays 0 and useVisualViewportBox's visualViewport
 * tracking is what moves things instead.
 */

/** Matches the keyboard's own slide closely enough that a composer on
 * top of it moves as one piece. */
export const KEYBOARD_TRANSITION = "340ms var(--ease-ios)";

let height = 0;
let installed = false;
const listeners = new Set<() => void>();

function set(next: number) {
  const value = Math.max(0, Math.round(next));
  if (value === height) return;
  height = value;
  document.documentElement.style.setProperty("--keyboard-h", `${value}px`);
  document.documentElement.toggleAttribute("data-keyboard-open", value > 0);
  listeners.forEach((l) => l());
}

const FIELD_SELECTOR = "input, textarea, select, [contenteditable='true']";
const FIELD_GAP_PX = 16;

/** iOS no longer scrolls a focused field into view for us (the WebView
 * isn't told about the keyboard), so a field the keyboard would cover —
 * the bottom of a long form, a search box low on the page — is scrolled
 * up here instead. The page gets the keyboard's height as extra bottom
 * padding (globals.css, html[data-keyboard-open]) so there's room to.
 * Composers that dock to the keyboard themselves are marked
 * data-keyboard-dock and left alone. */
function revealFocusedField() {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement) || !el.matches(FIELD_SELECTOR)) return;
  if (el.closest("[data-keyboard-dock]")) return;
  if (el.getBoundingClientRect().bottom <= window.innerHeight - height - FIELD_GAP_PX) return;
  el.style.scrollMarginBottom = `${height + FIELD_GAP_PX}px`;
  el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

/** Starts listening for the native keyboard. Called once by the app
 * bridge; returns a cleanup. */
export function installNativeKeyboardTracking(): () => void {
  if (installed) return () => {};
  installed = true;
  const onShow = (e: Event) => {
    const reported = (e as Event & { keyboardHeight?: unknown }).keyboardHeight;
    if (typeof reported !== "number" || !Number.isFinite(reported)) return;
    set(reported);
    requestAnimationFrame(revealFocusedField);
  };
  const onHide = () => set(0);
  // Moving from one field to another with the keyboard already up.
  const onFocusIn = () => {
    if (height > 0) requestAnimationFrame(revealFocusedField);
  };
  window.addEventListener("keyboardWillShow", onShow);
  window.addEventListener("keyboardWillHide", onHide);
  document.addEventListener("focusin", onFocusIn);
  return () => {
    installed = false;
    window.removeEventListener("keyboardWillShow", onShow);
    window.removeEventListener("keyboardWillHide", onHide);
    document.removeEventListener("focusin", onFocusIn);
    set(0);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The native keyboard's height in CSS pixels, 0 while it's closed (and
 * always 0 on the web). */
export function useNativeKeyboardHeight(): number {
  return useSyncExternalStore(
    subscribe,
    () => height,
    () => 0,
  );
}
