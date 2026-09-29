import SwiftUI

// WIP: MetalSpinner is a placeholder that keeps the React API's shape (size, label). It uses the
// system ProgressView, not yet the sunk well, the green arc, the constant turn, or the beat before it
// shows from spinner.agent.md. Web is the reference.

public enum MetalSpinnerSize: Sendable { case regular, small }

/// Steady work in a small space. Work in progress: see spinner.agent.md.
public struct MetalSpinner: View {
    private let size: MetalSpinnerSize
    private let label: String

    public init(size: MetalSpinnerSize = .regular, label: String = "Loading") {
        self.size = size
        self.label = label
    }

    public var body: some View {
        ProgressView()
            .controlSize(size == .small ? .mini : .small)
            .tint(.green)
            .accessibilityLabel(label)
    }
}
