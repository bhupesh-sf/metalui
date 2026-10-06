import SwiftUI

// Code field: a one-time code, one slot per character. Mirrors components/code-field (code-field.agent.md)
// from the code-field recipe:
//   slots     the field well at Field's sizes; a filled slot holds a compact keycap with the character
//   typed     the keycap springs in from key.pop, fading in, on the part spring
//   paste     autofill or a paste sets the new keycaps in one ripple, key.ripple apart
//   current   the next empty slot wears the focus ring and a still caret
//   refuse    a character the code can't hold shakes the current slot (refusal spring)
//   invalid   the invalid ring on every slot, one shake of the row; the next character starts over
//   checking  slots at the spinner's item dim and the small ring after the last slot, then the tick
// One hidden TextField (`.textContentType(.oneTimeCode)`) takes the keys, paste and autofill, and is what
// VoiceOver reads. SwiftUI on macOS 14 has no selection API, so editing happens at the end; replacing one
// character in the middle waits for TextSelection (macOS 15).
// Reduce Motion: keycaps fade in without the pop or the ripple; nothing shakes.

/// Which characters a code holds. Letters show in capitals.
public enum MetalCodeKind: Sendable {
    case numeric, alpha, alphanumeric

    func allows(_ c: Character) -> Bool {
        switch self {
        case .numeric: c.isASCII && c.isNumber
        case .alpha: c.isASCII && c.isLetter
        case .alphanumeric: c.isASCII && (c.isLetter || c.isNumber)
        }
    }
}

/// A one-time code, one slot per character.
public struct MetalCodeField: View {
    let label: String
    @Binding var text: String
    let length: Int
    let groups: [Int]
    let size: MetalFieldSize
    let kind: MetalCodeKind
    let mask: Bool
    let invalid: Bool
    let checking: Bool
    let onComplete: ((String) -> Void)?
    /// Headless captures: ImageRenderer cannot draw a text field, so it is left out and focus is drawn.
    var snapshot = false
    var snapshotFocused = false

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool
    @State private var from = 0
    @State private var refusals = 0
    @State private var shakes = 0
    @State private var retype = false
    @State private var wait = MetalWait()

    /// `groups` default: 6 → 3–3, 8 → 4–4, otherwise one group.
    public init(_ label: String, text: Binding<String>, length: Int = 6, groups: [Int]? = nil, size: MetalFieldSize = .large,
                kind: MetalCodeKind = .numeric, mask: Bool = false, invalid: Bool = false, checking: Bool = false,
                onComplete: ((String) -> Void)? = nil) {
        self.label = label
        self._text = text
        self.length = length
        self.groups = groups ?? ((length == 6 || length == 8) ? [length / 2, length / 2] : [length])
        self.size = size
        self.kind = kind
        self.mask = mask
        self.invalid = invalid
        self.checking = checking
        self.onComplete = onComplete
    }

    /// A still capture (no text field), with the current slot drawn as focused.
    public func snapshot(focused: Bool = true) -> Self {
        var copy = self
        copy.snapshot = true
        copy.snapshotFocused = focused
        return copy
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.codeField }
    private func metric(_ key: String) -> Double { recipe.points("\(size.rawValue).\(key)") }
    private var role: MetalTypeRole { recipe.typeRole("\(size.rawValue).font", trackingKey: "\(size.rawValue).tracking") }
    private var active: Bool { focused || snapshotFocused }
    private var work: MetalWork { checking ? .working : invalid ? .failed : .done }

    public var body: some View {
        let chars = Array(text)
        HStack(spacing: metric("gap")) {
            ForEach(Array(groups.enumerated()), id: \.offset) { g, count in
                if g > .zero { dash }
                let start = groups.prefix(g).reduce(.zero, +)
                HStack(spacing: metric("gap")) {
                    ForEach(start..<(start + count), id: \.self) { i in
                        slot(i, char: i < chars.count ? chars[i] : nil)
                    }
                }
            }
        }
        .opacity(wait.busy ? MetalRecipes.spinner.scalar("item.dim") : .one)
        .animation(.easeOut(duration: MetalRecipes.spinner.durationSeconds("self.fade")), value: wait.busy)
        .overlay(alignment: .trailing) {
            MetalSpinner(size: .small, label: "Checking the code", result: "Code accepted", phase: wait.phase) { EmptyView() }
                .foregroundStyle(colorway.tokens.ink2.color)
                .alignmentGuide(.trailing) { $0[.leading] - recipe.points("ring.gap") }
        }
        .modifier(MetalCodeShake(trigger: shakes, reduceMotion: reduceMotion))
        .background { if !snapshot { input } }
        .contentShape(Rectangle())
        .onTapGesture { if isEnabled { focused = true } }
        .metalWait(work, into: $wait)
        .opacity(isEnabled ? .one : recipe.scalar("disabled.opacity"))
        .onChange(of: invalid) { _, now in
            guard now else { return }
            shakes += 1
            retype = true
        }
    }

    // MARK: the input

    private var input: some View {
        TextField("", text: Binding(get: { text }, set: { accept($0) }))
            .textFieldStyle(.plain)
            .foregroundStyle(.clear)
            .tint(.clear)
            .textContentType(.oneTimeCode)
            #if os(iOS)
            .keyboardType(kind == .numeric ? .numberPad : .asciiCapable)
            #endif
            .focused($focused)
            .disabled(checking)
            .allowsHitTesting(false)
            .accessibilityLabel(label)
            .accessibilityHint("\(text.count) of \(length) characters")
    }

