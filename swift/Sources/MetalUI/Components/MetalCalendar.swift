import SwiftUI

// CALENDAR (calendar.agent.md; the web is the reference)
//
//   grid     weekday initials, then six rows of days: the height never jumps. Larger periods (months,
//            quarters, halves, years) fill the same footprint
//   hover    a unit sinks into the switcher's track look; only what is chosen stands raised
//   chosen   the switcher's thumb, landing from `self.land` on the part spring
//   range    the first end lands; until the second, the stretch to the pointer is the sunken track.
//            Whole, one raised thumb per week, round at its true ends and `band.open-radius` where it
//            runs on; it settles in from `band.land` tall. minDays / maxDays put units out of reach
//   today    a green LED under the number; a mark a dot beside it (ink2, or the amber / red LED)
//   month    the title turns (numeric text); the grid comes in from the side you head to, fading in
//   levels   the title opens the months of its year, then the years (from 1 + `self.zoom`); choosing
//            goes back down (from 1 - `self.zoom`); Esc goes back where you were
//   keys     arrows by unit and row, Page Up / Down by page, Home / End to the row's ends, Return or
//            Space chooses
// Reduce Motion: the arrivals and the land resolve through MetalMotion (no travel, fades stay).

/// The unit a calendar chooses.
public enum MetalCalendarPeriod: String, CaseIterable, Sendable { case day, month, quarter, half, year }

/// A range of days, both ends included; `end` is nil until the second end is chosen. With a larger period,
/// `start` is the first day of the first unit and `end` the last day of the last one.
public struct MetalDateRange: Equatable, Sendable {
    public var start: Date
    public var end: Date?
    public init(start: Date, end: Date?) {
        self.start = start
        self.end = end
    }
}

/// Something on a unit: a dot beside its number, and its words said with it. The tone keeps the LED's meaning.
public struct MetalDayMark: Sendable {
    public enum Tone: Sendable { case ink, amber, red }
    public let label: String
    public let tone: Tone
    public init(_ label: String, tone: Tone = .ink) {
        self.label = label
        self.tone = tone
    }
}

enum MetalCalendarSelection {
    case single(Binding<Date?>)
    case range(Binding<MetalDateRange?>, minDays: Int?, maxDays: Int?)
    case multiple(Binding<Set<Date>>)
}

/// Date arithmetic for a calendar in one locale and week.
struct MetalCalendarMath {
    var cal: Calendar
    var locale: Locale

    init(locale: Locale, weekStartsOn: Int?) {
        var c = Calendar(identifier: .gregorian)
        c.locale = locale
        c.timeZone = .current
        if let weekStartsOn { c.firstWeekday = weekStartsOn + 1 }
        cal = c
        self.locale = locale
    }

    static func months(_ unit: MetalCalendarPeriod) -> Int {
        switch unit { case .day: 0; case .month: 1; case .quarter: 3; case .half: 6; case .year: 12 }
    }
    static func cols(_ unit: MetalCalendarPeriod) -> Int {
        switch unit { case .day: 7; case .month, .year: 3; case .quarter, .half: 2 }
    }
    static func up(_ unit: MetalCalendarPeriod) -> MetalCalendarPeriod? {
        switch unit { case .day: .month; case .month, .quarter, .half: .year; case .year: nil }
    }

