import SwiftUI

// WIP: MetalPopover is a placeholder that keeps the React API's shape (a trigger, a presented flag,
// a title, a description and content). It uses the system popover, not yet the menu's frosted plate,
// the one-nest rise on the surface spring, or the release fade from popover.agent.md. Web is the reference.

/// A small panel that comes out of its trigger. Work in progress: see popover.agent.md.
public struct MetalPopover<Trigger: View, Content: View>: View {
    @Binding private var isPresented: Bool
    private let title: String
    private let description: String?
    private let arrowEdge: Edge
    private let trigger: Trigger
    private let content: Content

    public init(
        _ title: String,
        description: String? = nil,
        isPresented: Binding<Bool>,
        arrowEdge: Edge = .top,
        @ViewBuilder trigger: () -> Trigger,
        @ViewBuilder content: () -> Content
    ) {
        self.title = title
        self.description = description
        self._isPresented = isPresented
        self.arrowEdge = arrowEdge
        self.trigger = trigger()
        self.content = content()
    }

    public var body: some View {
        trigger
            .popover(isPresented: $isPresented, arrowEdge: arrowEdge) {
                let recipe = MetalRecipes.popover
                VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
                    Text(title).font(.headline)
                    if let description { Text(description).font(.subheadline).foregroundStyle(.secondary) }
                    content.padding(.top, recipe.points("self.body-gap") - recipe.points("self.gap"))
                }
                .padding(recipe.points("self.pad"))
                .frame(minWidth: recipe.points("self.min-width"), maxWidth: recipe.points("self.max-width"))
            }
    }
}
