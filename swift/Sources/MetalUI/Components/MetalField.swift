import SwiftUI
#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

// Field: text in a well. Mirrors components/field (field.agent.md) from the field and well recipes:
// three sizes, the green caret, a prefix and suffix engraved on the well's floor, mini keys in the trail
// (clear, a shortcut keycap that turns to Esc, a remote check), Textarea's counter, and chars.

/// The field's sizes: large (44, the palette's field, where the caret is the focus) and the form sizes,
/// regular (32) and compact (28), which match the select and show the focus ring.
public enum MetalFieldSize: String, CaseIterable, Sendable {
    case large, regular, compact

    /// The recipe's part for this size (large is `field`).
    var part: String { self == .large ? "field" : rawValue }
}

private struct MetalFormInvalidKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    /// Set by `MetalFormField` while it shows an error: the field inside draws the invalid ring.
    public var metalFormInvalid: Bool {
        get { self[MetalFormInvalidKey.self] }
        set { self[MetalFormInvalidKey.self] = newValue }
    }
}

/// A light well, or a graphite one in a dark strip.
public enum MetalFieldTone: Sendable { case light, graphite }

/// Text input in a well, with a leading glyph, fixed parts of the value, and mini keys in the trail.
public struct MetalField<Trail: View>: View {
    let label: String
    @Binding var text: String
    let prompt: String
    let size: MetalFieldSize
    let tone: MetalFieldTone
    let icon: MetalIconName?
    let prefix: String?
    let suffix: String?
    let limit: Int?
    let chars: Int?
    let clear: Bool
    let copy: Bool
    let secure: Bool
    let shortcut: String?
    let check: String?
    let invalid: Bool
    let trail: Trail
    /// Headless captures: ImageRenderer cannot draw a text field, so the text and its caret are drawn.
    var snapshot = false
    var snapshotFocused = false

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalFormInvalid) private var formInvalid
    @FocusState private var focused: Bool
    @State private var refusals = 0
    @State private var copied = false
    @State private var revealed = false

    /// - Parameters:
    ///   - prefix, suffix: fixed parts of the value ("https://", "kg"), engraved on the well's floor; not part of `text`.
    ///   - limit: a character limit; the counter shows near it and shakes when typing goes past it.
    ///   - chars: the expected length; the input is that many characters wide.
    ///   - clear: a clear key that shows while there is text.
    ///   - copy: a copy key that shows while there is text; its glyph turns to the check for the recipe's copy.hold.
    ///   - secure: a password: the text is hidden, and a show-password key shows it (eye ↔ eye-off).
    ///   - shortcut: the keys that focus the field ("⌘K"), on a keycap that reads Esc while the field is active.
    ///   - check: what a remote check confirmed ("Name available"); its tick acts as it arrives. nil shows nothing.
    ///   - trail: more mini keys (`MetalFieldKey`) after the built-in ones.
    public init(_ label: String, text: Binding<String>, prompt: String = "", size: MetalFieldSize = .large,
                tone: MetalFieldTone = .light, icon: MetalIconName? = nil, prefix: String? = nil, suffix: String? = nil,
                limit: Int? = nil, chars: Int? = nil, clear: Bool = false, copy: Bool = false, secure: Bool = false, shortcut: String? = nil, check: String? = nil,
                invalid: Bool = false, @ViewBuilder trail: () -> Trail) {
        self.label = label
        self._text = text
        self.prompt = prompt
        self.size = size
        self.tone = tone
        self.icon = icon
        self.prefix = prefix
        self.suffix = suffix
        self.limit = limit
        self.chars = chars
        self.clear = clear
        self.copy = copy
        self.secure = secure
        self.shortcut = shortcut
        self.check = check
        self.invalid = invalid
        self.trail = trail()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.field }
    private var finish: MetalRecipeColorway { MetalRecipeColorway(colorway) }
    private var active: Bool { snapshot ? snapshotFocused : focused }
    /// A password that is not being shown.
    private var hidden: Bool { secure && !revealed }
    private var role: MetalTypeRole {
        size == .large ? recipe.typeRole("field.font", trackingKey: "field.tracking") : MetalType.ui
    }
    private func ink(_ key: String) -> Color { recipe.color("field.\(key)", colorway: finish)?.color ?? .clear }
    private func metric(_ key: String) -> Double { recipe.points("\(size.part).\(key)") }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: metric("radius"), style: .continuous)
        HStack(spacing: metric("gap")) {
            if let icon {
                MetalIcon(icon, size: metric("glyph")).foregroundStyle(ink("hint"))
            }
            if let prefix { affix(prefix) }
            input
            if let suffix { affix(suffix) }
            if let limit { counter(limit) }
            keys
        }
        .font(.metal(role))
        .tracking(role.trackingPoints)
        .padding(.leading, metric("pad-left"))
        .padding(.trailing, metric("pad-right"))
        .frame(height: metric("height"))
        .contentShape(shape)
        .onTapGesture { focused = true }
        .background { MetalWell(tone == .graphite ? .graphite : .field, radius: metric("radius")) { Color.clear } }
        .overlay {
            if invalid || formInvalid {
                shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth).allowsHitTesting(false)
            }
            // The form sizes show the flush green ring; the large field's caret is its focus.
            if active && size != .large && isEnabled {
                shape.inset(by: -MetalRing.focusWidth / 2)
                    .stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                    .allowsHitTesting(false)
            }
        }
        .fixedSize(horizontal: chars != nil, vertical: false)
        .opacity(isEnabled ? .one : recipe.scalar("state.disabled"))
        .background { shortcutBinding }
    }

    // MARK: the input

    @ViewBuilder private var input: some View {
        let field = Group {
            if snapshot {
                HStack(spacing: .zero) {
                    if !text.isEmpty { Text(hidden ? String(repeating: "•", count: text.count) : text).foregroundColor(ink("ink")) }
                    if snapshotFocused {
                        Rectangle().fill(recipe.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                            .frame(width: MetalPaletteMetrics.caretWidth, height: role.line)
                    }
                    if text.isEmpty { Text(prompt).foregroundColor(ink("hint")) }
                }
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Group {
                    if hidden {
                        SecureField("", text: $text, prompt: Text(prompt).foregroundColor(ink("hint")))
                    } else {
                        TextField("", text: $text, prompt: Text(prompt).foregroundColor(ink("hint")))
                    }
                }
                    .textFieldStyle(.plain)
                    .foregroundColor(ink("ink"))
                    .tint(recipe.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                    .focused($focused)
                    .onKeyPress(.escape) { escape() }
                    .accessibilityLabel(label)
                    .accessibilityHint([prefix, suffix].compactMap { $0 }.joined(separator: " "))
            }
        }
        if let chars {
            // As wide as the expected length in this font's digits, plus room for the caret.
            Text(String(repeating: "0", count: chars))
                .hidden()
                .padding(.trailing, recipe.points("chars.slack"))
                .overlay(alignment: .leading) { field }
        } else {
            field
        }
    }

    private func escape() -> KeyPress.Result {
        guard shortcut != nil else { return .ignored }
        if text.isEmpty { focused = false } else { text = "" }
        return .handled
    }

    // MARK: fixed parts, counter, keys

    private func affix(_ value: String) -> some View {
        let lip = MetalRecipes.label.textShadows("engraved", colorway: finish).first
        return Text(value)
            .foregroundColor(colorway.tokens.ink3.color)
            .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
            .lineLimit(1)
            .fixedSize()
            .accessibilityHidden(true)
    }

    private func counter(_ limit: Int) -> some View {
        let shown = Double(text.count) >= Double(limit) * MetalRecipes.textarea.scalar("count.show")
        let atLimit = text.count >= limit
        return Text("\(text.count)/\(limit)")
            .font(.metal(MetalType.meta))
            .monospacedDigit()
            .foregroundColor((atLimit ? MetalShared.red : colorway.tokens.ink3).color)
            .fixedSize()
            .opacity(shown ? .one : .zero)
            .animation(.easeOut(duration: MetalRecipes.textarea.durationSeconds("count.fade")), value: shown)
            .keyframeAnimator(initialValue: Double.zero, trigger: refusals) { content, nudge in
                content.offset(x: nudge)
            } keyframes: { _ in
                KeyframeTrack {
                    LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                    SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                                   spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
                }
            }
            .onChange(of: text) { _, new in
                guard new.count > limit else { return }
                text = String(new.prefix(limit))
                refusals += 1
            }
            .accessibilityLabel("\(text.count) of \(limit) characters")
    }

    @ViewBuilder private var keys: some View {
        let hasKeys = clear || copy || secure || shortcut != nil || check != nil || ObjectIdentifier(Trail.self) != ObjectIdentifier(EmptyView.self)
        if hasKeys {
            HStack(spacing: recipe.points("key.gap")) {
                if let check { MetalFieldCheck(check, glyph: metric("glyph")) }
                if clear {
                    MetalFieldKey("Clear", icon: .close) { text = ""; focused = true }
                        .metalPresence(!text.isEmpty, pop: recipe.scalar("key.pop"))
                }
                if copy {
                    MetalFieldKey("Copy", icon: copied ? .check : .copy) { copyText() }
                        .metalAnimation(.settle, value: copied)
                        .metalPresence(!text.isEmpty, pop: recipe.scalar("key.pop"))
                }
                if secure {
                    MetalFieldKey("Show password", icon: revealed ? .eyeOff : .eye) { revealed.toggle(); focused = true }
                        .accessibilityValue(revealed ? "Shown" : "Hidden")
                        .accessibilityAddTraits(revealed ? .isSelected : [])
                        .metalAnimation(.settle, value: revealed)
                }
                trail
                if let shortcut {
                    MetalKbd(active ? "Esc" : shortcut)
                        .contentTransition(.numericText())
                        .metalAnimation(.settle, value: active)
                        .accessibilityHidden(true)
                }
            }
            .frame(maxWidth: chars == nil ? .infinity : nil, alignment: .trailing)
        }
    }

    private func copyText() {
        #if canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #elseif canImport(UIKit)
        UIPasteboard.general.string = text
        #endif
        copied = true
        AccessibilityNotification.Announcement("Copied").post()
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("copy.hold")))
            copied = false
        }
    }

    /// ⌘K and friends: a hidden button that takes the keys and puts the caret in the field.
    @ViewBuilder private var shortcutBinding: some View {
        if let shortcut, let key = shortcut.last {
            Button("") { focused = true }
                .keyboardShortcut(KeyEquivalent(Character(key.lowercased())), modifiers: Self.modifiers(shortcut))
                .opacity(.zero)
                .accessibilityHidden(true)
        }
    }

    static func modifiers(_ keys: String) -> EventModifiers {
        var out: EventModifiers = []
        if keys.contains("⌘") { out.insert(.command) }
        if keys.contains("⌥") { out.insert(.option) }
        if keys.contains("⇧") { out.insert(.shift) }
        if keys.contains("⌃") { out.insert(.control) }
        return out
    }

    /// For headless captures: draw the text and caret instead of the platform text field.
    func snapshot(focused: Bool) -> Self {
        var copy = self
        copy.snapshot = true
        copy.snapshotFocused = focused
        return copy
    }
}

