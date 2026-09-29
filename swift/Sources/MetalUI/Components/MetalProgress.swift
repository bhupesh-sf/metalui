import SwiftUI

// WIP: MetalProgress is a placeholder that keeps the React API's shape (a value or nil, a total, a
// label). It uses the system ProgressView, not yet the switch track and fill, the settle-spring edge,
// or the sweeping segment from progress.agent.md. Web is the reference.

/// How far a task has come. Work in progress: see progress.agent.md.
public struct MetalProgress: View {
    private let label: String?
    private let value: Double?
    private let total: Double

    public init(_ label: String? = nil, value: Double?, total: Double = 100) {
        self.label = label
        self.value = value
        self.total = total
    }

    public var body: some View {
        if let value {
            ProgressView(value: value, total: total) { if let label { Text(label) } }
                .tint(.green)
        } else {
            ProgressView { if let label { Text(label) } }
                .progressViewStyle(.linear)
        }
    }
}
