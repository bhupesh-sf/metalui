import SwiftUI

// WIP: MetalLink is a placeholder that keeps the React API's shape (a title and a destination). It
// uses the system Link with an underline, not yet the engraved hairline or the external arrow's nudge
// from link.agent.md. Web is the reference.

/// An inline link. Work in progress: see link.agent.md.
public struct MetalLink: View {
    private let title: String
    private let destination: URL

    public init(_ title: String, destination: URL) {
        self.title = title
        self.destination = destination
    }

    public var body: some View {
        Link(destination: destination) { Text(title).underline() }
    }
}
