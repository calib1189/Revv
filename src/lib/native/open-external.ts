/**
 * Opens a URL in the device's actual default browser app (Safari on
 * iOS) — not @capacitor/browser's Browser.open(), which presents an
 * SFSafariViewController as a modal *over* the app, still visually
 * part of the app experience. This is specifically for handoffs where
 * that distinction matters (see createWebHandoffAction's doc comment):
 * a purchase needs to happen somewhere unambiguously outside the app,
 * not just in a different iOS component that happens to render inside
 * it. A WKWebView can't itself open a new native window, so a
 * "_blank"-target open is what Capacitor's runtime hands off to the
 * OS to open externally — the standard mechanism for this, not a
 * Capacitor-specific API.
 */
export function openExternalBrowser(url: string): void {
  window.open(url, "_blank");
}
