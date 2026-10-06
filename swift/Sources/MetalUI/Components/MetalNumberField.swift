import SwiftUI
#if os(macOS)
import AppKit
#endif

// Number field: a number you step, scrub or type. Mirrors components/number-field (number-field.agent.md)
// from the number-field, field and well recipes: Field's three sizes, keycaps concentric with the well
// (the set's minus and plus without their tile), the value on the drum, the label (or the inspector's
// letter) as the scrub handle, ⌥ and ⇧ for fine and coarse steps shown on the keycaps, an engraved unit,
// typed arithmetic read back before it commits, soft limits, back to default with the changed mark,
// mixed values and the wheel only while focused. A step past a limit shakes only the digits.

/// The stepper, with keycaps at each end, or the inspector: a letter engraved at the well's start.
public enum MetalNumberFieldKind: Sendable { case stepper, inspector }

/// A number you step, scrub or type.
public struct MetalNumberField: View {
    let label: String
    let letter: String?
    @Binding var value: Double?
    let range: ClosedRange<Double>
    let step: Double
    let smallStep: Double
    let largeStep: Double
    let size: MetalFieldSize
    let kind: MetalNumberFieldKind
    let unit: String?
    let format: FloatingPointFormatStyle<Double>
    let softLimits: Bool
    let defaultValue: Double?
    let mixed: Bool
    let onStep: ((Double) -> Void)?
    let wheel: Bool
    let invalid: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalFormInvalid) private var formInvalid
    @FocusState private var focused: Bool
    @State private var draft: String?
    @State private var hovering = false
    @State private var held: Held?
    @State private var refusals = 0
    @State private var refusalDirection = 1.0
    @State private var scrubbed = 0.0
    @State private var lastLabelTap = Date.distantPast
    #if os(macOS)
    @State private var monitor: Any?
    #endif

    enum Held { case fine, coarse }
    /// Headless captures: a modifier held, or a draft being typed, without a window to hold or type in.
    var previewHeld: Held?
    var previewDraft: String?

    /// - Parameters:
    ///   - value: nil while empty (or while `mixed`).
    ///   - in: the limits. The keys, arrows and scrub stop at them; typing does too unless `softLimits`.
    ///   - smallStep, largeStep: the steps ⌥ and ⇧ take, shown on the keycaps while held.
    ///   - letter: the inspector's engraved handle ("W"); `label` is then the accessible name.
    ///   - unit: engraved after the value ("px", "%", "°"); typing it is understood.
    ///   - softLimits: a typed value past a limit is kept, invalid, with the limit said under the field.
    ///   - default: the value a double-click on the label, or ⌘-click on a keycap, returns to; while off it, the changed mark shows.
    ///   - mixed: a multi-selection whose values differ: "Mixed"; a step calls `onStep` with the signed amount.
    ///   - wheel: the scroll wheel steps the value, only while the field has focus.
    public init(_ label: String, value: Binding<Double?>, in range: ClosedRange<Double>, step: Double = 1,
                smallStep: Double = 0.1, largeStep: Double = 10, size: MetalFieldSize = .regular,
                kind: MetalNumberFieldKind = .stepper, letter: String? = nil, unit: String? = nil,
                format: FloatingPointFormatStyle<Double> = .number, softLimits: Bool = false,
                default defaultValue: Double? = nil, mixed: Bool = false, onStep: ((Double) -> Void)? = nil,
                wheel: Bool = false, invalid: Bool = false) {
        self.label = label
        self._value = value
        self.range = range
        self.step = step
        self.smallStep = smallStep
        self.largeStep = largeStep
        self.size = kind == .inspector && size == .large ? .regular : size
        self.kind = kind
        self.letter = letter
        self.unit = unit
        self.format = format
        self.softLimits = softLimits
        self.defaultValue = defaultValue
        self.mixed = mixed
        self.onStep = onStep
        self.wheel = wheel
        self.invalid = invalid
    }

    /// A whole-number field, as the old Stepper-backed API took.
    public init(_ label: String, value: Binding<Int>, in range: ClosedRange<Int>, step: Int = 1) {
        self.init(label, value: Binding(get: { Double(value.wrappedValue) }, set: { value.wrappedValue = Int(($0 ?? .zero).rounded()) }),
                  in: Double(range.lowerBound)...Double(range.upperBound), step: Double(step), smallStep: Double(step),
                  format: .number.precision(.fractionLength(.zero)))
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.numberField }
    private func metric(_ key: String) -> Double { recipe.points("\(size.rawValue).\(key)") }
    private var role: MetalTypeRole { size == .large ? MetalType.content : size == .regular ? MetalType.lead : MetalType.ui }
    private var inspector: Bool { kind == .inspector }
    private var changed: Bool? { defaultValue.map { !mixed && value != $0 } }

    private func shown(_ n: Double) -> String { n.formatted(format) + (unit.map { " \($0)" } ?? "") }
    private var outside: Bool {
        guard softLimits, draft == nil, let value else { return false }
        return !range.contains(value)
    }
    private var limitSaid: String? {
        guard outside, let value else { return nil }
        return value > range.upperBound ? "Up to \(shown(range.upperBound))" : "At least \(shown(range.lowerBound))"
    }
    private var readback: String? {
        guard let draft = draft ?? previewDraft, MetalNumberDraft.isArithmetic(draft), let n = MetalNumberDraft.read(draft, current: value, unit: unit) else { return nil }
        let kept = softLimits ? n : min(max(n, range.lowerBound), range.upperBound)
        return "= \(shown(n))" + (kept == n ? "" : " · \(n > kept ? "up to" : "at least") \(shown(kept))")
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: .zero) {
            if !inspector { labelView.padding(.bottom, recipe.points("self.gap")) }
            group
            words
        }
        .animation(MetalMotion.resolve(readback == nil ? .release : .settle, reduceMotion: reduceMotion).animation, value: readback == nil)
        .animation(MetalMotion.resolve(limitSaid == nil ? .release : .settle, reduceMotion: reduceMotion).animation, value: limitSaid == nil)
        .onAppear(perform: watchModifiers)
        .onDisappear(perform: unwatchModifiers)
    }

    // MARK: label and scrub

    private var labelView: some View {
        Text(label)
            .font(.metal(MetalType.ui))
            .tracking(MetalType.ui.trackingPoints)
            .foregroundColor(colorway.tokens.ink.color)
            .overlay(alignment: .topLeading) {
                if let changed {
                    MetalChangedMark(changed: changed)
                        .offset(x: -(MetalRecipes.formField.points("changed.gap") + MetalRecipes.formField.points("changed.size")),
                                y: MetalRecipes.formField.points("changed.top"))
                }
            }
            .modifier(scrubHandle)
            .accessibilityHidden(true)
    }

    /// Drag sideways to scrub (two points a step, like Base UI); a double click goes back to default.
    private var scrubHandle: MetalNumberScrub {
        MetalNumberScrub(enabled: isEnabled, onScrub: { dx, modifiers in
            scrubbed += dx
            let steps = (scrubbed / recipe.points("scrub.pixels")).rounded(.towardZero)
            guard steps != .zero else { return }
            scrubbed -= steps * recipe.points("scrub.pixels")
            stepBy(steps * amount(modifiers), refuse: true)
        }, onEnd: { scrubbed = .zero }, onDoubleTap: reset)
    }

    // MARK: the well

    private var group: some View {
        let radius = metric("radius")
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        return HStack(spacing: inspector ? recipe.points("inspector.gap") : .zero) {
            if inspector {
                Text(letter ?? String(label.prefix(1)))
                    .font(.metal(MetalType.ui))
                    .modifier(MetalNumberEngraved())
                    .modifier(scrubHandle)
                    .accessibilityHidden(true)
            } else {
                key(-1)
            }
            window.frame(maxWidth: .infinity, alignment: inspector ? .leading : .center)
            if inspector {
                if let changed { MetalChangedMark(changed: changed).padding(.leading, recipe.points("inspector.mark")) }
            } else {
                key(1)
            }
        }
        .padding(.horizontal, inspector ? recipe.points("inspector.pad") : metric("pad"))
        .padding(.vertical, inspector ? .zero : metric("pad"))
        .frame(width: inspector ? recipe.points("inspector.\(size.rawValue)") : metric("width"), height: metric("height"))
        .background { MetalWell(.field, radius: radius) { Color.clear } }
        .overlay {
            if invalid || formInvalid || outside {
                shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth).allowsHitTesting(false)
            }
            if focused && isEnabled {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth).allowsHitTesting(false)
            }
        }
        .opacity(isEnabled ? .one : recipe.scalar("self.disabled"))
        .onHover { hovering = $0; if !$0 && !focused { held = nil } }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue(mixed ? "Mixed" : value.map(shown) ?? "")
        .accessibilityHint([readback, limitSaid, changed == true ? "off its default" : nil].compactMap { $0 }.joined(separator: ". "))
        .accessibilityAdjustableAction { direction in
            stepBy(direction == .increment ? step : -step, refuse: true)
        }
    }

    /// The value: the drum at rest, a plain text field while typing (a draft that commits on Return or blur).
    private var window: some View {
        HStack(alignment: .firstTextBaseline, spacing: recipe.points("unit.gap")) {
            ZStack {
                if focused {
                    TextField("", text: Binding(get: { draft ?? (value.map { $0.formatted(format) } ?? "") }, set: { draft = $0 }),
                              prompt: mixed ? Text("Mixed").foregroundColor(colorway.tokens.ink3.color) : nil)
                        .textFieldStyle(.plain)
                        .multilineTextAlignment(inspector ? .leading : .center)
                        .fixedSize()
                        .tint(MetalRecipes.field.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                        .onSubmit(commit)
                        .onKeyPress(.escape) { guard draft != nil else { return .ignored }; draft = nil; return .handled }
                        .onKeyPress(.upArrow, phases: .down) { press in arrow(1, press.modifiers) }
                        .onKeyPress(.downArrow, phases: .down) { press in arrow(-1, press.modifiers) }
                } else {
                    Text(previewDraft ?? (mixed ? "Mixed" : value.map { $0.formatted(format) } ?? ""))
                        .foregroundColor((mixed ? colorway.tokens.ink3 : colorway.tokens.ink).color)
                        .contentTransition(reduceMotion ? .opacity : .numericText(value: value ?? .zero))
                        .metalAnimation(.settle, value: value)
                }
            }
            .monospacedDigit()
            .foregroundColor(colorway.tokens.ink.color)
            // A refusal: only the digits, one nest aside, ringing back on the refusal spring.
            .keyframeAnimator(initialValue: Double.zero, trigger: refusals) { content, nudge in
                content.offset(x: nudge * refusalDirection)
            } keyframes: { _ in
                KeyframeTrack {
                    LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                    SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                                   spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
                }
            }
            if let unit, !mixed {
                Text(unit).modifier(MetalNumberEngraved())
            }
        }
        .font(.metal(role))
        .tracking(role.trackingPoints)
        .lineLimit(1)
        .contentShape(Rectangle())
        .onTapGesture { if isEnabled { focused = true } }
        .focused($focused)
        .onChange(of: focused) { _, now in if !now { commit(); if !hovering { held = nil } } }
        .modifier(MetalNumberWheel(enabled: wheel && focused && isEnabled) { delta, modifiers in
            stepBy(delta * amount(modifiers), refuse: true)
        })
    }

    // MARK: keycaps

    private func key(_ direction: Double) -> some View {
        let size = metric("key")
        let legend: String? = {
            guard let held = held ?? previewHeld, isEnabled else { return nil }
            let amount = held == .fine ? smallStep : largeStep
            guard amount != step else { return nil }
            return (direction < .zero ? "−" : "+") + amount.formatted(.number)
        }()
        let atLimit = value.map { direction < .zero ? $0 <= range.lowerBound : $0 >= range.upperBound } ?? false
        return Button {
            #if os(macOS)
            let flags = NSEvent.modifierFlags
            if flags.contains(.command) { reset(); return }
            stepBy(direction * amount(EventModifiers(flags)), refuse: false)
            #else
            stepBy(direction * step, refuse: false)
            #endif
        } label: {
            ZStack {
                if let legend {
                    Text(legend)
                        .font(.metal(self.size == .large ? MetalType.readout : MetalType.tick))
                        .fixedSize()
                        .transition(.push(from: .bottom).combined(with: .opacity))
                } else {
                    MetalNumberGlyph(icon: direction < .zero ? .minus : .plus, size: metric("glyph"))
                        .transition(.push(from: .bottom).combined(with: .opacity))
                }
            }
            .metalAnimation(.settle, value: legend)
        }
        .buttonStyle(MetalNumberKeyStyle(size: size, radius: metric("key-radius")))
        .buttonRepeatBehavior(.enabled)
        .disabled(atLimit && !mixed)
        .focusEffectDisabled()
        .accessibilityLabel(direction < .zero ? "Decrease" : "Increase")
    }

    // MARK: changes

    private func amount(_ modifiers: EventModifiers) -> Double {
        modifiers.contains(.option) ? smallStep : modifiers.contains(.shift) ? largeStep : step
    }

    private func arrow(_ direction: Double, _ modifiers: EventModifiers) -> KeyPress.Result {
        commit()
        stepBy(direction * amount(modifiers), refuse: true)
        return .handled
    }

    /// A step (keys, arrows, scrub, wheel): mixed hands the amount to the host; otherwise it clamps, refusing past a limit.
    private func stepBy(_ delta: Double, refuse: Bool) {
        guard isEnabled, delta != .zero else { return }
        if mixed { onStep?(delta); return }
        let from = value ?? min(max(.zero, range.lowerBound), range.upperBound)
        let next = min(max(from + delta, range.lowerBound), range.upperBound)
        if next == value {
            guard refuse, MetalMotion.resolve(.refusal, reduceMotion: reduceMotion).allowsTravel else { return }
            refusalDirection = delta > .zero ? .one : -.one
            refusals += 1
            return
        }
        value = next
    }

    /// Commits the draft: what it means, or a refusal when it means nothing.
    private func commit() {
        guard let text = draft else { return }
        draft = nil
        if text.trimmingCharacters(in: .whitespaces).isEmpty { value = nil; return }
        guard let n = MetalNumberDraft.read(text, current: value, unit: unit) else {
            guard MetalMotion.resolve(.refusal, reduceMotion: reduceMotion).allowsTravel else { return }
            refusalDirection = .one
            refusals += 1
            return
        }
        value = softLimits ? n : min(max(n, range.lowerBound), range.upperBound)
    }

    private func reset() {
        guard let defaultValue, isEnabled else { return }
        draft = nil
        value = defaultValue
    }

    // MARK: words under the well

    @ViewBuilder private var words: some View {
        if let readback {
            Text(readback)
                .font(.metal(MetalType.readout))
                .tracking(MetalType.readout.trackingPoints)
                .monospacedDigit()
                .foregroundColor(colorway.tokens.ink2.color)
                .contentTransition(reduceMotion ? .opacity : .numericText())
                .padding(.top, recipe.points("self.gap"))
                .transition(.opacity)
        }
        if let limitSaid {
            Text(limitSaid)
                .font(.metal(MetalType.meta))
                .foregroundColor(MetalRecipes.formField.color("error.ink", colorway: MetalRecipeColorway(colorway))?.color ?? MetalShared.red.color)
                .padding(.top, recipe.points("self.gap"))
                .transition(.opacity)
        }
    }

    // MARK: modifiers held

    private func watchModifiers() {
        #if os(macOS)
        guard monitor == nil else { return }
        monitor = NSEvent.addLocalMonitorForEvents(matching: .flagsChanged) { event in
            let live = (hovering || focused) && !inspector
            held = !live ? nil : event.modifierFlags.contains(.option) ? .fine : event.modifierFlags.contains(.shift) ? .coarse : nil
            return event
        }
        #endif
    }

    /// For headless captures: show the legends for a held modifier, or a draft and its readback.
    func preview(held: Held? = nil, draft: String? = nil) -> Self {
        var copy = self
        copy.previewHeld = held
        copy.previewDraft = draft
        return copy
    }

    private func unwatchModifiers() {
        #if os(macOS)
        if let monitor { NSEvent.removeMonitor(monitor) }
        monitor = nil
        #endif
    }
}

