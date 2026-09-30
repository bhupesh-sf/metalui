import SwiftUI

// WIP: MetalButtonGroup is a placeholder that keeps the React API's shape (buttons set together). It
// lays them out in an HStack, not yet in the sunk tray with tightened inner corners, nor the split
// button's chevron menu from button-group.agent.md. Web is the reference.

/// Related actions set together. Work in progress: see button-group.agent.md.
public struct MetalButtonGroup<Content: View>: View {
    private let label: String
    private let content: Content

    public init(_ label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: MetalRecipes.buttonGroup.points("tray.gap")) { content }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
    }
}
