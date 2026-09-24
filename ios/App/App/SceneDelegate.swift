import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // MainViewController, not the bare CAPBridgeViewController — this
        // was the bug. Main.storyboard names MainViewController as the
        // scene's initial view controller, but a UISceneDelegate that
        // implements willConnectTo(_:) and sets window.rootViewController
        // itself (as this one does) takes over entirely; the storyboard's
        // own choice of class is never consulted once that happens. Every
        // customization in MainViewController.swift — disabling
        // rubber-band bounce, hiding the scroll indicator, the retry
        // behavior added below — was silently dead code until this line
        // named the right class explicitly.
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
