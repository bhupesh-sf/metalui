import SwiftUI

// WIP: MetalCalendar is a placeholder that keeps the React API's shape (a selection and a range). It
// uses the system graphical DatePicker, not yet the switcher thumb, today's lamp, the drum title or the
// month's arrival from calendar.agent.md. Web is the reference.

/// A month to choose a day from. Work in progress: see calendar.agent.md.
public struct MetalCalendar: View {
    private let label: String
    @Binding private var selection: Date
    private let range: ClosedRange<Date>?

    public init(_ label: String, selection: Binding<Date>, in range: ClosedRange<Date>? = nil) {
        self.label = label
        self._selection = selection
        self.range = range
    }

    public var body: some View {
        if let range {
            DatePicker(label, selection: $selection, in: range, displayedComponents: .date).datePickerStyle(.graphical)
        } else {
            DatePicker(label, selection: $selection, displayedComponents: .date).datePickerStyle(.graphical)
        }
    }
}
