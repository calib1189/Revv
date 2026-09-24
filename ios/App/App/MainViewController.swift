import Capacitor
import UIKit
import WebKit

/// Native-scrollview tweaks that make the wrapped WebView read as an app
/// instead of a browser tab:
/// - Disables rubber-band bounce (an overscroll past the top/bottom would
///   otherwise reveal blank canvas beyond the page — CSS's
///   overscroll-behavior doesn't reliably suppress this inside WKWebView).
/// - Hides the scroll indicator — the thin line on the right edge is a
///   correct, standard iOS scroll cue in general, but reads as "browser
///   scrollbar" specifically in this always-full-height single-page layout.
///
/// Also retries a failed initial load — see loadFailed(_:) below. Since
/// capacitor.config.ts points this app at a real remote URL rather than
/// bundling its own pages, EVERY launch is a real network request before
/// anything at all can appear, unlike a normal native app that already
/// has its UI on disk. A cold launch racing against the network not
/// being ready yet (radio still waking up, a Wi-Fi/cellular handoff
/// mid-flight) is a real, reported condition here — "can't connect"
/// right at launch — and stock Capacitor has no retry of its own for it;
/// a failed load just sits there.
class MainViewController: CAPBridgeViewController {
    // Only genuinely transient conditions retry — a real server error or
    // a malformed URL retrying in a loop would just be a slower way to
    // stay broken. NSURLErrorDomain's own names for "not ready yet" vs.
    // "actually wrong" are what draw that line here.
    private static let transientErrorCodes: Set<Int> = [
        NSURLErrorNotConnectedToInternet,
        NSURLErrorTimedOut,
        NSURLErrorNetworkConnectionLost,
        NSURLErrorCannotConnectToHost,
        NSURLErrorCannotFindHost,
        NSURLErrorDNSLookupFailed,
        NSURLErrorInternationalRoamingOff,
        NSURLErrorDataNotAllowed,
        NSURLErrorSecureConnectionFailed,
    ]
    private static let maxRetries = 4
    private static let retryURL = URL(string: "https://sorza.net")

    private var retryCount = 0
    private var retryWorkItem: DispatchWorkItem?

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
    }

    // Both delegate methods route through the same handler: Capacitor's
    // own request can fail before committing to a response
    // (didFailProvisionalNavigation, the common case for "no network
    // yet") or after
    // (didFail, e.g. a connection that drops mid-transfer) — the retry
    // logic itself doesn't care which.
    override func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        super.webView(webView, didFailProvisionalNavigation: navigation, withError: error)
        loadFailed(error)
    }

    override func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        super.webView(webView, didFail: navigation, withError: error)
        loadFailed(error)
    }

    override func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        super.webView(webView, didFinish: navigation)
        // A real page made it all the way in — the counter is for THIS
        // outage, not a lifetime cap, so a later failure (say, the phone
        // loses signal again an hour into using the app) gets its own
        // full set of retries rather than inheriting an exhausted one.
        retryCount = 0
        retryWorkItem?.cancel()
    }

    private func loadFailed(_ error: Error) {
        let nsError = error as NSError
        guard nsError.domain == NSURLErrorDomain,
              Self.transientErrorCodes.contains(nsError.code),
              retryCount < Self.maxRetries,
              let url = Self.retryURL else {
            return
        }

        retryCount += 1
        // Linear backoff (1.5s, 3s, 4.5s, 6s) rather than retrying
        // instantly in a tight loop against a network that just isn't
        // back yet, and rather than a long fixed wait that makes a
        // connection that recovers quickly feel slower than it needs to.
        let delay = Double(retryCount) * 1.5
        retryWorkItem?.cancel()
        let workItem = DispatchWorkItem { [weak self] in
            self?.webView?.load(URLRequest(url: url))
        }
        retryWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: workItem)
    }
}
