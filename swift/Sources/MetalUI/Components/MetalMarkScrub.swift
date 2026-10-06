import SwiftUI
#if os(macOS)
import AppKit
#endif

// Mark scrub, in step with mark-scrub.tsx and the mark-scrub recipe (mark-scrub.agent.md).
//
// A recognised value you change in place: a number, a duration, a time of day, a day, a state or a
// colour. At rest it is the MetalCueMark (a tag: the MetalCueTag) exactly. Drag up or down on the words:
// one detent per <scale>.pixels (else scrub.pixels), ⇧ the large step, ⌥ the small, read at each detent.
// Each detent rewrites the words (only the part that carries the value), turns the digits on the drum
// (numericText, down when lowering), moves the engraved scale one tick with the hand and plays the
// level-change haptic on a trackpad. A duration says itself in its other unit on U or a sideways drag of
// unit.pixels. An enum shows its neighbouring states above and below while held instead of the scale. A
// press held for press.hold with no detent (or Return) opens the host's picker in a popover from the
// words. Hover thickens the line (hover.line); the first hover says the hint in the chip, once.
// While dragging, the words hold the widest width of the gesture. Release commits once (onCommit: the
// host's undo step). Keys when focused: ↑ ↓ (⇧ ⌥), Page Up / Down, Home / End, Space (enum), U, Return;
// VoiceOver's adjustable action steps. A push past a limit shakes the words once (refusal).
// Reduce Motion: a crossfade, no shake.

/// How a cue's words carry its value.
public enum MetalMarkScrubScale: Sendable, Equatable {
    /// The first number in the words.
    case number
    /// Minutes: "1h30", "45 min". Never below 0; U says it in its other unit.
    case duration
    /// Minutes after midnight: "4pm", "16:00". Wraps.
    case clock
    /// Days from today: "yesterday", "tomorrow", "Friday", "next Friday", "Fri 16 Oct".
    case day
    /// An index into these states, in order ("todo", "doing", "done", "dropped"). Wraps.
    case options([String])
    /// A hex's place on the colour wheel, in degrees; saturation and lightness kept. Wraps.
    case hue

    var key: String {
        switch self {
        case .number: "number"
        case .duration: "duration"
        case .clock: "clock"
        case .day: "day"
        case .options: "enum"
        case .hue: "hue"
        }
    }

    var name: String {
        switch self {
        case .number: "Number"
        case .duration: "Duration"
        case .clock: "Time"
        case .day: "Day"
        case .options: "State"
        case .hue: "Colour"
        }
    }
}

/// The value a scale reads in the words, and how to write another value back into the same words.
public struct MetalMarkScrubReading {
    public let value: Double
    public let write: (Double) -> String
    /// The scale goes round (a clock's 1440 minutes, a hue's 360 degrees, the states).
    public var wrap: Double? = nil
    /// The same amount in its other unit ("90 min" ↔ "1h30"), when the scale has one.
    public var cycle: (() -> String)? = nil
}

/// What a picker gets: the value now, its words, and a way to choose another (written as words, one commit).
public struct MetalMarkScrubPick {
    public let value: Double
    public let words: String
    public let choose: (Double) -> Void
}

private let metalDayMinutes = 1440
private let metalWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
private let metalMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
private let metalRelative = ["yesterday", "today", "tomorrow"]

private func metalPad2(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }
private func metalCap(_ s: String) -> String { s.prefix(1).uppercased() + s.dropFirst() }

