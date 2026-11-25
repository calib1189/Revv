"use client";

import { useEffect, useMemo, useRef } from "react";

/** An object URL for a file, revoked once the component is really done
 * with it. The revoke waits a tick and is called off if the same URL is
 * picked straight back up: React mounts every component twice in
 * development (and can remount it to restore state), and revoking on the
 * first unmount left the editor loading a URL that no longer existed. */
export function useObjectUrl(file: Blob): string {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const pending = useRef<{ url: string; timer: number } | null>(null);
  useEffect(() => {
    if (pending.current?.url === url) {
      window.clearTimeout(pending.current.timer);
      pending.current = null;
    }
    return () => {
      pending.current = { url, timer: window.setTimeout(() => URL.revokeObjectURL(url), 0) };
    };
  }, [url]);
  return url;
}