extension MetalField where Trail == EmptyView {
    public init(_ label: String, text: Binding<String>, prompt: String = "", size: MetalFieldSize = .large,
                tone: MetalFieldTone = .light, icon: MetalIconName? = nil, prefix: String? = nil, suffix: String? = nil,
                limit: Int? = nil, chars: Int? = nil, clear: Bool = false, copy: Bool = false, secure: Bool = false, shortcut: String? = nil, check: String? = nil,
                invalid: Bool = false) {
        self.init(label, text: text, prompt: prompt, size: size, tone: tone, icon: icon, prefix: prefix, suffix: suffix,
                  limit: limit, chars: chars, clear: clear, copy: copy, secure: secure, shortcut: shortcut, check: check, invalid: invalid) { EmptyView() }
    }
}

// MARK: - Mini keys

/// A mini key in a field's trail: a compact cap, 20 round with a 12 glyph and a 24 hit area.
public struct MetalFieldKey: View {
    let label: String
    let icon: MetalIconName
    let action: () -> Void

    public init(_ label: String, icon: MetalIconName, action: @escaping () -> Void) {
        self.label = label
        self.icon = icon
        self.action = action
    }

    public var body: some View {
        // A changing glyph (copy → check, eye → eye-off) replaces in place, the symbol's own transition.
        Button(action: action) { MetalIcon(icon, size: MetalRecipes.field.points("key.glyph")).contentTransition(.symbolEffect(.replace)) }
            .buttonStyle(MetalFieldKeyStyle())
            .focusEffectDisabled()
            .accessibilityLabel(label)
    }
}