    func day(_ d: Date) -> Date { cal.startOfDay(for: d) }
    func ymd(_ d: Date) -> (y: Int, m: Int, d: Int) {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return (c.year ?? .zero, (c.month ?? 1) - 1, c.day ?? 1)
    }
    func make(_ y: Int, _ m: Int, _ d: Int) -> Date {
        cal.date(from: DateComponents(year: y, month: m + 1, day: d)) ?? Date()
    }
    func start(_ d: Date, _ unit: MetalCalendarPeriod) -> Date {
        if unit == .day { return day(d) }
        let p = ymd(d), n = Self.months(unit)
        return make(p.y, (p.m / n) * n, 1)
    }
    func end(_ d: Date, _ unit: MetalCalendarPeriod) -> Date {
        if unit == .day { return day(d) }
        let s = ymd(start(d, unit))
        return make(s.y, s.m + Self.months(unit), .zero)
    }
    func same(_ a: Date?, _ b: Date?, _ unit: MetalCalendarPeriod) -> Bool {
        guard let a, let b else { return false }
        return start(a, unit) == start(b, unit)
    }
    func addDays(_ d: Date, _ n: Int) -> Date { cal.date(byAdding: .day, value: n, to: day(d)) ?? d }
    func addMonths(_ d: Date, _ n: Int) -> Date { cal.date(byAdding: .month, value: n, to: day(d)) ?? d }
    func shift(_ d: Date, _ unit: MetalCalendarPeriod, _ n: Int) -> Date {
        unit == .day ? addDays(d, n) : addMonths(d, n * Self.months(unit))
    }
    func between(_ a: Date, _ b: Date, _ unit: MetalCalendarPeriod) -> Int {
        if unit == .day { return cal.dateComponents([.day], from: day(a), to: day(b)).day ?? .zero }
        let x = ymd(start(a, unit)), y = ymd(start(b, unit))
        return ((y.y * 12 + y.m) - (x.y * 12 + x.m)) / Self.months(unit)
    }
    func page(_ d: Date, _ unit: MetalCalendarPeriod) -> Date {
        let p = ymd(d)
        switch unit {
        case .day: return make(p.y, p.m, 1)
        case .year: return make((p.y / 10) * 10, .zero, 1)
        default: return make(p.y, .zero, 1)
        }
    }
    func addPage(_ page: Date, _ unit: MetalCalendarPeriod, _ n: Int) -> Date {
        let p = ymd(page)
        switch unit {
        case .day: return make(p.y, p.m + n, 1)
        case .year: return make(p.y + n * 10, .zero, 1)
        default: return make(p.y + n, .zero, 1)
        }
    }
    func cells(_ page: Date, _ unit: MetalCalendarPeriod) -> [Date] {
        let p = ymd(page)
        switch unit {
        case .day:
            let lead = (cal.component(.weekday, from: page) - cal.firstWeekday + 7) % 7
            return (0..<42).map { addDays(page, $0 - lead) }
        case .year: return (0..<12).map { make(p.y - 1 + $0, .zero, 1) }
        default:
            let n = Self.months(unit)
            return (0..<(12 / n)).map { make(p.y, $0 * n, 1) }
        }
    }

    // Words
    func format(_ d: Date, _ template: String) -> String {
        let f = DateFormatter()
        f.locale = locale
        f.calendar = cal
        f.setLocalizedDateFormatFromTemplate(template)
        return f.string(from: d)
    }
    func name(_ d: Date, _ unit: MetalCalendarPeriod) -> String {
        switch unit {
        case .day: return format(d, "EEEEdMMMMyyyy")
        case .month: return format(d, "MMMMyyyy")
        case .year: return format(d, "yyyy")
        case .quarter, .half:
            let last = shift(d, unit, 1).addingTimeInterval(-1)
            return "\(tag(d, unit)) \(format(d, "yyyy")), \(format(d, "MMMM")) to \(format(last, "MMMM"))"
        }
    }
    func tag(_ d: Date, _ unit: MetalCalendarPeriod) -> String {
        "\(unit == .quarter ? "Q" : "H")\(ymd(d).m / Self.months(unit) + 1)"
    }
    func face(_ d: Date, _ unit: MetalCalendarPeriod) -> (main: String, sub: String?) {
        switch unit {
        case .day: return ("\(ymd(d).d)", nil)
        case .month: return (format(d, "MMM"), nil)
        case .year: return (format(d, "yyyy"), nil)
        case .quarter, .half:
            let last = shift(d, unit, 1).addingTimeInterval(-1)
            return (tag(d, unit), "\(format(d, "MMM")) – \(format(last, "MMM"))")
        }
    }
    func title(_ page: Date, _ unit: MetalCalendarPeriod) -> String {
        switch unit {
        case .day: return format(page, "MMMMyyyy")
        case .year: return "\(format(page, "yyyy")) – \(format(addPage(page, .year, 1).addingTimeInterval(-1), "yyyy"))"
        default: return format(page, "yyyy")
        }
    }
    func weekday(_ d: Date) -> (short: String, long: String) {
        let i = cal.component(.weekday, from: d) - 1
        return (cal.veryShortStandaloneWeekdaySymbols[i], cal.standaloneWeekdaySymbols[i])
    }
    func isoWeek(_ d: Date) -> Int {
        var iso = Calendar(identifier: .iso8601)
        iso.timeZone = cal.timeZone
        return iso.component(.weekOfYear, from: d)
    }
}

