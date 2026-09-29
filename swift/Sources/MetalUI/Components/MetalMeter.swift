import SwiftUI

// WIP: MetalMeter is a placeholder that keeps the React API's shape (a value in a range, a label).
// It uses the system Gauge, not yet the LED segments coloured by position or the sweep from
// meter.agent.md. Web is the reference.

/// A level in a range. Work in progress: see meter.agent.md.
public struct MetalMeter: View {
    private let label: String
    private let value: Double
    private let range: ClosedRange<Double>

    public init(_ label: String, value: Double, in range: ClosedRange<Double> = 0...100) {
        self.label = label
        self.value = value
        self.range = range
    }

    public var body: some View {
        Gauge(value: value, in: range) { Text(label) }
            .gaugeStyle(.accessoryLinearCapacity)
    }
}
