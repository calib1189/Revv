"use client";

import { useState, type ReactNode } from "react";
import { MoreIcon } from "@/components/ui/icons";

/** The profile's action row plus a trailing "more" button that discloses
 * the less-common actions (Block, Report) in a panel underneath. They
 * stay one tap away — App Store guideline 1.2 needs both reachable from
 * any profile — without sitting in the main row as equal-weight text.
 * An inline panel rather than a floating popover because Report expands
 * into its own form, which needs room to grow. */
export function ProfileMoreMenu({
  actions,
  menu,
}: {
  actions: ReactNode;
  menu: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">
      <div className="flex w-full items-start gap-2.5">
        {actions}
        <button
          type="button"
          aria-label="More actions"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={`pressable glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground ${open ? "brightness-125" : ""}`}
        >
          <MoreIcon className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="animate-tab-content-in glass-raised elev-2 mt-3 flex flex-col items-start gap-3 rounded-[20px] px-4 py-3.5 text-left">
          {menu}
        </div>
      )}
    </div>
  );
}