/// A month to choose a day from: or a range, several days, or a month, quarter, half year or year.
public struct MetalCalendar: View {
    let label: String
    let selection: MetalCalendarSelection
    let bounds: ClosedRange<Date>?
    let period: MetalCalendarPeriod
    let months: Int
    let weekStartsOn: Int?
    let weekNumbers: Bool
    let isUnavailable: ((Date) -> Bool)?
    let marks: ((Date) -> MetalDayMark?)?
    let monthBinding: Binding<Date>?
    let autoFocus: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.locale) private var locale
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var ownPage: Date?
    @State private var view: MetalCalendarPeriod?
    @State private var focused: Date?
    @State private var hover: Date?
    @State private var here: Date?
    @State private var dir: Dir = .none
    @FocusState private var gridFocused: Bool

    enum Dir: Equatable { case none, later, earlier, up, down }

    init(label: String, selection: MetalCalendarSelection, bounds: ClosedRange<Date>?, period: MetalCalendarPeriod, months: Int,
         weekStartsOn: Int?, weekNumbers: Bool, month: Binding<Date>?, isUnavailable: ((Date) -> Bool)?,
         marks: ((Date) -> MetalDayMark?)?, autoFocus: Bool = false) {
        self.label = label
        self.selection = selection
        self.bounds = bounds
        self.period = period
        self.months = max(1, months)
        self.weekStartsOn = weekStartsOn
        self.weekNumbers = weekNumbers
        self.monthBinding = month
        self.isUnavailable = isUnavailable
        self.marks = marks
        self.autoFocus = autoFocus
    }

    /// One day (or one unit of `period`).
    public init(_ label: String, selection: Binding<Date?>, in bounds: ClosedRange<Date>? = nil, period: MetalCalendarPeriod = .day,
                months: Int = 1, weekStartsOn: Int? = nil, weekNumbers: Bool = false, month: Binding<Date>? = nil,
                isUnavailable: ((Date) -> Bool)? = nil, marks: ((Date) -> MetalDayMark?)? = nil) {
        self.init(label: label, selection: .single(selection), bounds: bounds, period: period, months: months, weekStartsOn: weekStartsOn,
                  weekNumbers: weekNumbers, month: month, isUnavailable: isUnavailable, marks: marks)
    }

    /// A range; `minDays` / `maxDays` count the period's units, both ends included.
    public init(_ label: String, selection: Binding<MetalDateRange?>, in bounds: ClosedRange<Date>? = nil, period: MetalCalendarPeriod = .day,
                minDays: Int? = nil, maxDays: Int? = nil, months: Int = 1, weekStartsOn: Int? = nil, weekNumbers: Bool = false,
                month: Binding<Date>? = nil, isUnavailable: ((Date) -> Bool)? = nil, marks: ((Date) -> MetalDayMark?)? = nil) {
        self.init(label: label, selection: .range(selection, minDays: minDays, maxDays: maxDays), bounds: bounds, period: period, months: months,
                  weekStartsOn: weekStartsOn, weekNumbers: weekNumbers, month: month, isUnavailable: isUnavailable, marks: marks)
    }

    /// Several days (or units); pressing one again lets it go.
    public init(_ label: String, selection: Binding<Set<Date>>, in bounds: ClosedRange<Date>? = nil, period: MetalCalendarPeriod = .day,
                months: Int = 1, weekStartsOn: Int? = nil, weekNumbers: Bool = false, month: Binding<Date>? = nil,
                isUnavailable: ((Date) -> Bool)? = nil, marks: ((Date) -> MetalDayMark?)? = nil) {
        self.init(label: label, selection: .multiple(selection), bounds: bounds, period: period, months: months, weekStartsOn: weekStartsOn,
                  weekNumbers: weekNumbers, month: month, isUnavailable: isUnavailable, marks: marks)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.calendar }
    private var math: MetalCalendarMath { MetalCalendarMath(locale: locale, weekStartsOn: weekStartsOn) }
    private var unit: MetalCalendarPeriod { view ?? period }
    private var nav: Bool { unit != period }
    private var pages: Int { nav ? 1 : months }
    private var today: Date { math.day(Date()) }
    private var anchor: Date? {
        switch selection {
        case .single(let b): return b.wrappedValue
        case .range(let b, _, _): return b.wrappedValue?.end ?? b.wrappedValue?.start
        case .multiple(let b): return b.wrappedValue.min()
        }
    }
    private var page: Date { math.page(monthBinding?.wrappedValue ?? ownPage ?? anchor ?? today, unit) }
    private var shown: [Date] { (0..<pages).map { math.addPage(page, unit, $0) } }
    private var focus: Date { focused ?? clamp(anchor ?? today) }
    private var range: MetalDateRange? { if case .range(let b, _, _) = selection { return b.wrappedValue } else { return nil } }
    private var pending: Bool { !nav && range != nil && range?.end == nil }

    private func clamp(_ d: Date) -> Date {
        guard let bounds else { return d }
        return min(max(d, math.day(bounds.lowerBound)), math.day(bounds.upperBound))
    }
    private func out(_ d: Date) -> Bool {
        guard let bounds else { return false }
        return math.end(d, unit) < math.day(bounds.lowerBound) || math.start(d, unit) > math.day(bounds.upperBound)
    }
    private func visible(_ d: Date) -> Bool { shown.contains(math.page(d, unit)) }
    private func reach(_ d: Date) -> Bool {
        guard pending, let range, case .range(_, let lo, let hi) = selection else { return true }
        let len = abs(math.between(range.start, d, unit)) + 1
        return !(lo.map { len < $0 } ?? false) && !(hi.map { len > $0 } ?? false)
    }
    private func setPage(_ p: Date) {
        if let monthBinding { monthBinding.wrappedValue = p } else { ownPage = p }
    }

    private func go(_ next: Date) {
        let d = clamp(next)
        focused = d
        let p = math.page(d, unit)
        if p < page { animate(.earlier) { setPage(p) } }
        else if let last = shown.last, p > last { animate(.later) { setPage(math.addPage(p, unit, -(pages - 1))) } }
    }
    private func turn(_ n: Int) {
        let step = unit == .day ? n : n * 12 * (unit == .year ? 10 : 1)
        animate(n > 0 ? .later : .earlier) {
            setPage(math.addPage(page, unit, n))
            focused = clamp(math.addMonths(focus, step))
        }
    }
    private func animate(_ d: Dir, _ body: () -> Void) {
        dir = d
        withMetalAnimation(.settle, reduceMotion: reduceMotion, body)
    }

    private func pick(_ d: Date) {
        guard !out(d) else { return }
        let s = math.start(d, unit)
        withMetalAnimation(.part, reduceMotion: reduceMotion) {
            switch selection {
            case .single(let b): b.wrappedValue = s
            case .multiple(let b):
                if let hit = b.wrappedValue.first(where: { math.same($0, s, unit) }) { b.wrappedValue.remove(hit) } else { b.wrappedValue.insert(s) }
            case .range(let b, _, _):
                if let r = b.wrappedValue, r.end == nil {
                    guard reach(d) else { return }
                    let (a, z) = r.start <= s ? (r.start, s) : (s, r.start)
                    b.wrappedValue = MetalDateRange(start: math.start(a, unit), end: math.end(z, unit))
                    hover = nil
                } else {
                    b.wrappedValue = MetalDateRange(start: s, end: nil)
                }
            }
        }
        if visible(d) { focused = d } else { go(d) }
    }
    private func ascend(_ from: Date) {
        guard let up = MetalCalendarMath.up(unit) else { return }
        here = from
        animate(.up) {
            view = up
            setPage(from)
        }
        gridFocused = true
    }
    private func descend(_ d: Date?) {
        let down: MetalCalendarPeriod = unit == .year && period == .day ? .month : period
        var next = focus
        if let d {
            next = unit == .year ? math.addMonths(focus, (math.ymd(d).y - math.ymd(focus).y) * 12) : math.addMonths(focus, math.between(focus, d, .month))
        }
        next = clamp(next)
        animate(.down) {
            view = down
            focused = next
            setPage(d == nil ? (here ?? next) : next)
        }
    }

    private func key(_ press: KeyPress) -> KeyPress.Result {
        let cols = MetalCalendarMath.cols(unit)
        let cells = math.cells(math.page(focus, unit), unit)
        let at = cells.firstIndex { math.same($0, focus, unit) } ?? .zero
        let row = at - at % cols
        let keep: (Date) -> Date = { c in unit == .day ? c : math.addMonths(focus, math.between(focus, c, .month)) }
        let pageStep = unit == .day ? 1 : 12 * (unit == .year ? 10 : 1)
        var next: Date?
        switch press.key {
        case .leftArrow: next = math.shift(focus, unit, -1)
        case .rightArrow: next = math.shift(focus, unit, 1)
        case .upArrow: next = math.shift(focus, unit, -cols)
        case .downArrow: next = math.shift(focus, unit, cols)
        case .pageUp: next = math.addMonths(focus, -pageStep)
        case .pageDown: next = math.addMonths(focus, pageStep)
        case .home: next = keep(cells[row])
        case .end: next = keep(cells[row + cols - 1])
        case .return, .space:
            if nav { descend(focus) } else { pick(focus) }
            return .handled
        case .escape:
            guard nav else { return .ignored }
            descend(nil)
            return .handled
        default: return .ignored
        }
        if let next {
            go(next)
            if pending { hover = math.start(clamp(next), unit) }
        }
        return .handled
    }

    public var body: some View {
        HStack(alignment: .top, spacing: recipe.points("page.gap")) {
            ForEach(Array(shown.enumerated()), id: \.offset) { i, pg in pageView(pg, index: i) }
        }
        .padding(recipe.points("self.pad"))
        .focusable()
        .focused($gridFocused)
        .focusEffectDisabled()
        .onKeyPress(phases: .down) { key($0) }
        .onAppear { if autoFocus { gridFocused = true } }
        .onChange(of: period) { view = nil }
        .onChange(of: anchor) { _, new in if let new, !visible(new) { go(new) } }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    // MARK: Parts

    private var cellSize: Double { recipe.points("day.size") }
    private var gap: Double { recipe.points("day.gap") }
    private var dayCols: Int { weekNumbers && period == .day ? 8 : 7 }
    private var pageWidth: Double { unit == .day ? Double(dayCols) * cellSize + Double(dayCols - 1) * gap : sheet.width }
    /// The footprint every level keeps: the month of days, with its weekday row.
    private var sheet: CGSize {
        let w = Double(dayCols) * cellSize + Double(dayCols - 1) * gap
        let width = Double(pages == 1 && nav ? months : 1) * w + Double((nav ? months : 1) - 1) * recipe.points("page.gap")
        return CGSize(width: width, height: 7 * cellSize + 6 * gap)
    }

    private func pageView(_ pg: Date, index: Int) -> some View {
        let title = math.title(pg, unit)
        return VStack(spacing: recipe.points("head.gap")) {
            HStack(spacing: recipe.points("head.gap")) {
                if index == 0 { step(-1) } else { spacer }
                Spacer(minLength: .zero)
                titleView(title, pg)
                Spacer(minLength: .zero)
                if index == pages - 1 { step(1) } else { spacer }
            }
            .frame(height: recipe.points("head.height"))
            grid(pg)
                .id("\(unit.rawValue)-\(pg.timeIntervalSince1970)")
                .transition(arrival)
        }
        .frame(width: pageWidth)
    }

    private var arrival: AnyTransition {
        let travel = recipe.points("head.gap")
        let zoom = recipe.scalar("self.zoom")
        switch dir {
        case .later: return .asymmetric(insertion: .opacity.combined(with: .offset(x: travel)), removal: .identity)
        case .earlier: return .asymmetric(insertion: .opacity.combined(with: .offset(x: -travel)), removal: .identity)
        case .up: return .asymmetric(insertion: .opacity.combined(with: .scale(scale: .one + zoom)), removal: .identity)
        case .down: return .asymmetric(insertion: .opacity.combined(with: .scale(scale: .one - zoom)), removal: .identity)
        case .none: return .identity
        }
    }

    private var spacer: some View { Color.clear.frame(width: recipe.points("head.height"), height: recipe.points("head.height")) }

    private func step(_ n: Int) -> some View {
        let word = unit == .day ? "month" : unit == .year ? "years" : "year"
        let name = unit == .year ? (n < 0 ? "Earlier years" : "Later years") : "\(n < 0 ? "Previous" : "Next") \(word)"
        let disabled = n < 0 ? bounds.map { page <= math.page($0.lowerBound, unit) } ?? false
            : bounds.map { (shown.last ?? page) >= math.page($0.upperBound, unit) } ?? false
        return Button { turn(n) } label: {
            MetalIcon(.chevron, size: recipe.points("step.glyph"))
                .rotationEffect(.degrees(n < 0 ? 90 : 270))
        }
        .buttonStyle(StepStyle())
        .disabled(disabled)
        .accessibilityLabel(name)
    }

    @ViewBuilder
    private func titleView(_ title: String, _ pg: Date) -> some View {
        let text = Text(title).font(.metal(MetalType.title)).lineLimit(1).fixedSize().foregroundColor(colorway.tokens.ink.color).contentTransition(.numericText(countsDown: dir == .earlier))
        if let up = MetalCalendarMath.up(unit) {
            TitleKey(label: "\(title), choose \(up == .month ? "a month" : "a year")") { ascend(pg) } label: {
                HStack(spacing: recipe.points("unit.sub-gap")) {
                    text
                    MetalIcon(.chevron, size: recipe.points("step.glyph")).foregroundColor(colorway.tokens.ink3.color)
                }
            }
        } else {
            text.accessibilityAddTraits(.isHeader)
        }
    }

    private func grid(_ pg: Date) -> some View {
        let cells = math.cells(pg, unit)
        let cols = MetalCalendarMath.cols(unit)
        let rows = cells.count / cols
        let cell = unit == .day
            ? CGSize(width: cellSize, height: cellSize)
            : CGSize(width: (sheet.width - Double(cols - 1) * gap) / Double(cols), height: (sheet.height - Double(rows - 1) * gap) / Double(rows))
        return VStack(spacing: gap) {
            if unit == .day {
                HStack(spacing: gap) {
                    if dayCols == 8 { Color.clear.frame(width: cellSize, height: cellSize) }
                    ForEach(0..<7, id: \.self) { i in
                        let w = math.weekday(cells[i])
                        Text(w.short).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color)
                            .frame(width: cellSize, height: cellSize).accessibilityLabel(w.long)
                    }
                }
            }
            ForEach(0..<rows, id: \.self) { r in
                row(Array(cells[(r * cols)..<(r * cols + cols)]), pg: pg, cell: cell)
            }
        }
        .onHover { if !$0 { hover = nil } }
    }

    private func row(_ cells: [Date], pg: Date, cell: CGSize) -> some View {
        ZStack(alignment: .topLeading) {
            bands(cells, pg: pg, cell: cell)
            HStack(spacing: gap) {
                if unit == .day && dayCols == 8 {
                    Text("\(math.isoWeek(cells[3]))").font(.metal(MetalType.meta)).monospacedDigit()
                        .foregroundColor(colorway.tokens.ink3.color).frame(width: cellSize, height: cellSize)
                        .accessibilityLabel("Week \(math.isoWeek(cells[3]))")
                }
                ForEach(cells, id: \.self) { d in unitView(d, pg: pg, cell: cell) }
            }
        }
    }

    /// The band: a whole range raised, or a pending one's stretch to the pointer sunken, one run per row.
    @ViewBuilder
    private func bands(_ cells: [Date], pg: Date, cell: CGSize) -> some View {
        if !nav, let r = range {
            let span: (Date, Date, Bool)? = {
                if let end = r.end { return (math.start(r.start, unit), math.start(end, unit), true) }
                guard let h = hover, !math.same(h, r.start, unit), reach(h) else { return nil }
                return h < r.start ? (h, math.start(r.start, unit), false) : (math.start(r.start, unit), h, false)
            }()
            if let (from, to, chosen) = span {
                let inside = cells.enumerated().filter { _, d in
                    let s = math.start(d, unit)
                    return s >= from && s <= to && !(pages > 1 && math.page(d, unit) != pg)
                }
                if let first = inside.first, let last = inside.last {
                    let lead = Double(dayCols == 8 && unit == .day ? 1 : 0)
                    let x = (Double(first.offset) + lead) * (cell.width + gap)
                    let w = Double(inside.count) * cell.width + Double(inside.count - 1) * gap
                    let round = recipe.points("day.radius"), open = recipe.points("band.open-radius")
                    let startR = math.same(first.element, from, unit) ? round : open
                    let endR = math.same(last.element, to, unit) ? round : open
                    let shape = UnevenRoundedRectangle(topLeadingRadius: startR, bottomLeadingRadius: startR, bottomTrailingRadius: endR, topTrailingRadius: endR, style: .continuous)
                    Color.clear
                        .metalObjectRecipe(MetalRecipes.switcher, part: chosen ? "thumb" : "self", in: shape)
                        .frame(width: w, height: cell.height)
                        .offset(x: x)
                        .transition(.asymmetric(insertion: .opacity.combined(with: .scale(scale: recipe.scalar("band.land"))), removal: .identity))
                        .id("\(chosen)-\(from.timeIntervalSince1970)-\(to.timeIntervalSince1970)")
                        .allowsHitTesting(false)
                }
            }
        }
    }

    @ViewBuilder
    private func unitView(_ d: Date, pg: Date, cell: CGSize) -> some View {
        let outside = math.page(d, unit) != pg
        if outside && pages > 1 {
            Color.clear.frame(width: cell.width, height: cell.height).accessibilityHidden(true)
        } else {
            let s = math.start(d, unit)
            let selected: Bool = {
                if nav { return math.same(d, here, unit) }
                switch selection {
                case .single(let b): return math.same(d, b.wrappedValue, unit)
                case .multiple(let b): return b.wrappedValue.contains { math.same($0, d, unit) }
                case .range(let b, _, _): return b.wrappedValue.map { $0.end == nil && math.same(d, $0.start, unit) } ?? false
                }
            }()
            let ranged: Bool = {
                guard !nav, let r = range else { return false }
                if let end = r.end { return s >= math.start(r.start, unit) && s <= math.start(end, unit) }
                return false
            }()
            let quiet = !nav && unit == .day && !out(d) && (isUnavailable?(d) ?? false)
            let mark = nav ? nil : marks?(s)
            let isAnchor = pending && range.map { math.same(d, $0.start, unit) } == true
            let disabled = out(d) || (!reach(d) && !isAnchor)
            CalendarCell(
                face: math.face(d, unit), size: cell, selected: selected, ranged: ranged, today: math.same(d, today, unit),
                faint: outside || quiet, mark: mark, focused: gridFocused && math.same(d, focus, unit) && !outside,
                disabled: disabled
            ) {
                if nav { descend(d) } else { pick(d) }
            } onHover: { inside in
                if inside && pending { hover = s }
            }
            .accessibilityLabel(math.name(d, unit))
            .accessibilityHint([quiet ? "Unavailable" : nil, mark?.label].compactMap { $0 }.joined(separator: ", "))
            .accessibilityAddTraits(selected || ranged ? [.isSelected] : [])
        }
    }
}

