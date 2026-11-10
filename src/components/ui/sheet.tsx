"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { useHideBottomNav } from "@/lib/ui/use-hide-bottom-nav";

const subscribeNever = () => () => {};

/** A bottom sheet (Sorza Daily's entry and entry views, the store's item
 * try-on and points packs). Same material and motion as the comment
 * sheet, without its drag-to-close machinery: a close button and a tap
 * on the backdrop are enough here. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);
  useHideBottomNav(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!isClient || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="glass-raised relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] pb-[env(safe-area-inset-bottom)] animate-sheet-up sm:mb-6 sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="text-[1.0625rem] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/[0.08] text-muted"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
