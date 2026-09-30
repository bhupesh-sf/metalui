import SwiftUI

// WIP: MetalSkeleton is a placeholder that keeps the React API's shape (a block of a width and
// height). It draws a plain rounded fill, not yet the sunk well, the beat, the sheen or the swap
// from skeleton.agent.md. Web is the reference.

/// Where content will be before it arrives. Work in progress: see skeleton.agent.md.
public struct MetalSkeleton: View {
    private let width: CGFloat?
    private let height: CGFloat

    public init(width: CGFloat? = nil, height: CGFloat = MetalRecipes.skeleton.points("self.line")) {
        self.width = width
        self.height = height
    }

    public var body: some View {
        RoundedRectangle(cornerRadius: MetalRecipes.skeleton.points("self.radius"), style: .continuous)
            .fill(.quaternary)
            .frame(width: width, height: height)
            .accessibilityHidden(true)
    }
}
