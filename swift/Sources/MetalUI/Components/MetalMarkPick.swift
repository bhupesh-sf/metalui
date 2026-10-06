import SwiftUI

// Mark pick, in step with mark-pick.tsx and the mark-pick recipe (mark-pick.agent.md).
//
// A recognised tag or person you swap for another. At rest it is the MetalCueTag or the MetalCueMark
// exactly. A click (or Return / Space with focus) opens a popover from the words holding a small
// MetalCombobox with every option, its recent picks first; a pick rewrites the words in place and commits
// once (onCommit: the host's undo step); Esc or a click outside changes nothing. A pick is a jump, not a
// step: the words change at once.

/// A recognised tag or person you swap for another from a small combobox. The words are the value: bind them.
public struct MetalMarkPick: View {
    @Binding var words: String
    let kind: MetalCueKind
    let options: [MetalComboboxItem]
    let label: String?
    let glyph: MetalCueGlyph
    let onCommit: ((String) -> Void)?

    @State private var open = false

    /// - Parameters:
    ///   - words: the words as written ("#poster", "Sam"); replaced whole by a pick.
    ///   - options: what the words can become.
    ///   - onCommit: once per pick, with the new words: the host's one undo step.
    public init(_ words: Binding<String>, kind: MetalCueKind, options: [MetalComboboxItem], label: String? = nil,
                glyph: MetalCueGlyph = .kind, onCommit: ((String) -> Void)? = nil) {
        _words = words
        self.kind = kind
        self.options = options
        self.label = label
        self.glyph = glyph
        self.onCommit = onCommit
    }

    private var name: String { label ?? (kind == .person ? "Person" : kind == .tag || kind == .derivedTag ? "Tag" : "Choice") }

    private var pick: Binding<String?> {
        Binding(get: { nil }, set: { next in
            open = false
            guard let next, next != words else { return }
            words = next
            onCommit?(next)
        })
    }

    public var body: some View {
        Button { open = true } label: {
            if kind == .tag || kind == .derivedTag {
                MetalCueTag(words, derived: kind == .derivedTag)
            } else {
                MetalCueMark(words, kind: kind, label: label, glyph: glyph)
            }
        }
        .buttonStyle(.plain)
        #if os(macOS)
        .onHover { inside in if inside { NSCursor.pointingHand.push() } else { NSCursor.pop() } }
        #endif
        .accessibilityLabel("\(name), \(words)")
        .accessibilityHint("Change \(name.lowercased())")
        .popover(isPresented: $open, arrowEdge: .bottom) {
            MetalCombobox(name, selection: pick, items: options, prompt: "Find a \(name.lowercased())", size: .compact,
                          recent: options.map(\.value))
                .frame(width: MetalRecipes.markPick.points("plate.width"))
                .padding(MetalRecipes.popover.points("self.pad"))
        }
    }
}
