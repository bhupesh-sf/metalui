import WebKit
#if os(macOS)
import AppKit
#else
import UIKit
#endif

/// The native end of the web's `setHapticBridge` (motion/haptic.ts): a `WKWebView` that renders MetalUI
/// plays `haptic()` on the trackpad. Install it once on the web view's configuration:
///
///     MetalHapticBridge.install(in: webView.configuration.userContentController)
///
/// and on the page, once at start-up:
///
///     setHapticBridge((kind) => window.webkit.messageHandlers.haptic.postMessage(kind));
///
/// Each message is one catch, performed at once: `alignment` → `.alignment`, `detent` → `.levelChange`,
/// `refusal` → `.generic`. Anything else is ignored.
@MainActor public final class MetalHapticBridge: NSObject, WKScriptMessageHandler {
    /// The message handler's name, the one the page posts to.
    public nonisolated static let name = "haptic"

    /// Adds the bridge to a content controller under `name`. Calling it twice replaces the first.
    public static func install(in controller: WKUserContentController, name: String = MetalHapticBridge.name) {
        controller.removeScriptMessageHandler(forName: name)
        controller.add(MetalHapticBridge(), name: name)
    }

    public func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let kind = message.body as? String else { return }
        #if os(macOS)
        let pattern: NSHapticFeedbackManager.FeedbackPattern
        switch kind {
        case "alignment": pattern = .alignment
        case "detent": pattern = .levelChange
        case "refusal": pattern = .generic
        default: return
        }
        NSHapticFeedbackManager.defaultPerformer.perform(pattern, performanceTime: .now)
        #else
        switch kind {
        case "alignment": UIImpactFeedbackGenerator(style: .light).impactOccurred()
        case "detent": UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        case "refusal": UINotificationFeedbackGenerator().notificationOccurred(.error)
        default: return
        }
        #endif
    }
}
