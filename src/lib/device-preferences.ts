"use client";

import { useSyncExternalStore } from "react";

/** Settings that belong to this device rather than the account — how
 * videos behave here, whether this phone buzzes — so they live in
 * localStorage, take effect straight away and need nothing from the
 * server. Same idea as the theme choice (theme-toggle.tsx). */
export interface DevicePreferences {
  /** Feed videos start on their own when they come on screen. */
  autoplayVideos: boolean;
  /** Feed videos start with their sound on (where the browser allows). */
  videoSound: boolean;
  /** Haptic taps in the iPhone app. */
  haptics: boolean;
}

const DEFAULTS: DevicePreferences = { autoplayVideos: true, videoSound: true, haptics: true };
const STORAGE_KEY = "sorza-device-preferences";
const CHANGE_EVENT = "sorza-device-preferences-change";

let cachedRaw: string | null | undefined;
let cachedValue: DevicePreferences = DEFAULTS;
// Where a change lives when localStorage can't hold it (private mode,
// blocked storage) — it still applies for the rest of this visit.
let memoryRaw: string | null = null;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

/** The current preferences. Safe to call from event handlers and effects;
 * components should use useDevicePreferences instead. */
export function getDevicePreferences(): DevicePreferences {
  if (typeof window === "undefined") return DEFAULTS;
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DevicePreferences>) } : DEFAULTS;
    } catch {
      cachedValue = DEFAULTS;
    }
  }
  return cachedValue;
}

export function setDevicePreference<K extends keyof DevicePreferences>(key: K, value: DevicePreferences[K]) {
  const next = { ...getDevicePreferences(), [key]: value };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    memoryRaw = JSON.stringify(next);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useDevicePreferences(): DevicePreferences {
  return useSyncExternalStore(subscribe, getDevicePreferences, () => DEFAULTS);
}