/// One unit: a day's number, or a month, quarter, half or year.
private struct CalendarCell: View {
    let face: (main: String, sub: String?)
    let size: CGSize
    let selected: Bool
    let ranged: Bool
    let today: Bool
    let faint: Bool
    let mark: MetalDayMark?
    let focused: Bool
    let disabled: Bool
    let action: () -> Void
    let onHover: (Bool) -> Void

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    var body: some View {
        let recipe = MetalRecipes.calendar
        let shape = RoundedRectangle(cornerRadius: recipe.points("day.radius"), style: .continuous)
        let dot = recipe.points("today.size")
        Button(action: action) {
            VStack(spacing: recipe.points("unit.sub-gap")) {
                Text(face.main).font(.metal(MetalType.ui)).monospacedDigit()
                    .foregroundColor((faint && !selected ? colorway.tokens.ink3 : colorway.tokens.ink).color)
                if let sub = face.sub { Text(sub).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color) }
            }
            .frame(width: size.width, height: size.height)
            .background {
                if selected {
                    Color.clear.metalObjectRecipe(MetalRecipes.switcher, part: "thumb", in: shape)
                        .transition(.asymmetric(insertion: .scale(scale: recipe.scalar("self.land")).combined(with: .opacity), removal: .identity))
                } else if hovering && !ranged && !disabled {
                    Color.clear.metalObjectRecipe(MetalRecipes.switcher, part: "self", in: shape)
                }
            }
            .overlay(alignment: .bottom) {
                HStack(spacing: dot / 2) {
                    if today { Circle().fill(MetalShared.ledGreen.gradient(diameter: dot)).frame(width: dot, height: dot) }
                    if let mark { Circle().fill(markFill(mark.tone, dot)).frame(width: dot, height: dot) }
                }
                .padding(.bottom, recipe.points("today.offset"))
            }
            .overlay { if focused { shape.strokeBorder(MetalShared.focus.color, lineWidth: MetalRing.focusWidth) } }
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? recipe.scalar("self.disabled") : .one)
        .onHover { hovering = $0; onHover($0) }
    }

    private func markFill(_ tone: MetalDayMark.Tone, _ d: Double) -> AnyShapeStyle {
        switch tone {
        case .ink: AnyShapeStyle(colorway.tokens.ink2.color)
        case .amber: AnyShapeStyle(MetalShared.ledAmber.gradient(diameter: d))
        case .red: AnyShapeStyle(MetalShared.ledRed.gradient(diameter: d))
        }
    }
}

