import SwiftUI

// WIP: MetalNumberField is a placeholder that keeps the React API's shape (a value in a range with a
// step, a label). It uses the system Stepper, not yet the field-well pill, the keycaps, the drum turn
// or the refusal from number-field.agent.md. Web is the reference.

/// A number you step, scrub or type. Work in progress: see number-field.agent.md.
public struct MetalNumberField: View {
    private let label: String
    @Binding private var value: Int
    private let range: ClosedRange<Int>
    private let step: Int

    public init(_ label: String, value: Binding<Int>, in range: ClosedRange<Int>, step: Int = 1) {
        self.label = label
        self._value = value
        self.range = range
        self.step = step
    }

    public var body: some View {
        Stepper(value: $value, in: range, step: step) {
            Text("\(label): \(value)").monospacedDigit()
        }
    }
}