/// The fewest decimal places that write `v` exactly (to ten places).
private func metalPlaces(_ v: Double) -> Int {
    let s = String(format: "%.10f", v).replacingOccurrences(of: #"0+$"#, with: "", options: .regularExpression)
    return s.split(separator: ".", omittingEmptySubsequences: false).dropFirst().first.map(\.count) ?? .zero
}

/// Reads the value in `words` on `scale`, as the web's `markScrubRead` does; nil when the words carry none.
public func metalMarkScrubRead(_ words: String, scale: MetalMarkScrubScale = .number, today: Date = Date()) -> MetalMarkScrubReading? {
    let pattern: String
    switch scale {
    case .number: pattern = #"-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?"#
    case .duration: pattern = #"(\d+)\s*h(?:\s*(\d{1,2})\s*(?:min|m)?)?(?![a-z])|(\d+)(\s*)(min|m)\b"#
    case .clock: pattern = #"(\d{1,2})(?::(\d{2}))?(\s?)(am|pm)\b|(\d{1,2}):(\d{2})"#
    case .day: pattern = #"\b(yesterday|today|tomorrow)\b|\b(next\s+)?(sun|mon|tues|wednes|thurs|fri|satur)day\b|\b(?:(?:sun|mon|tue|wed|thu|fri|sat)\s+)?(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b"#
    case .options(let options):
        guard !options.isEmpty else { return nil }
        let alternatives = options.sorted { $0.count > $1.count }.map(NSRegularExpression.escapedPattern(for:)).joined(separator: "|")
        pattern = #"(?<![\w-])(?:"# + alternatives + #")(?![\w-])"#
    case .hue: pattern = #"#([0-9a-f]{6}|[0-9a-f]{3})\b"#
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
        return MetalMarkScrubReading(value: Double(raw.replacingOccurrences(of: ",", with: "")) ?? .zero, write: { v in
            let f = NumberFormatter()
            f.locale = Locale(identifier: "en_US")
            f.numberStyle = .decimal
            f.usesGroupingSeparator = grouped
            f.minimumFractionDigits = max(kept, metalPlaces(v))
            f.maximumFractionDigits = f.minimumFractionDigits
            return put(f.string(from: NSNumber(value: v)) ?? raw)
        })
    case .duration:
        let hours = { (v: Int) in "\(v / 60)h\(v % 60 > .zero ? metalPad2(v % 60) : "")" }
        if let minutes = g[3] {
            let value = Int(minutes) ?? .zero
            return MetalMarkScrubReading(value: Double(value), write: { v in put("\(Int(v))\(g[4] ?? "")\(g[5] ?? "")") },
                                         cycle: { put(hours(value)) })
        }
        let value = (Int(g[1] ?? "") ?? .zero) * 60 + (Int(g[2] ?? "") ?? .zero)
        return MetalMarkScrubReading(value: Double(value), write: { v in
            Int(v) >= 60 ? put(hours(Int(v))) : put("\(Int(v))min")
        }, cycle: { put("\(value) min") })
    case .clock:
        let twelve = g[4] != nil
        let value: Int = twelve
            ? ((Int(g[1] ?? "") ?? .zero) % 12 + ((g[4] ?? "").lowercased() == "pm" ? 12 : .zero)) * 60 + (Int(g[2] ?? "") ?? .zero)
            : (Int(g[5] ?? "") ?? .zero) * 60 + (Int(g[6] ?? "") ?? .zero)
        return MetalMarkScrubReading(value: Double(value), write: { v in
            let at = ((Int(v) % metalDayMinutes) + metalDayMinutes) % metalDayMinutes
            let h = at / 60, minute = at % 60
            guard twelve, let ampm = g[4] else { return put("\((g[5] ?? "").count == 2 ? metalPad2(h) : "\(h)"):\(metalPad2(minute))") }
            let ap = h < 12 ? "am" : "pm"
            let mm = minute > .zero || g[2] != nil ? ":\(metalPad2(minute))" : ""
            return put("\(h % 12 == .zero ? 12 : h % 12)\(mm)\(g[3] ?? "")\(ampm == ampm.uppercased() ? ap.uppercased() : ap)")
        }, wrap: Double(metalDayMinutes))
    case .day:
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = .current
        let base = cal.startOfDay(for: today)
        let days = { (d: Date) in cal.dateComponents([.day], from: base, to: cal.startOfDay(for: d)).day ?? .zero }
        let value: Int
        if let rel = g[1] {
            value = (metalRelative.firstIndex(of: rel.lowercased()) ?? 1) - 1
        } else if let stem = g[3] {
            let want = metalWeek.firstIndex { $0.hasPrefix(stem.lowercased()) } ?? .zero
            let ahead = (want - (cal.component(.weekday, from: base) - 1) + 7) % 7
            value = g[2] != nil ? ahead + 7 : (ahead == .zero ? 7 : ahead)
        } else {
            // "Fri 16 Oct": the year that puts it nearest today.
            let month = (metalMonths.firstIndex(of: (g[5] ?? "").lowercased()) ?? .zero) + 1
            let year = cal.component(.year, from: base)
            value = [-1, 0, 1].compactMap { y in cal.date(from: DateComponents(year: year + y, month: month, day: Int(g[4] ?? "") ?? 1)).map(days) }
                .min { abs($0) < abs($1) } ?? .zero
        }
        // "Tomorrow" and "Next Friday" keep their capital; a weekday or a date can't say, so words go lower case.
        let upper = (g[1] ?? g[2] ?? "").first?.isUppercase ?? false
        return MetalMarkScrubReading(value: Double(value), write: { v in
            let n = Int(v)
            let d = cal.date(byAdding: .day, value: n, to: base) ?? base
            let weekday = metalCap(metalWeek[cal.component(.weekday, from: d) - 1])
            switch n {
            case -1...1: return put(upper ? metalCap(metalRelative[n + 1]) : metalRelative[n + 1])
            case 2...6: return put(weekday)
            case 7...13: return put("\(upper ? "Next" : "next") \(weekday)")
            default: return put("\(weekday.prefix(3)) \(cal.component(.day, from: d)) \(metalCap(metalMonths[cal.component(.month, from: d) - 1]))")
            }
        })
    case .options(let options):
        let found = g[0] ?? ""
        let n = options.count
        return MetalMarkScrubReading(value: Double(options.firstIndex { $0.lowercased() == found.lowercased() } ?? .zero),
                                     write: { v in put(options[((Int(v) % n) + n) % n]) }, wrap: Double(n))
    case .hue:
        let raw = g[1] ?? ""
        guard let rgba = MetalRGBA(hex: raw) else { return nil }
        let r = rgba.red / 255, gr = rgba.green / 255, b = rgba.blue / 255
        let hi = max(r, gr, b), lo = min(r, gr, b), c = hi - lo, l = (hi + lo) / 2
        let s = c > .zero ? c / (1 - abs(2 * l - 1)) : .zero
        let h: Double = c == .zero ? .zero : hi == r ? (gr - b) / c : hi == gr ? (b - r) / c + 2 : (r - gr) / c + 4
        let upper = raw.rangeOfCharacter(from: CharacterSet(charactersIn: "abcdef")) == nil
        return MetalMarkScrubReading(value: (h * 60 + 720).truncatingRemainder(dividingBy: 360), write: { v in
            let k = { (n: Double) in (n + v / 30).truncatingRemainder(dividingBy: 12) }
            let f = { (n: Double) in l - s * min(l, 1 - l) * max(-1, min(k(n) - 3, 9 - k(n), 1)) }
            let out = [0.0, 8, 4].map { String(format: upper ? "%02X" : "%02x", Int((f($0) * 255).rounded())) }.joined()
            return put("#\(out)")
        }, wrap: 360)
    }
}

/// A recognised value you drag or step in place. The words are the value: bind them.
public struct MetalMarkScrub<Picker: View>: View {
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
    let today: Date
    let hint: String?
    let picker: ((MetalMarkScrubPick) -> Picker)?
    let onCommit: ((String) -> Void)?

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool
    @AppStorage("metalCueHint") private var hintSeen = false
    @State private var scrub: Scrub?
    @State private var held = false
    @State private var picking = false
    @State private var hovering = false
    @State private var moved = 0
    @State private var width: CGFloat = .zero
    @State private var hold: CGFloat?
    @State private var down = false
    @State private var refusals = 0
    @State private var refusalDirection = 1.0

    private struct Scrub {
        let from: String
        var write: (Double) -> String
        var cycle: (() -> String)?
        var value: Double
        var last: Double = .zero
        var acc: Double = .zero
        var lastX: Double = .zero
        var across: Double = .zero
        var detents = 0
        var cycled = false
        var pinned = false
    }

    init(words: Binding<String>, kind: MetalCueKind, scale: MetalMarkScrubScale, label: String?, resolved: String?, glyph: MetalCueGlyph,
         step: Double?, smallStep: Double?, largeStep: Double?, range: ClosedRange<Double>?, today: Date, hint: String?,
         picker: ((MetalMarkScrubPick) -> Picker)?, onCommit: ((String) -> Void)?) {
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
        self.today = today
        self.hint = hint
        self.picker = picker
        self.onCommit = onCommit
    }

    /// With a picker: the long jump (a held press, or Return), in a popover from the words. A day passes a MetalCalendar.
    /// - Parameters:
    ///   - words: the words as written ("6h", "tomorrow", "#done"); rewritten in place on every change.
    ///   - scale: how the words carry the value.
    ///   - step, smallStep, largeStep: a detent's step and the ⌥ and ⇧ steps; the recipe's per scale by default.
    ///   - range: limits for a number, a duration or a day (a duration never goes below 0; a clock, the states and a hue wrap).
    ///   - today: a day's today.
    ///   - hint: said in the chip on the first hover on this Mac, once; nil for never.
    ///   - onCommit: once per gesture, key press or pick, with the new words: the host's one undo step.
    public init(_ words: Binding<String>, kind: MetalCueKind, scale: MetalMarkScrubScale = .number, label: String? = nil,
                resolved: String? = nil, glyph: MetalCueGlyph = .kind, step: Double? = nil, smallStep: Double? = nil,
                largeStep: Double? = nil, in range: ClosedRange<Double>? = nil, today: Date = Date(), hint: String? = "Drag to change",
                onCommit: ((String) -> Void)? = nil, @ViewBuilder picker: @escaping (MetalMarkScrubPick) -> Picker) {
        self.init(words: words, kind: kind, scale: scale, label: label, resolved: resolved, glyph: glyph, step: step, smallStep: smallStep,
                  largeStep: largeStep, range: range, today: today, hint: hint, picker: picker, onCommit: onCommit)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.markScrub }
    private var name: String { label ?? scale.name }
    private var reading: MetalMarkScrubReading? { metalMarkScrubRead(words, scale: scale, today: today) }
    private var count: Int? { if case .options(let o) = scale { o.count } else { nil } }
    private var lower: Double? {
        if count != nil { return .zero }
        switch scale {
        case .clock, .hue: return nil
        case .duration: return range?.lowerBound ?? .zero
        default: return range?.lowerBound
        }
    }
    private var upper: Double? {
        if let count { return Double(count - 1) }
        return scale == .clock || scale == .hue ? nil : range?.upperBound
    }
    private var hinting: Bool { hovering && !hintSeen && hint != nil && scrub == nil }

    private func amount(_ modifiers: EventModifiers) -> Double {
        modifiers.contains(.shift) ? (largeStep ?? recipe.scalar("\(scale.key).large"))
            : modifiers.contains(.option) ? (smallStep ?? recipe.scalar("\(scale.key).small"))
            : (step ?? recipe.scalar("\(scale.key).step"))
    }

    private func move(_ from: Double, by delta: Double, wrap: Double?) -> Double {
        let next = (from + delta).rounded(toPlaces: 10)
        if let wrap { return (next.truncatingRemainder(dividingBy: wrap) + wrap).truncatingRemainder(dividingBy: wrap) }
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

    private func detentHaptic() {
        #if os(macOS)
        NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .now)
        #endif
    }

    // MARK: drag

    private func pull(_ translation: CGSize, _ modifiers: EventModifiers) {
        guard !held else { return }
        if scrub == nil {
            guard let r = reading else { return }
            scrub = Scrub(from: words, write: r.write, cycle: r.cycle, value: r.value)
            hold = width
            moved = .zero
            focused = true
            hintSeen = true
        }
        guard var s = scrub else { return }
        // Sideways: a duration says its amount in the other unit, once per unit.pixels.
        s.across += translation.width - s.lastX
        s.lastX = translation.width
        if let cycle = s.cycle, abs(s.across) >= recipe.points("unit.pixels") {
            s.across = .zero
            s.cycled = true
            let next = cycle()
            show(next, lowering: down)
            if let r = metalMarkScrubRead(next, scale: scale, today: today) { s.write = r.write; s.cycle = r.cycle }
            detentHaptic()
        }
        let up = -translation.height
        s.acc += up - s.last
        s.last = up
        let own = recipe.points("\(scale.key).pixels")
        let px = own > .zero ? own : recipe.points("scrub.pixels")
        let n = (s.acc / px).rounded(.towardZero)
        if n != .zero {
            s.acc -= n * px
            let next = move(s.value, by: n * amount(modifiers), wrap: reading?.wrap)
            if next == s.value {
                if !s.pinned { refuse(n > .zero ? .one : -.one) }
                s.pinned = true
            } else {
                s.pinned = false
                s.value = next
                s.detents += Int(n)
                moved += Int(n)
                show(s.write(next), lowering: n < .zero)
                detentHaptic()
            }
        }
        scrub = s
    }

    private func release() {
        if held { held = false; return }
        if let s = scrub, words != s.from { onCommit?(words) }
        scrub = nil
        hold = nil
    }

    /// A press held with no detent: the picker, anchored to the words; the drag ends there.
    private func longPress() {
        guard picker != nil, let s = scrub, s.detents == .zero, !s.cycled else { return }
        scrub = nil
        hold = nil
        held = true
        detentHaptic()
        picking = true
    }

    private func choose(_ value: Double) {
        picking = false
        guard let r = reading else { return }
        let next = r.write(value)
        guard next != words else { return }
        show(next, lowering: value < r.value)
        onCommit?(next)
    }

    // MARK: keys

    private func stepOnce(_ delta: Double) {
        guard let r = reading else { return }
        let next = move(r.value, by: delta, wrap: r.wrap)
        guard next != r.value else { refuse(delta > .zero ? .one : -.one); return }
        show(r.write(next), lowering: delta < .zero)
        onCommit?(words)
    }

    private func cycleUnit() {
        guard let next = reading?.cycle?() else { return }
        show(next, lowering: down)
        onCommit?(next)
    }

    private func key(_ press: KeyPress) -> KeyPress.Result {
        guard let r = reading else { return .ignored }
        switch press.key {
        case .upArrow: stepOnce(amount(press.modifiers))
        case .downArrow: stepOnce(-amount(press.modifiers))
        case .pageUp: stepOnce(largeStep ?? recipe.scalar("\(scale.key).large"))
        case .pageDown: stepOnce(-(largeStep ?? recipe.scalar("\(scale.key).large")))
        case .home: if let lower { stepOnce(lower - r.value) } else { return .ignored }
        case .end: if let upper { stepOnce(upper - r.value) } else { return .ignored }
        case .space: if count != nil { stepOnce(1) } else { return .ignored }
        case .return: if picker != nil { picking = true } else { return .ignored }
        default:
            guard press.characters.lowercased() == "u", r.cycle != nil else { return .ignored }
            cycleUnit()
        }
        return .handled
    }

    // MARK: look

    @ViewBuilder private var face: some View {
        if kind == .tag || kind == .derivedTag {
            MetalCueTag(words, derived: kind == .derivedTag)
        } else {
            let hex = kind == .hex ? words.range(of: #"#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b"#, options: .regularExpression).flatMap { MetalRGBA(hex: String(words[$0])) } : nil
            MetalCueMark(words, kind: kind, resolved: hinting ? nil : resolved, label: hinting ? hint : label, glyph: glyph, hex: hex)
        }
    }

    /// An enum's neighbouring state, peeking above or below the words while held.
    private func peek(_ delta: Double) -> some View {
        let r = reading
        return Text(r.map { $0.write(move($0.value, by: delta, wrap: $0.wrap)) } ?? "")
            .font(.metal(MetalType.content))
            .foregroundColor(colorway.tokens.ink.color)
            .fixedSize()
            .opacity(scrub != nil ? recipe.scalar("peek.opacity") : .zero)
            .metalAnimation(.settle, value: scrub != nil)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    public var body: some View {
        let gap = recipe.points("peek.gap")
        face
            .contentTransition(reduceMotion ? .opacity : .numericText(countsDown: down))
            .environment(\.metalCueLineScale, hovering || scrub != nil ? recipe.scalar("hover.line") : 1)
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
            .overlay(alignment: .topLeading) {
                if count != nil { peek(1).alignmentGuide(.top) { d in d[.bottom] + gap } }
            }
            .overlay(alignment: .bottomLeading) {
                if count != nil { peek(-1).alignmentGuide(.bottom) { d in d[.top] - gap } }
            }
            .overlay(alignment: .leading) {
                if count == nil {
                    MetalMarkScrubRuler(moved: moved)
                        .offset(x: (hold ?? width) + recipe.points("scale.gap"))
                        .opacity(scrub != nil ? .one : .zero)
                        .metalAnimation(.settle, value: scrub != nil)
                        .allowsHitTesting(false)
                        .accessibilityHidden(true)
                }
            }
            .contentShape(Rectangle())
            .onHover { inside in
                hovering = inside
                if !inside, hint != nil { hintSeen = true }
                #if os(macOS)
                if inside { NSCursor.resizeUpDown.push() } else { NSCursor.pop() }
                #endif
            }
            .gesture(DragGesture(minimumDistance: .zero)
                .onChanged { drag in
                    #if os(macOS)
                    pull(drag.translation, metalScrubModifiers(NSEvent.modifierFlags))
                    #else
                    pull(drag.translation, [])
                    #endif
                }
                .onEnded { _ in release() })
            .simultaneousGesture(LongPressGesture(minimumDuration: recipe.durationSeconds("press.hold")).onEnded { _ in longPress() })
            .popover(isPresented: $picking) {
                if let picker, let r = reading {
                    picker(MetalMarkScrubPick(value: r.value, words: words, choose: choose))
                        .padding(MetalRecipes.popover.points("self.pad"))
                }
            }
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
            .accessibilityActions {
                if picker != nil { Button("Choose \(name.lowercased())") { picking = true } }
                if reading?.cycle != nil { Button("Other unit") { cycleUnit() } }
            }
    }
}

extension MetalMarkScrub where Picker == EmptyView {
    /// - Parameters:
    ///   - words: the words as written ("6h", "tomorrow 4pm", "#done"); rewritten in place on every change.
    ///   - scale: how the words carry the value.
    ///   - step, smallStep, largeStep: a detent's step and the ⌥ and ⇧ steps; the recipe's per scale by default.
    ///   - range: limits for a number, a duration or a day (a duration never goes below 0; a clock, the states and a hue wrap).
    ///   - today: a day's today.
    ///   - hint: said in the chip on the first hover on this Mac, once; nil for never.
    ///   - onCommit: once per gesture or key press, with the new words: the host's one undo step.
    public init(_ words: Binding<String>, kind: MetalCueKind, scale: MetalMarkScrubScale = .number, label: String? = nil,
                resolved: String? = nil, glyph: MetalCueGlyph = .kind, step: Double? = nil, smallStep: Double? = nil,
                largeStep: Double? = nil, in range: ClosedRange<Double>? = nil, today: Date = Date(), hint: String? = "Drag to change",
                onCommit: ((String) -> Void)? = nil) {
        self.init(words: words, kind: kind, scale: scale, label: label, resolved: resolved, glyph: glyph, step: step, smallStep: smallStep,
                  largeStep: largeStep, range: range, today: today, hint: hint, picker: nil, onCommit: onCommit)
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
