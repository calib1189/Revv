"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StoryViewer } from "@/features/stories/story-viewer";

interface StoriesContext {
  /** Plays these people's stories in this order, starting at `startAuthorId`. */
  openStories: (authorIds: string[], startAuthorId?: string) => void;
  /** People whose stories were watched to the end since the page loaded,
   * so their rings go quiet without a reload. */
  caughtUp: ReadonlySet<string>;
}

const Ctx = createContext<StoriesContext | null>(null);

/** Hosts the full-screen story viewer once for the whole app, so any
 * avatar with a story ring can open it. */
export function StoryViewerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<{ authorIds: string[]; start: string | undefined; key: number } | null>(null);
  const [caughtUp, setCaughtUp] = useState<ReadonlySet<string>>(new Set());

  const openStories = useCallback((authorIds: string[], startAuthorId?: string) => {
    if (authorIds.length === 0) return;
    setSession({ authorIds, start: startAuthorId, key: Date.now() });
  }, []);

  const markCaughtUp = useCallback((authorId: string) => {
    setCaughtUp((prev) => (prev.has(authorId) ? prev : new Set(prev).add(authorId)));
  }, []);

  const value = useMemo(() => ({ openStories, caughtUp }), [openStories, caughtUp]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {session && (
        <StoryViewer
          key={session.key}
          authorIds={session.authorIds}
          startAuthorId={session.start}
          onCaughtUp={markCaughtUp}
          onClose={(changed) => {
            setSession(null);
            if (changed) router.refresh();
          }}
        />
      )}
    </Ctx.Provider>
  );
}

export function useStories(): StoriesContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStories must be used inside StoryViewerProvider");
  return ctx;
}
