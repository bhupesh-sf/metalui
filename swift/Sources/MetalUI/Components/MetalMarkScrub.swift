import SwiftUI
#if os(macOS)
import AppKit
#endif

// Mark scrub, in step with mark-scrub.tsx and the mark-scrub recipe (mark-scrub.agent.md).
//
// A recognised number, duration or time of day you change in place. At rest it is the MetalCueMark
// exactly. Drag up or down on the words: one detent per scrub.pixels, ⇧ the large step, ⌥ the small,
// read at each detent. Each detent rewrites the words (only the part that carries the value), turns the
// digits on the drum (numericText, down when lowering), moves the engraved scale one tick with the hand
// and plays the level-change haptic on a trackpad. While dragging, the words hold the widest width of the
// gesture; the scale (the mark's groove ink and lip, a tick a detent, a full one every five, a centre
// index) shows only then, on the settle spring. Release commits once (onCommit: the host's undo step).
// Keys when focused: ↑ ↓ (⇧ ⌥), Page Up / Down, Home / End; VoiceOver's adjustable action steps.
// A push past a limit shakes the words once (refusal). Reduce Motion: a crossfade, no shake.

/// How a cue's words carry its value.
public enum MetalMarkScrubScale: Sendable {
    /// The first number in the words.
    case number
    /// Minutes: "1h30", "45 min". Never below 0.
    case duration
    /// Minutes after midnight: "4pm", "16:00". Wraps.
    case clock

    var key: String {
        switch self {
        case .number: "number"
        case .duration: "duration"
        case .clock: "clock"
        }
    }
}

/// The value a scale reads in the words, and how to write another value back into the same words.
public struct MetalMarkScrubReading {
    public let value: Double
    public let write: (Double) -> String
}

private let metalDayMinutes = 1440

private func metalPad2(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }

