import SwiftUI

// WIP: MetalFormField is a placeholder that keeps the React API's shape (a label, a description, an
// error, and the control). It stacks them with system text styles, not yet the recipe's gaps, the
// error ink, or the error row growing open from under the control (form-field.agent.md).

/// A control with its words. Work in progress: see form-field.agent.md.
public struct MetalFormField<Control: View>: View {
    private let label: String
    private let description: String?
    private let error: String?
    private let control: Control

    public init(_ label: String, description: String? = nil, error: String? = nil, @ViewBuilder control: () -> Control) {
        self.label = label
        self.description = description
        self.error = error
        self.control = control()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.formField.points("self.gap")) {
            Text(label)
            control.accessibilityLabel(label)
            if let description { Text(description).font(.caption).foregroundStyle(.secondary) }
            if let error { Text(error).font(.caption).foregroundStyle(.red) }
        }
    }
}
