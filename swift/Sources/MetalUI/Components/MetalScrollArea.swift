import SwiftUI

// WIP: MetalScrollArea is a placeholder that keeps the React API's shape (content in a frame). It uses
// the system ScrollView and its scroll indicators, not yet the edge fades or the widening thumb from
// scroll-area.agent.md. Web is the reference.

/// A region that scrolls. Work in progress: see scroll-area.agent.md.
public struct MetalScrollArea<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        ScrollView { content }
    }
}
