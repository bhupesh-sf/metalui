import SwiftUI
#if os(macOS)
import AppKit
#endif

/// The key's words for a quick edit: at rest, while a save is out, landed, and what assistive
/// tech hears when a save fails (the key itself says Try again).
public struct MetalQuickEditWords: Sendable {
    public let verb: String
    public let doing: String
    public let done: String
    public let failed: String

    public init(verb: String, doing: String, done: String, failed: String) {
        self.verb = verb
        self.doing = doing
        self.done = done
        self.failed = failed
    }

    public static let rename = MetalQuickEditWords(verb: "Rename", doing: "Renaming…", done: "Renamed", failed: "Couldn’t rename")
}

/// One short value edited where it stands and committed with one key (Rename, Tag), for a
/// popover or a dialog. See quick-edit.agent.md.
///
///     MetalQuickEdit("Region name", value: name, validate: { taken.contains($0) ? "A region is already called \($0)." : nil },
///                    onCommit: { next in try await save(next) }, onClose: { renaming = false })
///
/// The field takes focus with the value selected (a file keeps its extension out); Return commits
/// and Escape cancels; the key is off while the value is empty or unchanged. Committing, the key
/// holds down (the arc after its delay) and the field locks; landed, the glyph turns to check and
/// the word to Renamed, and `onClose` runs after the recipe's hold. A thrown error turns the glyph
/// to sync-error and the key to Try again. Offer Undo in a toast once `onCommit` returns.
public struct MetalQuickEdit: View {
    private enum Phase { case editing, saving, done, failed }

    private let label: String
    private let value: String
    private let keepsExtension: Bool
    private let words: MetalQuickEditWords
    private let icon: MetalIconName
    private let validate: (String) -> String?
    private let onCommit: (String) async throws -> Void
    private let onClose: () -> Void

    @State private var draft: String
    @State private var phase = Phase.editing
    @State private var checked = false
    @FocusState private var focused: Bool
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ label: String, value: String, keepsExtension: Bool = false, words: MetalQuickEditWords = .rename,
                icon: MetalIconName = .pen, validate: @escaping (String) -> String? = { _ in nil },
                onCommit: @escaping (String) async throws -> Void, onClose: @escaping () -> Void) {
        self.label = label
        self.value = value
        self.keepsExtension = keepsExtension
        self.words = words
        self.icon = icon
        self.validate = validate
        self.onCommit = onCommit
        self.onClose = onClose
        _draft = State(initialValue: value)
    }

    private var next: String { draft.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var fresh: Bool { !next.isEmpty && next != value.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var settled: Bool { phase == .saving || phase == .done }
    private var why: String? { checked && fresh ? validate(next) : nil }
    private var glyph: MetalIconName { phase == .done ? .check : phase == .failed ? .syncError : icon }
    private var word: String {
        switch phase {
        case .editing: return words.verb
        case .saving: return words.doing
        case .done: return words.done
        case .failed: return "Try again"
        }
    }

    public var body: some View {
        let recipe = MetalRecipes.quickEdit
        let field = MetalRecipes.field
        let shape = RoundedRectangle(cornerRadius: field.points("regular.radius"), style: .continuous)
        VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            VStack(alignment: .leading, spacing: MetalRecipes.formField.points("self.gap")) {
                MetalWell(.field, radius: field.points("regular.radius")) {
                    TextField("", text: $draft)
                        .textFieldStyle(.plain)
                        .font(.metal(MetalType.ui))
                        .foregroundStyle(colorway.tokens.ink.color)
                        .focused($focused)
                        .disabled(settled)
                        .onSubmit(commit)
                        .onChange(of: draft) { if phase == .failed { phase = .editing } }
                        .accessibilityLabel(label)
                        .padding(.leading, field.points("regular.pad-left"))
                        .padding(.trailing, field.points("regular.pad-right"))
                        .frame(height: field.points("regular.height"))
                }
                .overlay {
                    if why != nil { shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth) }
                }
                if let why {
                    Text(why)
                        .font(.metal(MetalType.meta))
                        .foregroundStyle((MetalRecipes.formField.color("error.ink", colorway: MetalRecipeColorway(colorway)) ?? colorway.tokens.invalid).color)
                        .transition(.opacity)
                }
            }
            .metalAnimation(.settle, value: why)
            HStack(spacing: recipe.points("actions.gap")) {
                Spacer(minLength: .zero)
                MetalButton("Cancel", action: onClose).disabled(phase == .saving)
                MetalButton(word, cap: .primary, action: commit) {
                    MetalIcon(glyph, size: MetalRecipes.button.points("self.glyph"))
                }
                .metalButtonState(phase == .saving ? .waiting : phase == .done ? .done : .ready)
                .disabled(!settled && !fresh)
            }
        }
        .metalExitCommand { if phase != .saving { onClose() } }
        .onAppear { focused = true; select() }
        .task(id: phase == .done) {
            guard phase == .done else { return }
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("self.hold")))
            guard !Task.isCancelled else { return }
            onClose()
        }
    }

    private func set(_ new: Phase) {
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { phase = new }
        if new == .done { AccessibilityNotification.Announcement(words.done).post() }
        if new == .failed { AccessibilityNotification.Announcement("\(words.failed). Try again.").post() }
    }

    private func commit() {
        guard !settled, fresh else { return }
        checked = true
        guard validate(next) == nil else { focused = true; return }
        let value = next
        set(.saving)
        Task { @MainActor in
            do { try await onCommit(value); set(.done) } catch { set(.failed); focused = true }
        }
    }

    /// The first focus selects the value, so typing replaces it; a file keeps its extension out.
    private func select() {
        #if os(macOS)
        let dot = keepsExtension ? (draft as NSString).range(of: ".", options: .backwards).location : NSNotFound
        let length = dot != NSNotFound && dot > .zero ? dot : (draft as NSString).length
        DispatchQueue.main.async {
            (NSApp.keyWindow?.firstResponder as? NSTextView)?.setSelectedRange(NSRange(location: .zero, length: length))
        }
        #endif
    }
}
