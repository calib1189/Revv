// Web Push service worker. Plain JS, not bundled by Next — served as-is
// from /sw.js. Two jobs: show a notification when a push arrives, and
// take the user to the right page when they tap it.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon.png",
      badge: "/icon.png",
      // A big picture under the text (Android, desktop Chrome).
      ...(payload.image ? { image: payload.image } : {}),
      // A prize day: stays on screen until tapped or dismissed, with a
      // buzz where the device allows it.
      ...(payload.important ? { requireInteraction: true, vibrate: [180, 80, 180] } : {}),
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

/* ------------------------------------------------------------------ *
 * Instant open: the app's four main tabs (Feed, Garage, Discover,
 * Leaderboard) appear the moment you open SORZA, from the copy saved
 * last time, while the real page loads behind them; then the fresh
 * content swaps in. The saved copy is only ever used when it's safe:
 *
 *  - Only for a signed-in person, and thrown away the moment a page
 *    says someone else (or nobody) is signed in. The page tells us who
 *    via <meta name="sorza-user">.
 *  - Only when every file that copy needs is saved too, so an old copy
 *    after a deploy can't come up blank. If the fresh page is from a new
 *    deploy (<meta name="sorza-build">), the page reloads once onto it.
 *  - Only for a few days; older than that just loads normally.
 * Everything else (other pages, data calls, images) goes to the
 * network exactly as before.
 * ------------------------------------------------------------------ */

const PAGE_CACHE = "sorza-pages-v1";
const ASSET_CACHE = "sorza-assets-v1";
const PAGE_PATHS = new Set(["/feed", "/garage", "/discover", "/leaderboard"]);
const MAX_PAGE_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** What each client served a saved copy should do once the fresh page is in. */
const pending = new Map();

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function meta(html, name) {
  const match = html.match(new RegExp(`<meta name="${name}" content="([^"]*)"`));
  return match ? match[1] : null;
}

function assetUrls(html) {
  // Stops at a quote, space, bracket or backslash (the page's embedded
  // data escapes its quotes).
  return [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
}

async function purgePages() {
  await caches.delete(PAGE_CACHE);
}

/** A saved page we can show right now, with its html, or null. */
async function usablePage(path) {
  const cache = await caches.open(PAGE_CACHE);
  const saved = await cache.match(path);
  if (!saved) return null;
  const savedAt = Number(saved.headers.get("x-sorza-saved-at") || 0);
  if (!savedAt || Date.now() - savedAt > MAX_PAGE_AGE_MS) return null;
  const html = await saved.clone().text();
  if (!meta(html, "sorza-user")) return null;
  const assets = await caches.open(ASSET_CACHE);
  for (const url of assetUrls(html)) {
    // The old-browser polyfill (a nomodule script) is never downloaded
    // by a phone that can run this app, so it's never saved either.
    if (/polyfill/i.test(url)) continue;
    if (!(await assets.match(url))) return null;
  }
  // The html is read here, once: the response itself goes to the page,
  // and a body can only be read one time.
  return { response: saved, html };
}

/** Saves a fresh page if it's one worth keeping; returns its html. */
async function savePage(path, response) {
  const html = await response.text();
  const user = meta(html, "sorza-user");
  if (!user) {
    await purgePages();
    return html;
  }
  const headers = new Headers(response.headers);
  // The body is stored already decoded.
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.set("x-sorza-saved-at", String(Date.now()));
  const cache = await caches.open(PAGE_CACHE);
  await cache.put(path, new Response(html, { status: 200, headers }));
  return html;
}

function cacheable(response) {
  return (
    response.ok &&
    response.type === "basic" &&
    !response.redirected &&
    (response.headers.get("content-type") || "").includes("text/html")
  );
}

/** After showing a saved copy: what the page should do now. */
async function revalidate(path, savedHtml, response) {
  if (!cacheable(response)) {
    // Signed out, sent elsewhere, or an error: the saved copy is wrong.
    await purgePages();
    return "reload";
  }
  const freshHtml = await savePage(path, response);
  const freshUser = meta(freshHtml, "sorza-user");
  if (!freshUser || freshUser !== meta(savedHtml, "sorza-user")) {
    await purgePages();
    if (freshUser) await savePage(path, new Response(freshHtml, { headers: response.headers }));
    return "reload";
  }
  if (meta(freshHtml, "sorza-build") !== meta(savedHtml, "sorza-build")) {
    await pruneAssets();
    return "reload";
  }
  return "refresh";
}

/** Keeps only the files the saved pages still use (old deploys pile up). */
async function pruneAssets() {
  const pages = await caches.open(PAGE_CACHE);
  const keep = new Set();
  for (const request of await pages.keys()) {
    const page = await pages.match(request);
    if (page) for (const url of assetUrls(await page.text())) keep.add(new URL(url, self.location.origin).href);
  }
  const assets = await caches.open(ASSET_CACHE);
  for (const request of await assets.keys()) {
    if (!keep.has(request.url)) await assets.delete(request);
  }
}

async function assetFirst(request) {
  const assets = await caches.open(ASSET_CACHE);
  const saved = await assets.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  // Built files are named by their content, so a saved one never changes.
  if (response.ok && response.type === "basic") await assets.put(request, response.clone());
  return response;
}

async function openPage(event, path) {
  const saved = await usablePage(path);
  const network = fetch(event.request);
  if (saved) {
    const work = network.then((response) => revalidate(path, saved.html, response)).catch(() => "none");
    // Looked up by the new page's id, or by its path where a browser
    // doesn't say which page a navigation is for.
    const keys = [event.resultingClientId, path].filter(Boolean);
    for (const key of keys) pending.set(key, work);
    event.waitUntil(work.finally(() => setTimeout(() => keys.forEach((key) => pending.delete(key)), 30000)));
    return saved.response;
  }
  const response = await network;
  if (cacheable(response)) event.waitUntil(savePage(path, response.clone()).catch(() => undefined));
  return response;
}

async function openRoot(event) {
  // Signed in last time: go straight to the saved feed (the server would
  // send a signed-in person there anyway). Otherwise the normal page.
  if (await usablePage("/feed")) return Response.redirect(new URL("/feed", self.location.origin).href, 302);
  return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(assetFirst(request).catch(() => fetch(request)));
    return;
  }
  if (request.mode !== "navigate" || url.search) return;
  if (url.pathname === "/") {
    event.respondWith(openRoot(event).catch(() => fetch(request)));
  } else if (PAGE_PATHS.has(url.pathname)) {
    event.respondWith(openPage(event, url.pathname).catch(() => fetch(request)));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "sorza-purge") {
    event.waitUntil(purgePages());
    return;
  }
  if (data.type === "sorza-check") {
    const key = event.source && event.source.id;
    const work = pending.get(key) || pending.get(data.path);
    pending.delete(key);
    pending.delete(data.path);
    event.waitUntil(
      Promise.resolve(work || "none").then((action) => {
        if (event.source) event.source.postMessage({ type: "sorza-cache", action });
      }),
    );
  }
});
