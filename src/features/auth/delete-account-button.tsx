"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/features/auth/actions";

export function DeleteAccountButton({ username }: { username: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isConfirming) {
    return (
      <div className="glass-raised elev-1 overflow-hidden rounded-[22px]">
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="min-h-[48px] w-full px-4 py-3 text-center text-[0.9375rem] font-medium text-danger transition-colors active:bg-foreground/[0.06]"
        >
          Delete Account
        </button>
      </div>
    );
  }

  const canConfirm = typed === username && !isPending;

  return (
    <div className="glass-raised elev-1 rounded-[22px] p-5">
      <p className="text-[1.0625rem] font-semibold text-danger">Delete your account?</p>
      <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
        This permanently deletes your account, vehicles, builds, posts, and
        everything attached to them. This can&apos;t be undone.
      </p>
      <p className="mt-4 text-[0.875rem] text-muted">
        Type <span className="font-semibold text-foreground">{username}</span> to confirm.
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        aria-label="Type your username to confirm"
        className="glass-inset mt-2 h-11 w-full rounded-[14px] px-3 focus:outline-none focus:ring-1 focus:ring-danger"
      />
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsConfirming(false);
            setTyped("");
          }}
          className="glass h-11 flex-1 rounded-full text-[0.9375rem] font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => startTransition(() => deleteAccount())}
          className="h-11 flex-1 rounded-full bg-danger text-[0.9375rem] font-semibold text-white disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}
