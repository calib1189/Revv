import type { useRouter } from "next/navigation";

export type TabTransitionDirection = "forward" | "backward";

// The public useRouter() return type, without reaching into Next's
// internal module paths (which aren't a stable import surface across
// versions) just to name this type.
type Router = ReturnType<typeof useRouter>;

/** Navigates via the native View Transitions API when the browser
 * supports it, so switching tabs visibly slides instead of jump-cutting
 * — falls back to a plain router.push (today's behavior, unchanged) on
 * any browser that doesn't. Sets data-tab-transition on <html> right
 * before starting the transition so globals.css knows which direction
 * to animate (see the CSS there for why), and clears it once the
 * transition settles so it can't leak into an unrelated later
 * navigation. */
export function navigateWithTransition(
  router: Router,
  href: string,
  direction: TabTransitionDirection,
) {
  if (typeof document === "undefined" || !("startViewTransition" in document)) {
    router.push(href);
    return;
  }

  document.documentElement.dataset.tabTransition = direction;
  const transition = document.startViewTransition(() => {
    router.push(href);
  });
  transition.finished.finally(() => {
    delete document.documentElement.dataset.tabTransition;
  });
}
