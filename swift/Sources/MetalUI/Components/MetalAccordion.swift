import SwiftUI

// WIP: MetalAccordion is a placeholder that keeps the React API's shape (a title and content per
// section, an expanded binding). It uses the system DisclosureGroup, not yet the row headers, rules,
// chevron or the settle/release motion from accordion.agent.md. Web is the reference.

/// A section that opens in place. Work in progress: see accordion.agent.md.
public struct MetalAccordion<Content: View>: View {
    private let title: String
    @Binding private var expanded: Bool
    private let content: Content

    public init(_ title: String, expanded: Binding<Bool>, @ViewBuilder content: () -> Content) {
        self.title = title
        self._expanded = expanded
        self.content = content()
    }

    public var body: some View {
        DisclosureGroup(title, isExpanded: $expanded) { content }
    }
}