/// A step key: the compact cap, as wide as the head is tall, with the set's chevron.
private struct StepStyle: ButtonStyle {
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let button = MetalRecipes.button
        let down = configuration.isPressed && isEnabled
        let shape = Capsule(style: .continuous)
        return configuration.label
            .foregroundColor(colorway.tokens.ink2.color)
            .frame(width: MetalRecipes.calendar.points("head.height"), height: button.points("compact.height"))
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(button, part: "compact", in: shape).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(button, part: "compact", state: "pressed", in: shape).opacity(down ? .one : .zero)
                }
            }
            .offset(y: down && !reduceMotion ? button.points("self.travel") : .zero)
            .animation(down ? nil : MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation, value: down)
            .contentShape(shape)
            .opacity(isEnabled ? .one : button.scalar("self.disabled"))
    }
}

/// The title as a key: it sinks into the switcher's track on hover.
private struct TitleKey<Label: View>: View {
    let label: String
    let action: () -> Void
    @ViewBuilder let content: () -> Label
    @State private var hovering = false

    init(label: String, action: @escaping () -> Void, @ViewBuilder label content: @escaping () -> Label) {
        self.label = label
        self.action = action
        self.content = content
    }

    var body: some View {
        let recipe = MetalRecipes.calendar
        Button(action: action) {
            content()
                .padding(.horizontal, recipe.points("head.gap"))
                .frame(height: recipe.points("head.height"))
                .background { if hovering { Color.clear.metalObjectRecipe(MetalRecipes.switcher, part: "self", in: Capsule(style: .continuous)) } }
                .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .accessibilityLabel(label)
    }
}

// MARK: - Date picker

/// A field you type a date into (read back under it as it is understood), with a clear key and a calendar key
/// that opens the calendar, with Today under it.
public struct MetalDatePicker: View {
    let label: String
    @Binding var selection: Date?
    let bounds: ClosedRange<Date>?
    let size: MetalFieldSize
    let isUnavailable: ((Date) -> Bool)?
    let marks: ((Date) -> MetalDayMark?)?

