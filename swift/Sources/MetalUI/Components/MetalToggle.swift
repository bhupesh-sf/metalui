import SwiftUI

// WIP: MetalToggle is a placeholder that keeps the React API's shape (a label and an isOn binding).
// It uses a button-styled system Toggle, not yet the button cap, the lamp, or the catch-and-latch
// travel from toggle.agent.md. Web is the reference.

/// A latching push button. Work in progress: see toggle.agent.md.
public struct MetalToggle: View {
    private let label: String
    @Binding private var isOn: Bool

    public init(_ label: String, isOn: Binding<Bool>) {
        self.label = label
        self._isOn = isOn
    }

    public var body: some View {
        Toggle(label, isOn: $isOn)
            .toggleStyle(.button)
    }
}
