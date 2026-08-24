import Capacitor
import UIKit

/// Native-scrollview tweaks that make the wrapped WebView read as an app
/// instead of a browser tab:
/// - Disables rubber-band bounce (an overscroll past the top/bottom would
///   otherwise reveal blank canvas beyond the page — CSS's
///   overscroll-behavior doesn't reliably suppress this inside WKWebView).
/// - Hides the scroll indicator — the thin line on the right edge is a
///   correct, standard iOS scroll cue in general, but reads as "browser
///   scrollbar" specifically in this always-full-height single-page layout.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
        webView?.scrollView.showsVerticalScrollIndicator = false
        webView?.scrollView.showsHorizontalScrollIndicator = false
    }
}