private struct MetalFieldKeyStyle: ButtonStyle {
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    func makeBody(configuration: Configuration) -> some View {
        let field = MetalRecipes.field
        let button = MetalRecipes.button
        let size = field.points("key.size")
        let down = configuration.isPressed && isEnabled
        return configuration.label
            .foregroundColor((hovering ? colorway.tokens.ink : colorway.tokens.ink2).color)
            .frame(width: size, height: size)
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(button, part: "compact", in: Circle()).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(button, part: "compact", state: "pressed", in: Circle()).opacity(down ? .one : .zero)
                }
            }
            .offset(y: down && !reduceMotion ? button.points("self.travel") : .zero)
            .animation(down ? nil : MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation, value: down)
            .contentShape(Circle().inset(by: (size - field.points("key.hit")) / 2))
            .onHover { hovering = $0 }
            .opacity(isEnabled ? .one : button.scalar("self.disabled"))
    }
}

/// A remote check that passed: the tick, in the deep green, acts as it arrives, and is said once.
struct MetalFieldCheck: View {
    let label: String
    let glyph: Double
    @State private var arrived = false

    init(_ label: String, glyph: Double) {
        self.label = label
        self.glyph = glyph
    }

    var body: some View {
        MetalIcon(.check, size: glyph, interaction: MetalIconInteraction(isPressed: arrived))
            .foregroundStyle(MetalShared.greenDeep.color)
            .frame(width: MetalRecipes.field.points("key.size"), height: MetalRecipes.field.points("key.size"))
            .transition(.scale(scale: MetalRecipes.field.scalar("key.pop")).combined(with: .opacity))
            .onAppear {
                arrived = true
                AccessibilityNotification.Announcement(label).post()
            }
            .accessibilityElement()
            .accessibilityLabel(label)
    }
}