#if os(macOS)
private extension EventModifiers {
    init(_ flags: NSEvent.ModifierFlags) {
        self = []
        if flags.contains(.option) { insert(.option) }
        if flags.contains(.shift) { insert(.shift) }
        if flags.contains(.command) { insert(.command) }
    }
}
#endif

/// Ink3 with the engraved lip: the unit and the inspector's letter.
private struct MetalNumberEngraved: ViewModifier {
    @Environment(\.metalColorway) private var colorway

    func body(content: Content) -> some View {
        let lip = MetalRecipes.label.textShadows("engraved", colorway: MetalRecipeColorway(colorway)).first
        content
            .foregroundColor(colorway.tokens.ink3.color)
            .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
            .fixedSize()
    }
}

/// The set's plus or minus without its tile (the keycap is the tile); it plays its act on each press.
private struct MetalNumberGlyph: View {
    let icon: MetalIconName
    let size: Double
    @Environment(\.metalIconInteraction) private var interaction
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var start: Date?

    var body: some View {
        if let act = MetalIconAct.all[icon] {
            MetalIconActView(act: act.without(part: "tile"), box: size,
                             lineUnits: MetalIconMetrics.strokeUnits(for: .regular, regular: icon.smallStrokeUnits),
                             duoK: .zero, start: start)
                .frame(width: size, height: size)
                .onChange(of: interaction?.isPressed ?? false) { _, pressed in
                    if pressed && !reduceMotion && start == nil { start = Date() }
                }
                .task(id: start) {
                    guard start != nil else { return }
                    try? await Task.sleep(for: .seconds(act.duration))
                    if !Task.isCancelled { start = nil }
                }
                .accessibilityHidden(true)
        } else {
            MetalIcon(icon, size: size)
        }
    }
}

