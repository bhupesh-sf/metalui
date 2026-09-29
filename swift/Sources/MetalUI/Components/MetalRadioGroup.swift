import SwiftUI

// WIP: MetalRadioGroup is a placeholder that keeps the React API's shape (selection, axis, options
// with labels). It lays the options out and binds the choice, but does not yet draw the checkbox
// well, the pip, or the press-and-latch motion from radio.agent.md. Web is the reference for now.

public struct MetalRadioOption<Value: Hashable>: Identifiable {
    public let value: Value
    public let label: String
    public let isDisabled: Bool
    public var id: Value { value }

    public init(_ value: Value, _ label: String, disabled: Bool = false) {
        self.value = value
        self.label = label
        self.isDisabled = disabled
    }
}

/// One choice from a short list. Work in progress: see radio.agent.md for the finished behaviour.
public struct MetalRadioGroup<Value: Hashable>: View {
    @Binding private var selection: Value
    private let options: [MetalRadioOption<Value>]
    private let axis: Axis

    public init(selection: Binding<Value>, axis: Axis = .vertical, options: [MetalRadioOption<Value>]) {
        self._selection = selection
        self.axis = axis
        self.options = options
    }

    public var body: some View {
        let layout = axis == .vertical ? AnyLayout(VStackLayout(alignment: .leading)) : AnyLayout(HStackLayout())
        layout {
            ForEach(options) { option in
                Button {
                    selection = option.value
                } label: {
                    Label(option.label, systemImage: selection == option.value ? "largecircle.fill.circle" : "circle")
                }
                .buttonStyle(.plain)
                .disabled(option.isDisabled)
                .accessibilityAddTraits(selection == option.value ? .isSelected : [])
            }
        }
        .accessibilityElement(children: .contain)
    }
}
