import SwiftUI

// WIP: MetalPreviewCard is a placeholder that keeps the React API's shape (a title, a description
// and a host). It shows them in a system popover on hover, not yet the popover's frosted plate, the
// steady-hover delay or the linger from preview-card.agent.md. Web is the reference.

/// What is behind a link. Work in progress: see preview-card.agent.md.
public struct MetalPreviewCard: View {
    private let title: String
    private let description: String?
    private let host: String?

    public init(_ title: String, description: String? = nil, host: String? = nil) {
        self.title = title
        self.description = description
        self.host = host
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.previewCard.points("self.gap")) {
            Text(title).font(.headline)
            if let description { Text(description).foregroundStyle(.secondary) }
            if let host { Text(host).font(.caption).foregroundStyle(.tertiary) }
        }
        .padding(MetalRecipes.popover.points("self.pad"))
        .frame(width: MetalRecipes.previewCard.points("self.width"), alignment: .leading)
    }
}