private extension MetalIconAct {
    /// The act with one part's ink left out (its motion stays, so the other parts still ride it).
    func without(part name: String) -> MetalIconAct {
        guard let index = parts.firstIndex(where: { $0.name == name }) else { return self }
        return MetalIconAct(duration: duration, caption: caption, parts: parts, ink: ink.filter { !$0.parts.contains(index) })
    }
}

/// A keycap: a compact cap, square with the well's radius less its pad, sinking while held.
private struct MetalNumberKeyStyle: ButtonStyle {
    let size: Double
    let radius: Double
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @State private var hovering = false

    func makeBody(configuration: Configuration) -> some View {
        let button = MetalRecipes.button
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        let down = configuration.isPressed && isEnabled
        return configuration.label
            .metalIconInteraction(MetalIconInteraction(isHovered: hovering && isEnabled, isPressed: down))
            .foregroundColor((hovering && isEnabled ? colorway.tokens.ink : colorway.tokens.ink2).color)
            .frame(width: size, height: size)
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(button, part: "compact", in: shape).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(button, part: "compact", state: "pressed", in: shape).opacity(down ? .one : .zero)
                }
            }
            .offset(y: down ? button.points("self.travel") : .zero)
            .metalAnimation(.release, value: down)
            .contentShape(shape)
            .onHover { hovering = $0 }
            .opacity(isEnabled ? .one : button.scalar("self.disabled"))
    }
}

