/**
 * Shared ffmpeg.wasm loader — used by both compress-video.ts and
 * combine-clips-ffmpeg.ts, so there's exactly one ~31MB WASM instance
 * per page regardless of which feature needed it first, and the
 * worker/module stays valid for the lifetime of the page.
 *
 * The core WASM files are self-hosted from /public/ffmpeg (copied from
 * the single-threaded @ffmpeg/core build, not loaded from a CDN), and
 * specifically NOT the multi-threaded core — that variant needs
 * crossOriginIsolation (COOP/COEP response headers) set site-wide,
 * which breaks other cross-origin flows this app depends on (Google/
 * Apple OAuth popups, embedded Supabase Storage images). Single-
 * threaded is slower but has zero deployment footprint beyond serving
 * two static files.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

export async function getFFmpeg(onLoadProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();
    if (onLoadProgress) {
      // downloadWithProgress-style reporting isn't wired through load()
      // itself, so this only marks "loading" (0) and "ready" (1) rather
      // than a true byte-level percentage — good enough for a spinner,
      // not precise enough for a real progress bar.
      onLoadProgress(0);
    }
    // Absolute, not a bare path — @ffmpeg/ffmpeg resolves classWorkerURL
    // via `new URL(classWorkerURL, import.meta.url)` internally, and
    // Turbopack's dev-mode bundling of that library code evaluates its
    // own import.meta.url to a file:// URL rather than the page's real
    // origin, which turns a leading-slash path into file:///ffmpeg/...
    // instead of http://.../ffmpeg/... (file: URLs don't have an origin
    // to root a path against the normal way). Passing a fully-qualified
    // URL up front means that resolution is never consulted at all —
    // the URL constructor uses an already-absolute first argument as-is.
    const origin = window.location.origin;
    await ffmpeg.load({
      coreURL: `${origin}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${origin}/ffmpeg/ffmpeg-core.wasm`,
      // Also works around a separate Turbopack issue: without this,
      // @ffmpeg/ffmpeg tries to resolve its worker via
      // `new URL("./worker.js", import.meta.url)` internally — a
      // pattern Turbopack can't statically trace inside a third-party
      // package at all, which fails outright ("Cannot find module as
      // expression is too dynamic") rather than falling back to
      // anything.
      classWorkerURL: `${origin}/ffmpeg/ffmpeg-worker.js`,
    });
    onLoadProgress?.(1);
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return loadPromise;
}
