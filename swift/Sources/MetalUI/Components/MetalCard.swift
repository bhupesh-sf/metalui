import SwiftUI

// WIP: MetalCard is a placeholder that keeps the React API's shape (title, description, content). It
// stacks them on a rounded fill, not yet the raised surface, the media bleed, the hover lift or the
// selected ring from card.agent.md. Web is the reference.

/// A person's thing on a plate. Work in progress: see card.agent.md.
public struct MetalCard<Content: View>: View {
    private let title: String
    private let description: String?
    private let content: Content
    private let waiting: Bool

    /// `waiting`: its work is under way; after the show delay a lit edge travels round its border. Its
    /// words (the description) say what is happening.
    public init(_ title: String, description: String? = nil, waiting: Bool = false, @ViewBuilder content: () -> Content = { EmptyView() }) {
        self.title = title
        self.description = description
        self.waiting = waiting
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.card.points("self.gap")) {
            Text(title).font(.headline)
            if let description { Text(description).foregroundStyle(.secondary) }
            content
        }
        .padding(MetalRecipes.card.points("self.pad"))
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.background, in: RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card"), style: .continuous))
        .overlay {
            if waiting {
                MetalSpinnerEdge(shape: RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card"), style: .continuous), waiting: waiting)
            }
        }
        .accessibilityValue(waiting ? "In progress" : "")
    }
}
