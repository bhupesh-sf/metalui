import SwiftUI

// A time of day you type, or choose from slots: the date picker's sibling. The field's well holds the time in
// the reader's words, a zone engraved as its suffix and a clock key; under it the readback says a typed time
// with its part of the day ("2:30 in the afternoon"). The clock key opens the slots: latching keys (the
// button cap with its lamp) every `step` minutes inside min / max, scrolled to the chosen one; Now under them.

/// How precise a time is.
public enum MetalTimeGranularity: Sendable { case hour, minute, second }

/// Times as seconds since midnight, and their ISO 8601 words ("14:30", "14:30:05").
struct MetalTimeMath {
    static let day = 86400
    let granularity: MetalTimeGranularity
    let lo: Int?
    let hi: Int?

    init(granularity: MetalTimeGranularity, min: String?, max: String?) {
        self.granularity = granularity
        lo = min.map(Self.seconds)
        hi = max.map(Self.seconds)
    }

    static func seconds(_ time: String) -> Int {
        let p = time.split(separator: ":").compactMap { Int($0) }
        return (p.first ?? .zero) * 3600 + (p.count > 1 ? p[1] : .zero) * 60 + (p.count > 2 ? p[2] : .zero)
    }
    static func wrap(_ n: Int) -> Int { ((n % day) + day) % day }
    func iso(_ n: Int) -> String {
        let t = Self.wrap(n)
        let hm = String(format: "%02d:%02d", t / 3600, t / 60 % 60)
        return granularity == .second ? hm + String(format: ":%02d", t % 60) : hm
    }
    /// Inside min and max, or, when min is after max, across midnight.
    func inside(_ n: Int) -> Bool {
        if let lo, let hi, lo > hi { return n >= lo || n <= hi }
        return (lo.map { n >= $0 } ?? true) && (hi.map { n <= $0 } ?? true)
    }
    /// The slots: every `step` minutes inside the window, after `from` when it is the end of a pair.
    func slots(step: Int, from: Int?) -> [Int] {
        let stride = Swift.max(1, step) * 60
        let first = from.map { $0 + stride } ?? lo ?? .zero
        var out: [Int] = []
        var s = first
        while s < first + Self.day, out.count < 1440 {
            if let from, s >= from + Self.day { break }
            let t = Self.wrap(s)
            if inside(t) { out.append(t) } else if !out.isEmpty { break }
            s += stride
        }
        return out
    }
    /// A typed time: "14:30", "1430", "930", "9", "2.30pm", "230p", "14h30". nil inside: empty; nil: unreadable.
    func parse(_ text: String, twelve: Bool, am: [String], pm: [String]) -> Int?? {
        var t = text.trimmingCharacters(in: .whitespaces).lowercased()
        if t.isEmpty { return .some(nil) }
        var isPm: Bool?
        let marks = (am.map { ($0, false) } + pm.map { ($0, true) }).sorted { $0.0.count > $1.0.count }
        for (w, p) in marks {
            if t.hasSuffix(w) { isPm = p; t = String(t.dropLast(w.count)).trimmingCharacters(in: .whitespaces); break }
            if t.hasPrefix(w) { isPm = p; t = String(t.dropFirst(w.count)).trimmingCharacters(in: .whitespaces); break }
        }
        var nums: [Int] = []
        if let m = t.wholeMatch(of: #/(\d{1,2})(?:\s*[:.h]\s*(\d{2})(?:\s*[:.]\s*(\d{2}))?)?/#) {
            nums = [Int(m.1), m.2.flatMap { Int($0) }, m.3.flatMap { Int($0) }].map { $0 ?? .zero }
        } else if let m = t.wholeMatch(of: #/(\d{1,2})(\d{2})(\d{2})?/#) {
            nums = [Int(m.1), Int(m.2), m.3.flatMap { Int($0) }].map { $0 ?? .zero }
        } else { return nil }
        var h = nums[0]
        let mins = nums[1], secs = nums[2]
        guard mins < 60, secs < 60 else { return nil }
        let rest = mins * 60 + secs
        if let isPm {
            guard h <= 12 else { return nil }
            h = h % 12 + (isPm ? 12 : .zero)
        } else if twelve, (1...12).contains(h) {
            // No AM or PM on a 12-hour clock: the one inside the window, else the working day's.
            let morning = h % 12 * 3600 + rest, afternoon = morning + 12 * 3600
            if inside(morning) != inside(afternoon) { return .some(inside(morning) ? morning : afternoon) }
            return .some((7...11).contains(h) ? morning : afternoon)
        }
        guard h < 24 else { return nil }
        return .some(h * 3600 + rest)
    }
}