/// The scrub: a horizontal drag reports its movement; a double click (or tap) goes back to default.
private struct MetalNumberScrub: ViewModifier {
    let enabled: Bool
    let onScrub: (Double, EventModifiers) -> Void
    let onEnd: () -> Void
    let onDoubleTap: () -> Void
    @State private var last: Double?

    func body(content: Content) -> some View {
        content
            .contentShape(Rectangle())
            #if os(macOS)
            .onHover { inside in
                guard enabled else { return }
                if inside { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
            }
            #endif
            .gesture(DragGesture(minimumDistance: 1)
                .onChanged { drag in
                    guard enabled else { return }
                    let x = drag.translation.width
                    #if os(macOS)
                    onScrub(x - (last ?? .zero), EventModifiers(NSEvent.modifierFlags))
                    #else
                    onScrub(x - (last ?? .zero), [])
                    #endif
                    last = x
                }
                .onEnded { _ in last = nil; onEnd() })
            .onTapGesture(count: 2) { if enabled { onDoubleTap() } }
    }
}

/// The scroll wheel, only when asked and only while the field has focus (macOS).
private struct MetalNumberWheel: ViewModifier {
    let enabled: Bool
    let onStep: (Double, EventModifiers) -> Void
    #if os(macOS)
    @State private var monitor: Any?
    @State private var inside = false
    #endif