extension View {
    /// A key that comes and goes in place: it pops in from `pop` on the settle spring and leaves on the release
    /// spring, keeping its slot so nothing beside it moves. Reduce Motion: a fade.
    func metalPresence(_ shown: Bool, pop: Double) -> some View {
        modifier(MetalKeyPresence(shown: shown, pop: pop))
    }
}

private struct MetalKeyPresence: ViewModifier {
    let shown: Bool
    let pop: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content
            .scaleEffect(shown || reduceMotion ? .one : pop)
            .opacity(shown ? .one : .zero)
            .allowsHitTesting(shown)
            .accessibilityHidden(!shown)
            .animation(MetalMotion.resolve(shown ? .settle : .release, reduceMotion: reduceMotion).animation, value: shown)
    }
}

// MARK: - Search field

/// A button in a well that opens search: the placeholder and a keycap, light or graphite.
public struct MetalSearchField: View {
    let placeholder: String
    let icon: MetalIconName?
    let shortcut: String?
    let tone: MetalFieldTone
    let action: () -> Void

    @Environment(\.metalColorway) private var colorway
    @FocusState private var focused: Bool

    public init(_ placeholder: String, icon: MetalIconName? = .search, shortcut: String? = "⌘K",
                tone: MetalFieldTone = .graphite, action: @escaping () -> Void) {
        self.placeholder = placeholder
        self.icon = icon
        self.shortcut = shortcut
        self.tone = tone
        self.action = action
    }

    public var body: some View {
        let recipe = MetalRecipes.field
        let shape = RoundedRectangle(cornerRadius: recipe.points("search.radius"), style: .continuous)
        let ink = tone == .graphite
            ? recipe.color("search.ink")?.color ?? .clear
            : recipe.color("field.hint", colorway: MetalRecipeColorway(colorway))?.color ?? .clear
        Button(action: action) {
            HStack(spacing: recipe.points("search.gap")) {
                if let icon { MetalIcon(icon, size: recipe.points("search.glyph")) }
                Text(placeholder).lineLimit(1)
                Spacer(minLength: .zero)
                if let shortcut { MetalKbd(shortcut, surface: tone == .graphite ? .strip : .default) }
            }
            .font(recipe.font("search.font"))
            .tracking(recipe.tracking("search.tracking", size: recipe.fontSize("search.font")))
            .foregroundColor(ink)
            .padding(.leading, recipe.points("search.pad-left"))
            .padding(.trailing, recipe.points("search.pad-right"))
            .frame(minWidth: recipe.points("search.min-width"))
            .frame(height: recipe.points("search.height"))
            .background { MetalWell(tone == .graphite ? .graphite : .field, radius: recipe.points("search.radius")) { Color.clear } }
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .focused($focused)
        .focusEffectDisabled()
        .overlay {
            if focused {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
            }
        }
        .accessibilityLabel(placeholder)
        .accessibilityHint(shortcut ?? "")
    }
}
