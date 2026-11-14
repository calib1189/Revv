"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinkIcon, ShareIcon } from "@/components/ui/icons";

type CopyStatus = "idle" | "copied" | "failed";

/** Your invite link, with Share (the native sheet) and Copy. */
export function InviteLinkCard({ url, username }: { url: string; username: string }) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const text = `Join me on SORZA. Log your build and get it rated out of 100. Sign up with my link, or enter @${username} as who invited you.`;
  const displayUrl = url.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 1800);
  }

  async function share() {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ text, url });
    } catch {
      // Dismissed the share sheet.
    }
  }

  return (
    <div className="glass-raised elev-2 rounded-[26px] p-5">
      <p className="text-[0.8125rem] font-medium uppercase tracking-[0.06em] text-muted">Your invite link</p>
      <p className="mt-1.5 break-all text-[1.0625rem] font-semibold">{displayUrl}</p>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Button onClick={share} className="h-12 gap-2 text-[0.9375rem] font-semibold">
          <ShareIcon className="h-4.5 w-4.5" />
          Share
        </Button>
        <Button variant="secondary" onClick={copy} className="h-12 gap-2 text-[0.9375rem] font-semibold">
          <LinkIcon className="h-4.5 w-4.5" />
          {status === "copied" ? "Copied" : status === "failed" ? "Couldn't copy" : "Copy"}
        </Button>
      </div>
      <p className="mt-3 text-[0.8125rem] leading-snug text-muted">
        Friends who join through the app can enter <span className="font-semibold text-foreground">@{username}</span> when
        it asks who invited them.
      </p>
    </div>
  );
}