    func body(content: Content) -> some View {
        #if os(macOS)
        content
            .onHover { inside = $0 }
            .onChange(of: enabled, initial: true) { _, on in
                if let monitor { NSEvent.removeMonitor(monitor) }
                monitor = nil
                guard on else { return }
                monitor = NSEvent.addLocalMonitorForEvents(matching: .scrollWheel) { event in
                    guard inside, event.scrollingDeltaY != .zero else { return event }
                    onStep(event.scrollingDeltaY > .zero ? .one : -.one, EventModifiers(event.modifierFlags))
                    return nil
                }
            }
            .onDisappear { if let monitor { NSEvent.removeMonitor(monitor) }; monitor = nil }
        #else
        content
        #endif
    }
}

/// What a typed draft means: a number, the number with its unit ("12px"), or arithmetic. A leading + * /
/// works on the current value (+10, *2); =8*12 (or 8*12) is a new one. nil when it isn't understood.
enum MetalNumberDraft {
    static func isArithmetic(_ text: String) -> Bool {
        text.range(of: #"[*/×÷=()]|^\s*\+|\d\s*[-−+]\s*[\d(]"#, options: .regularExpression) != nil
    }

    static func read(_ text: String, current: Double?, unit: String?) -> Double? {
        var s = text
        if let unit { s = s.replacingOccurrences(of: unit, with: "", options: .caseInsensitive) }
        if let group = Locale.current.groupingSeparator { s = s.replacingOccurrences(of: group, with: "") }
        if let decimal = Locale.current.decimalSeparator, decimal != "." { s = s.replacingOccurrences(of: decimal, with: ".") }
        s = s.replacingOccurrences(of: "×", with: "*").replacingOccurrences(of: "x", with: "*")
            .replacingOccurrences(of: "÷", with: "/").replacingOccurrences(of: "−", with: "-")
            .filter { !$0.isWhitespace }
        guard !s.isEmpty else { return nil }
        var relative: Character?
        if s.hasPrefix("=") { s.removeFirst() } else if let first = s.first, "+*/".contains(first) { relative = first; s.removeFirst() }
        var parser = Parser(Array(s))
        guard let n = parser.expression(), parser.done else { return nil }
        let here = current ?? .zero
        let out: Double
        switch relative {
        case "+": out = here + n
        case "*": out = here * n
        case "/": out = here / n
        default: out = n
        }
        return out.isFinite ? out : nil
    }

    /// + − × ÷ and brackets over plain numbers.
    private struct Parser {
        let chars: [Character]
        var i = 0
        init(_ chars: [Character]) { self.chars = chars }
        var done: Bool { i == chars.count }
        private var peek: Character? { i < chars.count ? chars[i] : nil }

        mutating func expression() -> Double? {
            guard var v = term() else { return nil }
            while let op = peek, op == "+" || op == "-" {
                i += 1
                guard let r = term() else { return nil }
                v = op == "+" ? v + r : v - r
            }
            return v
        }

        mutating func term() -> Double? {
            guard var v = factor() else { return nil }
            while let op = peek, op == "*" || op == "/" {
                i += 1
                guard let r = factor() else { return nil }
                v = op == "*" ? v * r : v / r
            }
            return v
        }

        mutating func factor() -> Double? {
            guard let c = peek else { return nil }
            if c == "-" || c == "+" { i += 1; return factor().map { c == "-" ? -$0 : $0 } }
            if c == "(" {
                i += 1
                guard let v = expression(), peek == ")" else { return nil }
                i += 1
                return v
            }
            let start = i
            while let d = peek, d.isNumber || d == "." { i += 1 }
            return Double(String(chars[start..<i]))
        }
    }
}
