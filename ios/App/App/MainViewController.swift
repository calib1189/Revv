import Capacitor
import StoreKit
import UIKit
import WebKit

/// Apple's own "Enjoying SORZA?" star prompt, called from the web side
/// (src/lib/native/app-review.ts) after an owner's build lands a good
/// score. Lives here, registered by instance in capacitorDidLoad, rather
/// than as an npm plugin: it's one StoreKit call, and the file is already
/// in the App target, so there's no Xcode project change to make.
///
/// Apple decides whether the prompt actually appears (at most three times
/// a year per person, never again once they've rated this version), so
/// this resolves either way and never reports whether anything showed.
@objc(AppReviewPlugin)
public class AppReviewPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppReviewPlugin"
    public let jsName = "AppReview"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        Task { @MainActor in
            let scene = UIApplication.shared.connectedScenes
                .first { $0.activationState == .foregroundActive } as? UIWindowScene
            if let scene = scene {
                if #available(iOS 16.0, *) {
                    AppStore.requestReview(in: scene)
                } else {
                    SKStoreReviewController.requestReview(in: scene)
                }
            }
            call.resolve()
        }
    }
}

/// Native-scrollview tweaks that make the wrapped WebView read as an app
/// instead of a browser tab:
/// - Disables rubber-band bounce (an overscroll past the top/bottom would
///   otherwise reveal blank canvas beyond the page — CSS's
///   overscroll-behavior doesn't reliably suppress this inside WKWebView).
/// - Hides the scroll indicator — the thin line on the right edge is a
///   correct, standard iOS scroll cue in general, but reads as "browser
///   scrollbar" specifically in this always-full-height single-page layout.
///
/// Also retries a stalled initial load — see scheduleStallCheck() below.
/// Since capacitor.config.ts points this app at a real remote URL rather
/// than bundling its own pages, EVERY launch is a real network request
/// before anything at all can appear, unlike a normal native app that
/// already has its UI on disk. A cold launch racing against the network
/// not being ready yet (radio still waking up, a Wi-Fi/cellular handoff
/// mid-flight) is a real, reported condition here — "can't connect" right
/// at launch — and stock Capacitor has no retry of its own for it; a
/// failed or stuck load just sits there.
///
/// This deliberately does NOT hook WKNavigationDelegate. An earlier version
/// tried overriding webView(_:didFailProvisionalNavigation:withError:) etc.
/// on this class, on the assumption CAPBridgeViewController implements
/// those as overridable methods — it does not (Capacitor conforms to
/// WKNavigationDelegate some other way; the compiler rejected `override`
/// outright and `webView` here resolves to the WKWebView? property, not a
/// method). Reaching further to make this class the navigationDelegate
/// itself would risk swallowing whatever Capacitor's own delegate does to
/// run its JS bridge — wrong in a way that fails silently at runtime
/// instead of at compile time, and worse than the bug being fixed. Polling
/// the public, KVO-free `isLoading` property instead is fully additive: it
/// cannot change what Capacitor itself observes or does with the webview.
class MainViewController: CAPBridgeViewController {
    private static let retryURL = URL(string: "https://sorza.net")
    // Checked at 4s, 8s, 12s: long enough that a real but slow load isn't
    // punished on the first check, short enough that a genuinely stuck
    // launch doesn't leave someone staring at a blank screen for long.
    private static let stallCheckDelaysSeconds: [Double] = [4, 8, 12]

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AppReviewPlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
        scheduleStallChecks()
    }

    private func scheduleStallChecks() {
        for delay in Self.stallCheckDelaysSeconds {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                self?.retryIfStillStuck()
            }
        }
    }

    /// isLoading stays true for the whole span of a request that's still
    /// in flight, success or failure alike, and goes false the moment one
    /// finishes either way — so "still true after the deadline" is a safe
    /// stand-in for "stuck," without needing to know why. If a load
    /// already finished (successfully or not) by the time this fires,
    /// isLoading is false and this does nothing — a fast, successful
    /// launch is never touched.
    private func retryIfStillStuck() {
        guard let webView = webView, webView.isLoading, let url = Self.retryURL else { return }
        webView.load(URLRequest(url: url))
    }
}
