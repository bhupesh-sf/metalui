import SwiftUI
import UniformTypeIdentifiers

// Prompt input: where a message is written and sent. Mirrors components/prompt-input
// (prompt-input.agent.md) from the prompt-input recipe:
//   rest      a raised plate (raise-sm, the card radius): the host's files above, the well (MetalTextarea,
//             one row growing to maxRows), a strip: attach, the host's tools, the hint, Send
//   write     Return sends; Shift-Return is a new line
//   busy      Send becomes Stop (the send glyph turns to stop, the word changes); Stop or Escape calls onStop
//   attach    the attach key opens the file importer; files dropped on the plate are handed over, and the
//             plate's edge lights green while they are over it
//   disabled  the well, attach and Send dim; the reason stands in the hint's place with the amber lamp
// Reduce Motion: the glyph and word change in place.

public struct MetalPromptInput<Files: View, Tools: View>: View {
    @Binding var text: String
    let label: String
    let busy: Bool
    let canSend: Bool?
    let disabledReason: String?
    let hint: String?
    let maxRows: Int
    let onSend: (String) -> Void
    let onStop: (() -> Void)?
    let onAttach: (([URL]) -> Void)?
    let files: Files
    let tools: Tools
    let suggestion: String?
    let onSuggestionDismiss: (() -> Void)?
    @State private var importing = false
    @State private var over = false
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.metalColorway) private var colorway

    /// - Parameters:
    ///   - canSend: whether Send may send; default text that isn't blank (or `hasFiles`).
    ///   - onAttach: files picked or dropped; nil for no attach key.
    public init(_ label: String = "Message", text: Binding<String>, busy: Bool = false, canSend: Bool? = nil,
                disabledReason: String? = nil, hint: String? = "⇧↩ new line", maxRows: Int = 6,
                onSend: @escaping (String) -> Void, onStop: (() -> Void)? = nil, onAttach: (([URL]) -> Void)? = nil,
                suggestion: String? = nil, onSuggestionDismiss: (() -> Void)? = nil,
                @ViewBuilder files: () -> Files, @ViewBuilder tools: () -> Tools) {
        self.suggestion = suggestion
        self.onSuggestionDismiss = onSuggestionDismiss
        self._text = text
        self.label = label
        self.busy = busy
        self.canSend = canSend
        self.disabledReason = disabledReason
        self.hint = hint
        self.maxRows = maxRows
        self.onSend = onSend
        self.onStop = onStop
        self.onAttach = onAttach
        self.files = files()
        self.tools = tools()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.promptInput }
    private var ready: Bool { isEnabled && (canSend ?? !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) }

    private func send() {
        guard ready, !busy else { return }
        onSend(text.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous)
        VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            if Files.self != EmptyView.self {
                HStack(spacing: recipe.points("files.gap")) { files }
            }
            MetalTextarea(label, text: $text, minRows: 1, maxRows: maxRows, suggestion: suggestion, onSuggestionDismiss: onSuggestionDismiss)
                .onKeyPress(.return, phases: .down) { press in
                    if press.modifiers.contains(.shift) { return .ignored }
                    send()
                    return .handled
                }
                .onKeyPress(.escape) {
                    guard busy else { return .ignored }
                    onStop?()
                    return .handled
                }
            HStack(spacing: recipe.points("strip.gap")) {
                if onAttach != nil {
                    MetalIconButton("Attach files", icon: .attach) { importing = true }
                        .metalTooltip("Attach files")
                }
                tools
                Spacer(minLength: .zero)
                if !isEnabled, let disabledReason {
                    HStack(spacing: recipe.points("strip.gap")) {
                        MetalLED(.waiting, size: .small)
                        Text(disabledReason).lineLimit(1)
                    }
                    .font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
                } else if let hint {
                    Text(hint).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color).accessibilityHidden(true)
                }
                MetalButton(busy ? "Stop" : "Send", cap: .primary, size: .compact, action: busy ? { onStop?() } : send) {
                    MetalIcon(busy ? .stop : .send)
                }
                .disabled(!busy && !ready)
                .metalAnimation(.settle, value: busy)
            }
        }
        .padding(recipe.points("self.pad"))
        .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: shape)
        .overlay {
            shape.strokeBorder(MetalShared.green.color, lineWidth: MetalRecipes.dropZone.points("self.edge"))
                .opacity(over ? .one : .zero)
                .metalAnimation(.settle, value: over)
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.item], allowsMultipleSelection: true) { result in
            if case .success(let urls) = result, !urls.isEmpty { onAttach?(urls) }
        }
        .dropDestination(for: URL.self) { urls, _ in
            guard let onAttach, isEnabled, !urls.isEmpty else { return false }
            onAttach(urls)
            return true
        } isTargeted: { over = $0 && onAttach != nil }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }
}

extension MetalPromptInput where Files == EmptyView, Tools == EmptyView {
    public init(_ label: String = "Message", text: Binding<String>, busy: Bool = false, canSend: Bool? = nil,
                disabledReason: String? = nil, hint: String? = "⇧↩ new line", maxRows: Int = 6,
                onSend: @escaping (String) -> Void, onStop: (() -> Void)? = nil, onAttach: (([URL]) -> Void)? = nil,
                suggestion: String? = nil, onSuggestionDismiss: (() -> Void)? = nil) {
        self.init(label, text: text, busy: busy, canSend: canSend, disabledReason: disabledReason, hint: hint, maxRows: maxRows,
                  onSend: onSend, onStop: onStop, onAttach: onAttach, suggestion: suggestion, onSuggestionDismiss: onSuggestionDismiss,
                  files: { EmptyView() }, tools: { EmptyView() })
    }
}
