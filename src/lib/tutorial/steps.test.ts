import { describe, expect, it } from "vitest";
import {
  TUTORIAL_LAST_STEP,
  TUTORIAL_STEPS,
  clampTutorialStep,
  isTutorialBlockedPath,
  tutorialStartStep,
} from "./steps";

describe("tutorialStartStep", () => {
  it("starts everyone without a row at the welcome screen", () => {
    expect(tutorialStartStep(null)).toBe(0);
  });

  it("resumes an unfinished tour where it was left", () => {
    expect(tutorialStartStep({ step: 3, completed_at: null })).toBe(3);
  });

  it("never opens on its own once finished or skipped", () => {
    expect(tutorialStartStep({ step: 6, completed_at: "2026-11-03T00:00:00Z" })).toBeNull();
    expect(tutorialStartStep({ step: 1, completed_at: "2026-11-03T00:00:00Z" })).toBeNull();
  });

  it("clamps a stored step that no longer exists", () => {
    expect(tutorialStartStep({ step: 42, completed_at: null })).toBe(TUTORIAL_LAST_STEP);
  });
});

describe("clampTutorialStep", () => {
  it("keeps valid steps", () => {
    for (let i = 0; i < TUTORIAL_STEPS.length; i++) expect(clampTutorialStep(i)).toBe(i);
  });

  it("rejects anything that isn't a finite number", () => {
    expect(clampTutorialStep("3")).toBe(0);
    expect(clampTutorialStep(Number.NaN)).toBe(0);
    expect(clampTutorialStep(undefined)).toBe(0);
    expect(clampTutorialStep(-2)).toBe(0);
    expect(clampTutorialStep(2.9)).toBe(2);
  });
});

describe("isTutorialBlockedPath", () => {
  it("blocks sign-in, recovery and legal screens", () => {
    for (const path of ["/login", "/signup", "/auth/callback", "/forgot-password", "/reset-password", "/legal/terms"]) {
      expect(isTutorialBlockedPath(path)).toBe(true);
    }
  });

  it("allows the app itself, including the welcome screen", () => {
    for (const path of ["/", "/feed", "/welcome", "/garage/new", "/settings", "/legalese"]) {
      expect(isTutorialBlockedPath(path)).toBe(false);
    }
  });
});