/// A form field you type a time into, or choose one from slots. The value is ISO 8601 ("14:30").
public struct MetalTimePicker: View {
    let label: String
    @Binding var selection: String?
    let step: Int
    let min: String?
    let max: String?
    let from: String?
    let granularity: MetalTimeGranularity
    let hourCycle: Int?
    let timeZone: TimeZone?
    let size: MetalFieldSize
    let isUnavailable: ((String) -> Bool)?

    @Environment(\.locale) private var locale
    @Environment(\.metalColorway) private var colorway
    @State private var text = ""
    @State private var open = false
    @State private var left = false

    /// - Parameters:
    ///   - step: minutes between slots. Default 15 (60 at hour granularity).
    ///   - min, max: the earliest and latest time ("09:00"); min after max is one window across midnight.
    ///   - from: the start of a pair: the slots begin after it and say how long each would be.
    ///   - hourCycle: 12 or 24; nil follows the locale.
    ///   - timeZone: its short name is engraved after the time; the value stays wall time.
    ///   - isUnavailable: quiet slots (booked), still choosable.
    public init(_ label: String, selection: Binding<String?>, step: Int? = nil, min: String? = nil, max: String? = nil, from: String? = nil,
                granularity: MetalTimeGranularity = .minute, hourCycle: Int? = nil, timeZone: TimeZone? = nil,
                size: MetalFieldSize = .regular, isUnavailable: ((String) -> Bool)? = nil) {
        self.label = label
        self._selection = selection
        self.step = step ?? (granularity == .hour ? 60 : 15)
        self.min = min
        self.max = max
        self.from = from
        self.granularity = granularity
        self.hourCycle = hourCycle
        self.timeZone = timeZone
        self.size = size
        self.isUnavailable = isUnavailable
    }

    private var math: MetalTimeMath { MetalTimeMath(granularity: granularity, min: min ?? from, max: max) }
    private var twelve: Bool {
        if let hourCycle { return hourCycle == 12 }
        return DateFormatter.dateFormat(fromTemplate: "j", options: 0, locale: locale)?.contains("a") ?? false
    }
    private func formatter(_ template: String) -> DateFormatter {
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(secondsFromGMT: .zero)
        f.setLocalizedDateFormatFromTemplate(template)
        return f
    }
    private var secondsPart: String { granularity == .second ? "ss" : "" }
    private func show(_ n: Int?) -> String {
        guard let n else { return "" }
        return formatter((twelve ? "hmma" : "HHmm") + secondsPart).string(from: Date(timeIntervalSince1970: TimeInterval(n)))
    }
    private var halves: (am: [String], pm: [String]) {
        let f = formatter("ha")
        let word = { (h: Int) in f.string(from: Date(timeIntervalSince1970: TimeInterval(h * 3600))).filter { !$0.isNumber }.trimmingCharacters(in: .whitespaces).lowercased() }
        return ([word(1), "a.m.", "am", "a"].filter { !$0.isEmpty }, [word(13), "p.m.", "pm", "p"].filter { !$0.isEmpty })
    }
    private var hint: String { formatter((twelve ? "hmma" : "HHmm") + secondsPart).dateFormat.lowercased() }
    func parse(_ t: String) -> Int?? {
        let h = halves
        guard let p = math.parse(t, twelve: twelve, am: h.am, pm: h.pm) else { return nil }
        return .some(p.map { MetalTimeMath.seconds(math.iso($0)) })
    }
    private var parsed: Int?? { parse(text) }
    private var span: String {
        switch (math.lo, math.hi) {
        case let (lo?, hi?): "from \(show(lo)) to \(show(hi))"
        case let (lo?, nil): "from \(show(lo))"
        case let (nil, hi): "up to \(show(hi))"
        }
    }
    private var message: String? {
        guard let p = parsed else { return "Enter a time like \(show(14 * 3600 + 1800))" }
        if let n = p, !math.inside(n) { return "Choose a time \(span)" }
        return nil
    }
    private var reading: String? {
        guard let p = parsed, let n = p, message == nil, text != show(n) else { return nil }
        return formatter("hmm" + secondsPart + "B").string(from: Date(timeIntervalSince1970: TimeInterval(n)))
    }
    private var zone: String? { timeZone.flatMap { $0.abbreviation() ?? $0.identifier } }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.formField.points("self.gap")) {
            MetalField(label, text: $text, prompt: hint, size: size, suffix: zone, clear: true, invalid: left && message != nil) {
                MetalFieldKey("Choose a time", icon: .clock) { open = true }
                    .popover(isPresented: $open, arrowEdge: .bottom) { plate }
            }
            .frame(minWidth: MetalRecipes.timePicker.points(granularity == .second ? "self.seconds-min-width" : "self.min-width"))
            .onSubmit { leave() }
            .onChange(of: text) { _, t in
                if case .some(let n) = parse(t), message == nil, n.map(math.iso) != selection { selection = n.map(math.iso) }
            }
            if let reading {
                Text(reading).font(.metal(MetalType.readout)).foregroundColor(colorway.tokens.ink2.color)
                    .contentTransition(.numericText())
            } else if left, let message {
                Text(message).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.invalid.color)
            }
        }
        .onAppear { text = show(selection.map(MetalTimeMath.seconds)) }
        .onChange(of: selection) { _, v in if parsed.flatMap({ $0 }) != v.map(MetalTimeMath.seconds) { text = show(v.map(MetalTimeMath.seconds)) } }
    }

    private func leave() {
        if case .some(let n) = parsed, message == nil { text = show(n) }
        left = message != nil
    }

    private func choose(_ n: Int) {
        selection = math.iso(n)
        text = show(n)
        left = false
        open = false
    }

    private var plate: some View {
        let now = Calendar.current.dateComponents([.hour, .minute, .second], from: Date())
        let nowSeconds = MetalTimeMath.seconds(math.iso((now.hour ?? .zero) * 3600 + (now.minute ?? .zero) * 60 + (now.second ?? .zero)))
        return VStack(alignment: .trailing, spacing: .zero) {
            MetalTimeSlots(label: label, slots: math.slots(step: step, from: from.map(MetalTimeMath.seconds)), chosen: selection.map(MetalTimeMath.seconds),
                           near: nowSeconds, from: from.map(MetalTimeMath.seconds), show: show, iso: math.iso, isUnavailable: isUnavailable, choose: choose)
            if from == nil {
                MetalButton("Now", size: .compact) { choose(nowSeconds) }
                    .disabled(!math.inside(nowSeconds))
                    .padding([.horizontal, .bottom], MetalRecipes.timePicker.points("self.pad"))
            }
        }
        .padding(MetalRecipes.popover.points("self.pad"))
    }
}