    @Environment(\.locale) private var locale
    @Environment(\.metalColorway) private var colorway
    @State private var text = ""
    @State private var open = false
    @State private var left = false

    public init(_ label: String, selection: Binding<Date?>, in bounds: ClosedRange<Date>? = nil, size: MetalFieldSize = .regular,
                isUnavailable: ((Date) -> Bool)? = nil, marks: ((Date) -> MetalDayMark?)? = nil) {
        self.label = label
        self._selection = selection
        self.bounds = bounds
        self.size = size
        self.isUnavailable = isUnavailable
        self.marks = marks
    }

    private var math: MetalCalendarMath { MetalCalendarMath(locale: locale, weekStartsOn: nil) }
    private func show(_ d: Date?) -> String { d.map { math.format($0, "dMMMyyyy") } ?? "" }
    private var hint: String {
        let f = DateFormatter()
        f.locale = locale
        f.setLocalizedDateFormatFromTemplate("ddMMyyyy")
        return f.dateFormat.lowercased()
    }
    /// A typed date: the locale's numeric order, a month name, or ISO 8601; left-out parts from today.
    func parse(_ t: String) -> Date?? {
        let s = t.trimmingCharacters(in: .whitespaces).lowercased()
        if s.isEmpty { return .some(nil) }
        for template in ["yyyy-M-d", nil] as [String?] {
            let f = DateFormatter()
            f.locale = locale
            f.isLenient = false
            if let template { f.dateFormat = template } else { f.dateStyle = .medium }
            if let d = f.date(from: s) { return .some(math.day(d)) }
        }
        let tokens = s.split(whereSeparator: { " /.,-".contains($0) }).map(String.init)
        let order: [Character] = hint.filter { "dmy".contains($0) }.reduce(into: []) { if $0.last != $1 { $0.append($1) } }
        var day: Int?, month: Int?, year: Int?, nums: [Int] = []
        let names = math.cal.monthSymbols.map { $0.lowercased() }
        for tok in tokens {
            if let n = Int(tok) { if tok.count >= 3 { year = n } else { nums.append(n) }; continue }
            guard tok.count >= 3, let m = names.firstIndex(where: { $0.hasPrefix(tok) }) else { return nil }
            month = m
        }
        let slots = order.filter { ($0 != "y" || year == nil) && ($0 != "m" || month == nil) }
        if nums.count == 1 { day = nums[0] } else {
            guard nums.count <= slots.count else { return nil }
            for (i, n) in nums.enumerated() {
                switch slots[i] { case "d": day = n; case "m": month = n - 1; default: year = n < 100 ? 2000 + n : n }
            }
        }
        guard let day else { return nil }
        let now = math.ymd(Date())
        let y = year ?? now.y, m = month ?? now.m
        let d = math.make(y, m, day)
        let back = math.ymd(d)
        return back.y == y && back.m == m && back.d == day ? .some(d) : nil
    }
    private var parsed: Date?? { parse(text) }
    private var message: String? {
        guard let p = parsed else { return "Enter a date like \(hint)" }
        if let d = p, let bounds, d < math.day(bounds.lowerBound) || d > math.day(bounds.upperBound) {
            return "Choose a day from \(show(bounds.lowerBound)) to \(show(bounds.upperBound))"
        }
        return nil
    }
    private var reading: String? {
        guard let p = parsed, let d = p, message == nil, text != show(d) else { return nil }
        return math.format(d, "EEEdMMMyyyy")
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.formField.points("self.gap")) {
            MetalField(label, text: $text, prompt: hint, size: size, clear: true, invalid: left && message != nil) {
                MetalFieldKey("Choose a day", icon: .calendar) { open = true }
                    .popover(isPresented: $open, arrowEdge: .bottom) { plate }
            }
            .onSubmit { leave() }
            .onChange(of: text) { _, t in
                if case .some(let d) = parse(t), message == nil, d != selection { selection = d }
            }
            if let reading {
                Text(reading).font(.metal(MetalType.readout)).foregroundColor(colorway.tokens.ink2.color)
                    .contentTransition(.numericText())
            } else if left, let message {
                Text(message).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.invalid.color)
            }
        }
        .onAppear { text = show(selection) }
        .onChange(of: selection) { _, d in if parsed.flatMap({ $0 }) != d { text = show(d) } }
    }

    private func leave() {
        if case .some(let d) = parsed, message == nil { text = show(d) }
        left = message != nil
    }

    private var plate: some View {
        let recipe = MetalRecipes.calendar
        let t = math.day(Date())
        let todayOut = bounds.map { t < math.day($0.lowerBound) || t > math.day($0.upperBound) } ?? false
        return VStack(alignment: .trailing, spacing: .zero) {
            MetalCalendar(label: label, selection: .single(Binding(get: { selection }, set: { d in
                selection = d
                text = show(d)
                left = false
                open = false
            })), bounds: bounds, period: .day, months: 1, weekStartsOn: nil, weekNumbers: false, month: nil,
                          isUnavailable: isUnavailable, marks: marks, autoFocus: true)
            MetalButton("Today", size: .compact) {
                selection = t
                text = show(t)
                open = false
            }
            .disabled(todayOut)
            .padding([.horizontal, .bottom], recipe.points("self.pad"))
        }
        .padding(MetalRecipes.popover.points("self.pad"))
    }
}
