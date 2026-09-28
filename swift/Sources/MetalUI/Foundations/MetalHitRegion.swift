import SwiftUI

/// Where a floating part can be pressed, for hosts that share presses between an overlay of
/// MetalUI parts and something underneath (a canvas under its chrome).
///
/// A host that passes presses through its overlay everywhere except where parts are needs to
/// know each part's drawn frame. A part that floats away from its layout frame (a fanned
/// option, a tray, a popover) reports its own frame with `metalHitRegion()` placed before the
/// offset or transform that moves it, so the frame moves with what is drawn. The host names a
/// coordinate space `MetalHitRegion.space` on its overlay's root and reads `MetalHitRegionKey`.
public enum MetalHitRegion {
    /// The coordinate space the host names on its overlay's root.
    public static let space = "metalui.hit"
}

/// Frames, in the host's `MetalHitRegion.space`, that take presses.
public struct MetalHitRegionKey: PreferenceKey {
    public static let defaultValue: [CGRect] = []
    public static func reduce(value: inout [CGRect], nextValue: () -> [CGRect]) {
        value.append(contentsOf: nextValue())
    }
}

public extension View {
    /// Reports this view's frame as pressable while `active`. Put it before any offset, scale or
    /// position that moves the view, so the reported frame is where the view is drawn.
    func metalHitRegion(_ active: Bool = true) -> some View {
        background {
            if active {
                GeometryReader { proxy in
                    Color.clear.preference(key: MetalHitRegionKey.self,
                                           value: [proxy.frame(in: .named(MetalHitRegion.space))])
                }
            }
        }
    }
}