/// The slot plate: latching keys, four to a row (two with lengths), scrolled to the chosen one or the one nearest now.
struct MetalTimeSlots: View {
    let label: String
    let slots: [Int]
    let chosen: Int?
    let near: Int
    let from: Int?
    let show: (Int?) -> String
    let iso: (Int) -> String
    let isUnavailable: ((String) -> Bool)?
    let choose: (Int) -> Void
    /// false draws the grid without its scroll view (captures: an ImageRenderer can't draw one).
    var scrolls = true
    @Environment(\.metalColorway) private var colorway

    private func length(_ n: Int) -> String {
        guard let from else { return "" }
        let m = MetalTimeMath.wrap(n - from) / 60, h = m / 60
        return h > .zero ? (m % 60 > .zero ? "\(h) h \(m % 60)" : "\(h) h") : "\(m) min"
    }

    /// A slot: the button cap with its lamp; the chosen one stays down in the pressed look (the latch), lamp lit.
    private func key(_ s: Int) -> some View {
        let quiet = isUnavailable?(iso(s)) ?? false
        let recipe = MetalRecipes.button
        return Button { choose(s) } label: {
            HStack(spacing: recipe.points("self.gap")) {
                MetalLED(s == chosen ? .live : .off, size: .small)
                Text(show(s)).monospacedDigit()
                    .foregroundStyle(quiet && s != chosen ? colorway.tokens.ink3.color : colorway.tokens.ink.color)
                if from != nil { Text(length(s)).font(.metal(MetalType.meta)).foregroundStyle(colorway.tokens.ink3.color) }
            }
        }
        .buttonStyle(MetalButtonStyle())
        .metalButtonState(s == chosen ? .done : .ready)
        .focusEffectDisabled()
        .accessibilityAddTraits(s == chosen ? .isSelected : [])
        .accessibilityHint(quiet ? "Unavailable" : "")
        .id(s)
    }

    /// Every slot, four to a row (two with lengths); a plain grid, at most a day of slots.
    private var grid: some View {
        let recipe = MetalRecipes.timePicker
        let columns = Swift.max(1, Int(recipe.scalar(from == nil ? "slots.columns" : "slots.length-columns")))
        let gap = recipe.points("slots.gap")
        return Grid(horizontalSpacing: gap, verticalSpacing: gap) {
            ForEach(Array(stride(from: 0, to: slots.count, by: columns)), id: \.self) { row in
                GridRow {
                    ForEach(slots[row..<Swift.min(row + columns, slots.count)], id: \.self) { s in key(s) }
                }
            }
        }
        .padding(recipe.points("self.pad"))
    }

    var body: some View {
        let target = chosen ?? slots.min { abs($0 - near) < abs($1 - near) }
        if !scrolls { grid } else {
        ScrollViewReader { reader in
            ScrollView { grid }
                .frame(maxHeight: MetalRecipes.timePicker.points("slots.height"))
                .accessibilityLabel("\(label), times")
                .onAppear { if let target { reader.scrollTo(target, anchor: .center) } }
        }
        }
    }
}