    /// Keeps what the code can hold: spaces and dashes are dropped, letters capitalised, the rest refused.
    private func accept(_ raw: String) {
        let old = text
        var typed = raw
        // After a wrong code, the next character starts the code over.
        if retype, raw.count > old.count, raw.hasPrefix(old) {
            typed = String(raw.dropFirst(old.count))
        }
        retype = false
        let kept = typed.uppercased().filter { kind.allows($0) }
        let refused = typed.filter { !kind.allows(Character($0.uppercased())) && !$0.isWhitespace && $0 != "-" }
        let next = String(kept.prefix(length))
        if !refused.isEmpty && typed.count == old.count + 1 { refusals += 1 }
        let shared = zip(old, next).prefix { $0 == $1 }.count
        from = shared
        withMetalAnimation(.part, reduceMotion: reduceMotion) { text = next }
        if next.count == length && next != old { onComplete?(next) }
    }

    // MARK: slots

    private func slot(_ i: Int, char: Character?) -> some View {
        let shape = RoundedRectangle(cornerRadius: metric("radius"), style: .continuous)
        let current = active && isEnabled && i == min(text.count, length - 1)
        let step = Double(max(.zero, i - from))
        let arrive = MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation?
            .delay(reduceMotion ? .zero : step * recipe.durationSeconds("key.ripple"))
        return ZStack {
            if let char {
                cap(char)
                    .id(char)
                    .transition(reduceMotion ? .opacity : .scale(scale: recipe.scalar("key.pop")).combined(with: .opacity))
            } else if current {
                RoundedRectangle(cornerRadius: recipe.points("caret.width"))
                    .fill(MetalRecipes.field.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                    .frame(width: recipe.points("caret.width"), height: role.size * caretShare)
            }
        }
        .animation(arrive, value: char)
        .padding(metric("pad"))
        .frame(width: metric("width"), height: metric("height"))
        .background { MetalWell(.field, radius: metric("radius")) { Color.clear } }
        .overlay {
            if invalid {
                shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth)
            }
            if current {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
            }
        }
        .modifier(MetalCodeShake(trigger: current ? refusals : .zero, reduceMotion: reduceMotion))
        .accessibilityHidden(true)
    }

    /// The caret's height as a share of the type size ("0.9em").
    private var caretShare: Double {
        Double((recipe.text("caret.height") ?? "").replacingOccurrences(of: "em", with: "")) ?? .one
    }

    private func cap(_ char: Character) -> some View {
        let shape = RoundedRectangle(cornerRadius: metric("cap-radius"), style: .continuous)
        return Text(mask ? "•" : String(char))
            .font(.metal(role))
            .foregroundColor(colorway.tokens.ink.color)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background { Color.clear.metalObjectRecipe(MetalRecipes.button, part: "compact", in: shape) }
    }

    private var dash: some View {
        let lip = MetalRecipes.label.textShadows("engraved", colorway: MetalRecipeColorway(colorway)).first
        return Capsule()
            .fill(colorway.tokens.ink3.color)
            .frame(width: metric("dash"), height: recipe.points("dash.thickness"))
            .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
            .accessibilityHidden(true)
    }
}

/// One shake on the refusal spring, a nest aside, each time `trigger` changes. Reduce Motion: none.
private struct MetalCodeShake: ViewModifier {
    let trigger: Int
    let reduceMotion: Bool

    func body(content: Content) -> some View {
        content.keyframeAnimator(initialValue: Double.zero, trigger: trigger) { view, nudge in
            view.offset(x: nudge)
        } keyframes: { _ in
            KeyframeTrack {
                LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                               spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
            }
        }
    }
}

/// Resend: a link cap that counts down ("Resend in 0:42", the seconds turning), then sends again.
public struct MetalCodeFieldResend: View {
    let cooldown: Int
    let label: String
    let countingLabel: String
    let onResend: () -> Void

    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var end: Date
    @State private var now = Date()

    public init(cooldown: Int = 30, label: String = "Resend code", countingLabel: String = "Resend in", onResend: @escaping () -> Void) {
        self.cooldown = cooldown
        self.label = label
        self.countingLabel = countingLabel
        self.onResend = onResend
        _end = State(initialValue: Date().addingTimeInterval(TimeInterval(cooldown)))
    }

    private var left: Int { max(.zero, Int(end.timeIntervalSince(now).rounded(.up))) }

    public var body: some View {
        let button = MetalRecipes.button
        let role = button.typeRole("link.font", trackingKey: "link.tracking")
        let counting = left > .zero
        let words = counting ? "\(countingLabel) \(left / 60):\(String(format: "%02d", left % 60))" : label
        Button {
            onResend()
            now = Date()
            end = now.addingTimeInterval(TimeInterval(cooldown))
        } label: {
            Text(words)
                .font(.metal(role)).tracking(role.trackingPoints)
                .foregroundColor(button.color("link.ink")?.color ?? MetalShared.greenDeep.color)
                .contentTransition(reduceMotion ? .opacity : .numericText(countsDown: true))
                .metalAnimation(.settle, value: words)
        }
        .buttonStyle(.plain)
        .disabled(counting)
        .opacity(counting ? MetalRecipes.codeField.scalar("disabled.opacity") : .one)
        // The clock ticks only while counting and while the scene is active; it counts to an end time.
        .task(id: TickKey(end: end, active: scenePhase == .active)) {
            guard scenePhase == .active else { return }
            now = Date()
            while left > .zero, !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                now = Date()
            }
        }
    }

    private struct TickKey: Hashable { let end: Date; let active: Bool }
}
