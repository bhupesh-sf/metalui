import SwiftUI

// WIP: MetalSplitPane is a placeholder that keeps the React API's shape (two panes). On macOS it uses
// the system HSplitView; elsewhere an HStack with a divider. The grip, the detents and the key steps from
// split-pane.agent.md are not drawn yet. Web is the reference.

/// Two places with a divider you can move. Work in progress: see split-pane.agent.md.
public struct MetalSplitPane<First: View, Second: View>: View {
    private let first: First
    private let second: Second

    public init(@ViewBuilder first: () -> First, @ViewBuilder second: () -> Second) {
        self.first = first()
        self.second = second()
    }

    public var body: some View {
        #if os(macOS)
        HSplitView { first; second }
        #else
        HStack(spacing: 0) { first; Divider(); second }
        #endif
    }
}
