import Capacitor
import UIKit

/// Disables the WKWebView's native rubber-band bounce. Without this, an
/// overscroll past the top or bottom reveals blank canvas beyond the page
/// — the "feels like a website, not an app" complaint this exists to fix.
/// CSS's overscroll-behavior does not reliably suppress this inside
/// WKWebView, so it has to be set on the native scroll view directly.
class MainViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false
    }
}