/// The fewest decimal places that write `v` exactly (to ten places).
private func metalPlaces(_ v: Double) -> Int {
    let s = String(format: "%.10f", v).replacingOccurrences(of: #"0+$"#, with: "", options: .regularExpression)
    return s.split(separator: ".", omittingEmptySubsequences: false).dropFirst().first.map(\.count) ?? .zero
}

/// Reads the value in `words` on `scale`, as the web's `markScrubRead` does; nil when the words carry none.
public func metalMarkScrubRead(_ words: String, scale: MetalMarkScrubScale = .number) -> MetalMarkScrubReading? {
    let pattern = switch scale {
    case .number: #"-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?"#
    case .duration: #"(\d+)\s*h(?:\s*(\d{1,2})\s*(?:min|m)?)?(?![a-z])|(\d+)(\s*)(min|m)\b"#
    case .clock: #"(\d{1,2})(?::(\d{2}))?(\s?)(am|pm)\b|(\d{1,2}):(\d{2})"#
    }
    guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
          let m = re.firstMatch(in: words, range: NSRange(words.startIndex..., in: words)),
          let whole = Range(m.range, in: words) else { return nil }
    let g: [String?] = (0..<m.numberOfRanges).map { i in Range(m.range(at: i), in: words).map { String(words[$0]) } }
    let put = { (next: String) in words.replacingCharacters(in: whole, with: next) }

    switch scale {
    case .number:
        let raw = g[0] ?? ""
        let grouped = raw.contains(",")
        // Fixed places when the words show them ("$40.00"); otherwise as few as the value needs.
        let kept = raw.contains(".") && raw.hasSuffix("0") ? (raw.split(separator: ".").last?.count ?? .zero) : .zero
        return MetalMarkScrubReading(value: Double(raw.replacingOccurrences(of: ",", with: "")) ?? .zero) { v in
            let f = NumberFormatter()
            f.locale = Locale(identifier: "en_US")
            f.numberStyle = .decimal
            f.usesGroupingSeparator = grouped
            f.minimumFractionDigits = max(kept, metalPlaces(v))
            f.maximumFractionDigits = f.minimumFractionDigits
            return put(f.string(from: NSNumber(value: v)) ?? raw)
        }
    case .duration:
        if let minutes = g[3] {
            return MetalMarkScrubReading(value: Double(minutes) ?? .zero) { v in put("\(Int(v))\(g[4] ?? "")\(g[5] ?? "")") }
        }
        let value = (Double(g[1] ?? "") ?? .zero) * 60 + (Double(g[2] ?? "") ?? .zero)
        return MetalMarkScrubReading(value: value) { v in
            let h = Int(v) / 60, r = Int(v) % 60
            return put(h > .zero ? "\(h)h\(r > .zero ? metalPad2(r) : "")" : "\(r)min")
        }
    case .clock:
        let twelve = g[4] != nil
        let value: Int = twelve
            ? ((Int(g[1] ?? "") ?? .zero) % 12 + ((g[4] ?? "").lowercased() == "pm" ? 12 : .zero)) * 60 + (Int(g[2] ?? "") ?? .zero)
            : (Int(g[5] ?? "") ?? .zero) * 60 + (Int(g[6] ?? "") ?? .zero)
        return MetalMarkScrubReading(value: Double(value)) { v in
            let at = ((Int(v) % metalDayMinutes) + metalDayMinutes) % metalDayMinutes
            let h = at / 60, minute = at % 60
            guard twelve, let ampm = g[4] else { return put("\((g[5] ?? "").count == 2 ? metalPad2(h) : "\(h)"):\(metalPad2(minute))") }
            let ap = h < 12 ? "am" : "pm"
            let mm = minute > .zero || g[2] != nil ? ":\(metalPad2(minute))" : ""
            return put("\(h % 12 == .zero ? 12 : h % 12)\(mm)\(g[3] ?? "")\(ampm == ampm.uppercased() ? ap.uppercased() : ap)")
        }
    }
}

/// A recognised number, duration or time you drag or step in place. The words are the value: bind them.
public struct MetalMarkScrub: View {
    @Binding var words: String
    let kind: MetalCueKind
    let scale: MetalMarkScrubScale
    let label: String?
    let resolved: String?
    let glyph: MetalCueGlyph
    let step: Double?
    let smallStep: Double?
    let largeStep: Double?
    let range: ClosedRange<Double>?
    let onCommit: ((String) -> Void)?

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool
    @State private var scrub: Scrub?
    @State private var moved = 0
    @State private var width: CGFloat = .zero
    @State private var hold: CGFloat?
    @State private var down = false
    @State private var refusals = 0
    @State private var refusalDirection = 1.0

    private struct Scrub {
        let from: String
        let write: (Double) -> String
        var value: Double
        var last: Double = .zero
        var acc: Double = .zero
        var pinned = false
    }

    /// - Parameters:
    ///   - words: the words as written ("6h", "tomorrow 4pm"); rewritten in place on every change.
    ///   - scale: how the words carry the value.
    ///   - step, smallStep, largeStep: a detent's step and the ⌥ and ⇧ steps; the recipe's per scale by default.
    ///   - range: limits for a number or a duration (a duration never goes below 0; a clock wraps).
    ///   - onCommit: once per gesture or key press, with the new words: the host's one undo step.
    public init(_ words: Binding<String>, kind: MetalCueKind, scale: MetalMarkScrubScale = .number, label: String? = nil,
                resolved: String? = nil, glyph: MetalCueGlyph = .kind, step: Double? = nil, smallStep: Double? = nil,
                largeStep: Double? = nil, in range: ClosedRange<Double>? = nil, onCommit: ((String) -> Void)? = nil) {
        _words = words
        self.kind = kind
        self.scale = scale
        self.label = label
        self.resolved = resolved
        self.glyph = glyph
        self.step = step
        self.smallStep = smallStep
        self.largeStep = largeStep
        self.range = range
        self.onCommit = onCommit
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.markScrub }
    private var name: String { label ?? (scale == .clock ? "Time" : scale == .duration ? "Duration" : "Number") }
    private var lower: Double? { scale == .clock ? nil : scale == .duration ? (range?.lowerBound ?? .zero) : range?.lowerBound }
    private var upper: Double? { scale == .clock ? nil : range?.upperBound }

    private func amount(_ modifiers: EventModifiers) -> Double {
        modifiers.contains(.shift) ? (largeStep ?? recipe.scalar("\(scale.key).large"))
            : modifiers.contains(.option) ? (smallStep ?? recipe.scalar("\(scale.key).small"))
            : (step ?? recipe.scalar("\(scale.key).step"))
    }

    private func move(_ from: Double, by delta: Double) -> Double {
        let next = (from + delta).rounded(toPlaces: 10)
        if scale == .clock { return next }
        return min(upper ?? .infinity, max(lower ?? -.infinity, next))
    }

    private func refuse(_ direction: Double) {
        guard MetalMotion.resolve(.refusal, reduceMotion: reduceMotion).allowsTravel else { return }
        refusalDirection = direction
        refusals += 1
    }

    private func show(_ next: String, lowering: Bool) {
        withMetalAnimation(.settle, reduceMotion: reduceMotion) {
            down = lowering
            words = next
        }
    }

    // MARK: drag

    private func pull(_ translation: CGFloat, _ modifiers: EventModifiers) {
        if scrub == nil {
            guard let reading = metalMarkScrubRead(words, scale: scale) else { return }
            scrub = Scrub(from: words, write: reading.write, value: reading.value)
            hold = width
            moved = .zero
            focused = true
        }
        guard var s = scrub else { return }
        let up = -translation
        s.acc += up - s.last
        s.last = up
        let px = recipe.points("scrub.pixels")
        let n = (s.acc / px).rounded(.towardZero)
        if n != .zero {
            s.acc -= n * px
            let next = move(s.value, by: n * amount(modifiers))
            if next == s.value {
                if !s.pinned { refuse(n > .zero ? .one : -.one) }
                s.pinned = true
            } else {
                s.pinned = false
                s.value = next
                moved += Int(n)
                show(s.write(next), lowering: n < .zero)
                #if os(macOS)
                NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .now)
                #endif
            }
        }
        scrub = s
    }

    private func release() {
        if let s = scrub, words != s.from { onCommit?(words) }
        scrub = nil
        hold = nil
    }

    // MARK: keys

    private func stepOnce(_ delta: Double) {
        guard let reading = metalMarkScrubRead(words, scale: scale) else { return }
        let next = move(reading.value, by: delta)
        guard next != reading.value else { refuse(delta > .zero ? .one : -.one); return }
        show(reading.write(next), lowering: delta < .zero)
        onCommit?(words)
    }

    private func key(_ press: KeyPress) -> KeyPress.Result {
        guard let reading = metalMarkScrubRead(words, scale: scale) else { return .ignored }
        switch press.key {
        case .upArrow: stepOnce(amount(press.modifiers))
        case .downArrow: stepOnce(-amount(press.modifiers))
        case .pageUp: stepOnce(largeStep ?? recipe.scalar("\(scale.key).large"))
        case .pageDown: stepOnce(-(largeStep ?? recipe.scalar("\(scale.key).large")))
        case .home: if let lower { stepOnce(lower - reading.value) } else { return .ignored }
        case .end: if let upper { stepOnce(upper - reading.value) } else { return .ignored }
        default: return .ignored
        }
        return .handled
    }

    public var body: some View {
        MetalCueMark(words, kind: kind, resolved: resolved, label: label, glyph: glyph)
            .contentTransition(reduceMotion ? .opacity : .numericText(countsDown: down))
            // A refusal: only the words, one nest aside, ringing back on the refusal spring.
            .keyframeAnimator(initialValue: Double.zero, trigger: refusals) { content, nudge in
                content.offset(x: nudge * refusalDirection)
            } keyframes: { _ in
                KeyframeTrack {
                    LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                    SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                                   spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
                }
            }
            .background(GeometryReader { proxy in
                Color.clear.onChange(of: proxy.size.width, initial: true) { _, w in
                    width = w
                    if scrub != nil { hold = max(hold ?? .zero, w) }
                }
            })
            .frame(minWidth: hold, alignment: .leading)
            .overlay(alignment: .leading) {
                MetalMarkScrubRuler(moved: moved)
                    .offset(x: (hold ?? width) + recipe.points("scale.gap"))
                    .opacity(scrub != nil ? .one : .zero)
                    .metalAnimation(.settle, value: scrub != nil)
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
            .contentShape(Rectangle())
            #if os(macOS)
            .onHover { inside in if inside { NSCursor.resizeUpDown.push() } else { NSCursor.pop() } }
            #endif
            .gesture(DragGesture(minimumDistance: .zero)
                .onChanged { drag in
                    #if os(macOS)
                    pull(drag.translation.height, metalScrubModifiers(NSEvent.modifierFlags))
                    #else
                    pull(drag.translation.height, [])
                    #endif
                }
                .onEnded { _ in release() })
            .focusable()
            .focused($focused)
            .onKeyPress(phases: .down) { key($0) }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(name)
            .accessibilityValue(words)
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment: stepOnce(amount([]))
                case .decrement: stepOnce(-amount([]))
                @unknown default: break
                }
            }
    }
}

