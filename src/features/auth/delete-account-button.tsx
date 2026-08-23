"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/features/auth/actions";

export function DeleteAccountButton({ username }: { username: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!isConfirming) {
    return (
      <button
        type="button"
        onClick={() => setIsConfirming(true)}
        className="text-sm text-danger hover:underline"
      >
        Delete account
      </button>
    );
  }

  const canConfirm = typed === username && !isPending;

  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
      <p className="text-sm font-medium text-danger">
        This permanently deletes your account, vehicles, builds, posts, and
        everything attached to them. This can&apos;t be undone.
      </p>
      <p className="mt-3 text-sm text-muted">
        Type <span className="font-medium text-foreground">{username}</span> to
        confirm.
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="mt-2 w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-danger"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => startTransition(() => deleteAccount())}
          className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {isPending ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setIsConfirming(false);
            setTyped("");
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
