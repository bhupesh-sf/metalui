import SwiftUI

// WIP: MetalSidebar is a placeholder that keeps the React API's shape (sections of items). It shows a
// system List with the sidebar style, not yet the gliding highlight or the collapse to a rail from
// sidebar.agent.md. Web is the reference.

/// An app's side place. Work in progress: see sidebar.agent.md.
public struct MetalSidebar<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        List { content }
            .listStyle(.sidebar)
            .frame(minWidth: MetalRecipes.sidebar.points("self.width"))
    }
}