#if os(macOS)
private func metalScrubModifiers(_ flags: NSEvent.ModifierFlags) -> EventModifiers {
    var m: EventModifiers = []
    if flags.contains(.option) { m.insert(.option) }
    if flags.contains(.shift) { m.insert(.shift) }
    return m
}
#endif

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let f = pow(10, Double(places))
        return (self * f).rounded() / f
    }
}

/// The engraved scale beside the words while dragging: a tick a detent (scale.minor of the width), a
/// full tick every five, the mark's groove ink with its lip under each, and a centre index in ink,
/// faded at both ends. It moves one tick per detent with the hand.
private struct MetalMarkScrubRuler: View {
    let moved: Int
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let r = MetalRecipes.markScrub, mark = MetalRecipes.mark, cw = MetalRecipeColorway(colorway)
        let tick = r.points("scale.tick"), w = r.points("scale.width"), h = r.points("scale.height")
        let minor = (Double((r.text("scale.minor") ?? "").replacingOccurrences(of: "%", with: "")) ?? 100) / 100
        let index = r.points("scale.index")
        let ink = (mark.color("groove.ink", colorway: cw) ?? colorway.tokens.ink3).color
        let lip = (mark.color("groove.lip", colorway: cw) ?? colorway.tokens.ink3).color
        let hair = mark.points("groove.thickness")
        let indexInk = colorway.tokens.ink.color
        let shift = Double(moved % 5) * tick
        Canvas { ctx, size in
            let reach = Int((size.height / 2 / tick).rounded(.up)) + 5
            for j in -reach...reach {
                let y = size.height / 2 + Double(j) * tick - shift
                let major = j % 5 == .zero
                let x = major ? .zero : size.width * (1 - minor)
                ctx.fill(Path(CGRect(x: x, y: y, width: size.width - x, height: hair)), with: .color(ink))
                ctx.fill(Path(CGRect(x: x, y: y + hair, width: size.width - x, height: hair)), with: .color(lip))
            }
            ctx.fill(Path(CGRect(x: .zero, y: (size.height - index) / 2, width: size.width, height: index)), with: .color(indexInk))
        }
        .frame(width: w, height: h)
        .mask(LinearGradient(stops: [.init(color: .clear, location: .zero), .init(color: .black, location: 0.25),
                                     .init(color: .black, location: 0.75), .init(color: .clear, location: 1)],
                             startPoint: .top, endPoint: .bottom))
    }
}
