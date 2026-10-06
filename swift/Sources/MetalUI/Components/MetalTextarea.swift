import SwiftUI

// WIP: MetalTextarea is a placeholder that keeps the React API's shape (text, rows, limit, invalid).
// It grows between the rows with a vertical TextField, but does not yet draw the field well, the
// settle-spring growth, the counter or its refusal shake from textarea.agent.md. Web is the reference.

/// Several lines of text. Work in progress: see textarea.agent.md for the finished behaviour.
public struct MetalTextarea: View {
    /// Field's sizes: large writes in the content role; regular and compact in the ui role.
    public enum Size: Sendable { case large, regular, compact }

    private let label: String
    @Binding private var text: String
    private let minRows: Int
    private let maxRows: Int
    private let limit: Int?
    private let invalid: Bool
    private let size: Size

    public init(_ label: String, text: Binding<String>, size: Size = .large, minRows: Int = 3, maxRows: Int = 8, limit: Int? = nil, invalid: Bool = false) {
        self.label = label
        self.size = size
        self._text = text
        self.minRows = minRows
        self.maxRows = maxRows
        self.limit = limit
        self.invalid = invalid
    }

    public var body: some View {
        TextField(label, text: $text, axis: .vertical)
            .lineLimit(minRows...maxRows)
            .font(.metal(size == .large ? MetalType.content : MetalType.ui))
            .onChange(of: text) { _, new in
                if let limit, new.count > limit { text = String(new.prefix(limit)) }
            }
            .accessibilityLabel(label)
    }
}
