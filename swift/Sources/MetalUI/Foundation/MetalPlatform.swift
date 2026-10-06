import SwiftUI

/// A system pointer shape. iOS has no cursor to set, so `set()` does nothing there.
enum MetalCursor {
    case arrow, pointingHand, openHand, closedHand

    @MainActor func set() {
        #if os(macOS)
        switch self {
        case .arrow: NSCursor.arrow.set()
        case .pointingHand: NSCursor.pointingHand.set()
        case .openHand: NSCursor.openHand.set()
        case .closedHand: NSCursor.closedHand.set()
        }
        #endif
    }
}

/// An arrow key's direction. AppKit's `MoveCommandDirection` doesn't exist on iOS.
enum MetalMoveDirection { case left, right, up, down }

extension View {
    /// ⎋ that ends something. macOS: `onExitCommand`, which also hears a text field's `cancelOperation:`.
    /// iOS: the hardware keyboard's Escape key.
    @ViewBuilder func metalExitCommand(perform action: @escaping () -> Void) -> some View {
        #if os(macOS)
        onExitCommand(perform: action)
        #else
        onKeyPress(.escape) { action(); return .handled }
        #endif
    }

    /// Arrow keys on the focused view. macOS: `onMoveCommand`. iOS: the hardware keyboard's arrows.
    @ViewBuilder func metalMoveCommand(perform action: @escaping (MetalMoveDirection) -> Void) -> some View {
        #if os(macOS)
        onMoveCommand { move in
            switch move {
            case .left: action(.left)
            case .right: action(.right)
            case .up: action(.up)
            case .down: action(.down)
            @unknown default: break
            }
        }
        #else
        onKeyPress(keys: [.leftArrow, .rightArrow, .upArrow, .downArrow]) { press in
            switch press.key {
            case .leftArrow: action(.left)
            case .rightArrow: action(.right)
            case .upArrow: action(.up)
            default: action(.down)
            }
            return .handled
        }
        #endif
    }

    /// `focusScope` (macOS only). iOS has no focus scopes; `defaultFocus` still applies.
    @ViewBuilder func metalFocusScope(_ namespace: Namespace.ID) -> some View {
        #if os(macOS)
        focusScope(namespace)
        #else
        self
        #endif
    }
}
