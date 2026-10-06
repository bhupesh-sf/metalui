import SwiftUI

// WIP: MetalTextarea is a placeholder that keeps the React API's shape (text, rows, limit, invalid).
// It grows between the rows with a vertical TextField, but does not yet draw the field well, the
// settle-spring growth, the counter or its refusal shake from textarea.agent.md. Web is the reference.
// The ghost (`suggestion`) is in step: the words that would come next after the text in the hint ink
// while it has focus (SwiftUI can't read the caret, so "at the end" is "focused"); Tab takes them,
// Escape lets them go, typing their next letters eats them.

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
    private let suggestion: String?
    private let onSuggestionDismiss: (() -> Void)?
    @State private var anchor: (for: String?, base: String) = (nil, "")
    @State private var dismissed: String?
    @FocusState private var focused: Bool
    @Environment(\.metalColorway) private var colorway

    public init(_ label: String, text: Binding<String>, size: Size = .large, minRows: Int = 3, maxRows: Int = 8, limit: Int? = nil, invalid: Bool = false,
                suggestion: String? = nil, onSuggestionDismiss: (() -> Void)? = nil) {
        self.label = label
        self.size = size
        self._text = text
        self.minRows = minRows
        self.maxRows = maxRows
        self.limit = limit
        self.invalid = invalid
        self.suggestion = suggestion
        self.onSuggestionDismiss = onSuggestionDismiss
    }

    /// What is left of the suggestion after what was typed since it came.
    private var rest: String {
        guard let suggestion, dismissed != suggestion, anchor.for == suggestion, text.hasPrefix(anchor.base) else { return "" }
        let typed = String(text.dropFirst(anchor.base.count))
        return suggestion.hasPrefix(typed) ? String(suggestion.dropFirst(typed.count)) : ""
    }

    public var body: some View {
        let showing = focused && !rest.isEmpty
        TextField(label, text: $text, axis: .vertical)
            .textFieldStyle(.plain)
            .lineLimit(minRows...maxRows)
            .focused($focused)
            .overlay(alignment: .topLeading) {
                if showing {
                    (Text(text).foregroundColor(.clear) + Text(rest).foregroundColor(colorway.tokens.ink3.color))
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .font(.metal(size == .large ? MetalType.content : MetalType.ui))
            .onKeyPress(.tab) {
                guard showing else { return .ignored }
                text += rest
                return .handled
            }
            .onKeyPress(.escape) {
                guard showing else { return .ignored }
                dismissed = suggestion
                onSuggestionDismiss?()
                return .handled
            }
            .onChange(of: suggestion, initial: true) { _, new in anchor = (new, text) }
            .onChange(of: text) { _, new in
                if let limit, new.count > limit { text = String(new.prefix(limit)) }
            }
            .accessibilityLabel(label)
            .accessibilityHint(showing ? "Suggestion: \(suggestion ?? ""). Tab to accept." : "")
    }
}
