"use client";

import type { ReactNode } from "react";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";
import { useVisualViewportBox } from "@/lib/ui/use-visual-viewport";

/** Less than this much of the screen lost isn't a keyboard (a browser
 * toolbar shifting, say). */
const KEYBOARD_MIN_PX = 120;

/** A DM thread laid out the way Instagram's is: full screen over the app
 * header and tab bar, the header pinned at the top, the composer pinned
 * at the bottom, and the messages in between anchored to the newest one.
 *
 * The whole screen is sized to the space above the keyboard
 * (useVisualViewportBox, which in the iOS app follows the keyboard as it
 * starts to open), and in the app it slides with it — see
 * [data-keyboard-dock] in globals.css. The thread scrolls in a
 * column-reverse box, so its resting position is the bottom: when the
 * keyboard takes space, it's the oldest messages that go out of view,
 * never the latest one. */
export function ConversationScreen({
  header,
  composer,
  children,
}: {
  header: ReactNode;
  composer: ReactNode;
  children: ReactNode;
}) {
  useHideBottomNav(true);
  const viewport = useVisualViewportBox(true);
  const keyboardOpen = viewport !== null && viewport.layoutHeight - viewport.height > KEYBOARD_MIN_PX;

  return (
    <div
      data-keyboard-dock
      className="fixed inset-x-0 z-[60] flex flex-col bg-background"
      style={viewport ? { top: viewport.top, height: viewport.height } : { top: 0, bottom: 0 }}
    >
      <div className="flex-shrink-0 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="mx-auto w-full max-w-lg">{header}</div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-end px-3 py-4">{children}</div>
      </div>

      <div
        className={`flex-shrink-0 border-t border-border px-3 pt-2.5 ${
          keyboardOpen ? "pb-2.5" : "pb-[max(0.625rem,env(safe-area-inset-bottom))]"
        }`}
      >
        <div className="mx-auto w-full max-w-lg">{composer}</div>
      </div>
    </div>
  );
}
