import SwiftUI

// MetalEventCalendar: the person's time (event-calendar.agent.md), a place. The head: the step keys,
// Today, the title and a view switcher. The month: six weeks; each day's events as one-line chips, events
// over several days (and all-day ones) as bars across the days, "+N more" past maxEvents (opens the day).
// A week or a day: day heads (today with the green lamp), the all-day lane, then the hours from dayStart to
// dayEnd in a scroll view: timed events at their time and length, sharing their day when they overlap; the
// now line in the LED's green, moved by a minute clock only while the scene is active. Drag an event to
// move it (hours and days) or its lower edge to change its end, both by the snap, an alignment haptic each
// step on macOS; the others re-share their day on settle. Keys on macOS: arrows by the snap and a day,
// Shift for the end, Return keeps, Escape puts back. VoiceOver: Later, Earlier, Next day, Previous day,
// Longer, Shorter. A rejected onCommit glides back to the previous events.
// Gaps (documented in the agent guide): no details popover (onOpen), month chips don't drag, no N-days view,
// no off days, right to left unchecked.

/// One of the person's events. An all-day event's `start` and `end` are its first and last days (both
/// included); a timed event's `end` is when it ends.
public struct MetalCalendarEvent: Identifiable, Equatable, Sendable {
    public let id: String
    public var title: String
    public var start: Date
    public var end: Date
    public var allDay: Bool
    /// The person's colour for it (a calendar's colour): data, never a state.
    public var color: MetalRGBA?
    /// It can't be moved; it still opens.
    public var disabled: Bool

    public init(id: String, title: String, start: Date, end: Date, allDay: Bool = false, color: MetalRGBA? = nil, disabled: Bool = false) {
        self.id = id
        self.title = title
        self.start = start
        self.end = end
        self.allDay = allDay
        self.color = color
        self.disabled = disabled
    }
}

public enum MetalEventCalendarView: String, CaseIterable, Sendable {
    case month, week, day
    var title: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }
}

private enum MetalEventCalendarSpace { static let name = "metal-event-calendar" }

public struct MetalEventCalendar: View {
    public typealias Event = MetalCalendarEvent

    @Binding private var events: [Event]
    @Binding private var view: MetalEventCalendarView
    @Binding private var date: Date
    private let dayStart: Int
    private let dayEnd: Int
    private let snap: Int
    private let fixedNow: Date?
    private let maxEvents: Int
    private let readOnly: Bool
    private let onOpen: ((Event) -> Void)?
    private let onCommit: (([Event], [Event]) async throws -> Void)?

    @State private var draft: Event?
    @State private var held: String?
    @State private var grabMinute = 0
    @State private var busy = false
    @State private var editing: [Event]?
    @State private var refusals: [String: Int] = [:]
    @FocusState private var focus: String?
    @Environment(\.calendar) private var cal
    @Environment(\.locale) private var locale
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalColorway) private var colorway

    public init(events: Binding<[Event]>, view: Binding<MetalEventCalendarView>, date: Binding<Date>,
                dayStart: Int = 7, dayEnd: Int = 21, snap: Int = 15, now: Date? = nil, maxEvents: Int = 3,
                readOnly: Bool = false, onOpen: ((Event) -> Void)? = nil,
                onCommit: (([Event], [Event]) async throws -> Void)? = nil) {
        self._events = events
        self._view = view
        self._date = date
        self.dayStart = dayStart
        self.dayEnd = max(dayEnd, dayStart + 1)
        self.snap = max(1, snap)
        self.fixedNow = now
        self.maxEvents = maxEvents
        self.readOnly = readOnly
        self.onOpen = onOpen
        self.onCommit = onCommit
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.eventCalendar }
    private var t: MetalColorwayTokens { colorway.tokens }
    private var hours: Int { dayEnd - dayStart }
    private var chipShape: RoundedRectangle { RoundedRectangle(cornerRadius: recipe.points("chip.radius"), style: .continuous) }

    public var body: some View {
        VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            head
            Group {
                if view == .month { month } else { grid }
            }
            .metalObjectRecipe(MetalRecipes.well, part: "self", state: "field",
                               in: RoundedRectangle(cornerRadius: recipe.points("self.radius"), style: .continuous))
            .clipShape(RoundedRectangle(cornerRadius: recipe.points("self.radius"), style: .continuous))
        }
        .accessibilityElement(children: .contain)
        .onChange(of: focus) { _, f in if editing != nil, f != held { keepKeys() } }
    }

    // MARK: dates

    private var shown: [Date] {
        let d = cal.startOfDay(for: date)
        switch view {
        case .month:
            let first = cal.date(from: cal.dateComponents([.year, .month], from: d)) ?? d
            let s = weekStart(first)
            return (0..<42).map { add($0, s) }
        case .week:
            let s = weekStart(d)
            return (0..<7).map { add($0, s) }
        case .day:
            return [d]
        }
    }

    private func weekStart(_ d: Date) -> Date {
        let wd = cal.component(.weekday, from: d)
        return add(-((wd - cal.firstWeekday + 7) % 7), cal.startOfDay(for: d))
    }
    private func add(_ n: Int, _ d: Date) -> Date { cal.date(byAdding: .day, value: n, to: d) ?? d }
    private func minutes(_ d: Date) -> Int { cal.component(.hour, from: d) * 60 + cal.component(.minute, from: d) }
    private func at(_ day: Date, _ m: Int) -> Date { cal.date(byAdding: .minute, value: m, to: cal.startOfDay(for: day)) ?? day }
    private func span(_ e: Event) -> (Date, Date) {
        let a = cal.startOfDay(for: e.start)
        let b = cal.startOfDay(for: e.allDay ? e.end : e.end.addingTimeInterval(-1))
        return (a, max(a, b))
    }
    private func isBar(_ e: Event) -> Bool { e.allDay || span(e).0 != span(e).1 }
    private func now(_ clock: Date) -> Date { fixedNow ?? clock }

    private var shownEvents: [Event] {
        guard let draft else { return events }
        return events.map { $0.id == draft.id ? draft : $0 }
    }

    // MARK: words

    private func time(_ d: Date) -> String { d.formatted(.dateTime.hour().minute().locale(locale)) }
    private func when(_ e: Event) -> String {
        let day = Date.FormatStyle.dateTime.weekday(.wide).day().month(.wide).locale(locale)
        if e.allDay {
            let (a, b) = span(e)
            return a == b ? "\(a.formatted(day)), all day" : "\(a.formatted(day)) – \(b.formatted(day)), all day"
        }
        return "\(e.start.formatted(day)), \(time(e.start)) – \(time(e.end))"
    }
    private var title: String {
        let days = shown
        switch view {
        case .month: return date.formatted(.dateTime.month(.wide).year().locale(locale))
        case .day: return date.formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(locale))
        case .week:
            let a = days.first ?? date, b = days.last ?? date
            return "\(a.formatted(.dateTime.day().month(.abbreviated).locale(locale))) – \(b.formatted(.dateTime.day().month(.abbreviated).year().locale(locale)))"
        }
    }

    private func say(_ text: String) {
        #if os(macOS)
        NSAccessibility.post(element: NSApp.mainWindow as Any, notification: .announcementRequested,
                             userInfo: [.announcement: text, .priority: NSAccessibilityPriorityLevel.medium.rawValue])
        #else
        UIAccessibility.post(notification: .announcement, argument: text)
        #endif
    }

    private func tick() {
        #if os(macOS)
        NSHapticFeedbackManager.defaultPerformer.perform(.alignment, performanceTime: .now)
        #endif
    }

    // MARK: head

    private var head: some View {
        HStack(spacing: recipe.points("head.gap")) {
            stepKey(-1)
            stepKey(1)
            MetalButton("Today", size: .compact) { date = fixedNow ?? Date() }
            Text(title)
                .font(.metal(MetalType.title))
                .foregroundColor(t.ink.color)
                .lineLimit(1)
                .contentTransition(.numericText())
                .metalAnimation(.settle, value: title)
            Spacer(minLength: .zero)
            MetalSwitcher("View", selection: $view, options: MetalEventCalendarView.allCases.map { (value: $0, title: $0.title) })
        }
        .frame(minHeight: recipe.points("head.height"))
    }

    private func stepKey(_ n: Int) -> some View {
        Button {
            switch view {
            case .month: date = cal.date(byAdding: .month, value: n, to: date) ?? date
            case .week: date = add(7 * n, date)
            case .day: date = add(n, date)
            }
        } label: {
            MetalIcon(.chevron, size: MetalRecipes.calendar.points("step.glyph"))
                .rotationEffect(.degrees(n < 0 ? 90 : 270))
                .flipsForRightToLeftLayoutDirection(true)
        }
        .buttonStyle(MetalEventCalendarStep())
        .accessibilityLabel("\(n < 0 ? "Previous" : "Next") \(view.rawValue)")
    }

    // MARK: the days by hours

    private var grid: some View {
        let days = shown
        let gutter = recipe.points("gutter.width")
        let hourH = recipe.points("hour.height")
        return VStack(spacing: .zero) {
            HStack(spacing: .zero) {
                Color.clear.frame(width: gutter)
                ForEach(days, id: \.self) { d in dayHead(d) }
            }
            .frame(height: recipe.points("column.head"))
            hairline
            HStack(alignment: .top, spacing: .zero) {
                Text("All day")
                    .font(.metal(MetalType.meta))
                    .foregroundColor(t.ink3.color)
                    .frame(width: gutter - recipe.points("gutter.pad"), alignment: .trailing)
                    .frame(width: gutter, alignment: .leading)
                lane(days)
            }
            hairline
            ScrollViewReader { proxy in
                ScrollView(.vertical) {
                    hoursBody(days, gutter: gutter, hourH: hourH)
                        .frame(height: Double(hours) * hourH)
                }
                .onAppear { proxy.scrollTo("now", anchor: .center) }
            }
        }
    }

    private func dayHead(_ d: Date) -> some View {
        let today = cal.isDate(d, inSameDayAs: now(Date()))
        let dot = MetalRecipes.calendar.points("today.size")
        return Button { date = d; view = .day } label: {
            HStack(spacing: recipe.points("chip.pad")) {
                Text(d.formatted(.dateTime.weekday(.abbreviated).locale(locale))).font(.metal(MetalType.meta)).foregroundColor(t.ink3.color)
                if today { Circle().fill(MetalShared.ledGreen.gradient(diameter: dot)).frame(width: dot, height: dot) }
                Text(d.formatted(.dateTime.day().locale(locale))).font(.metal(MetalType.ui)).monospacedDigit().foregroundColor(t.ink.color)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(d.formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(locale)))
    }

    private var hairline: some View {
        Color.clear
            .frame(height: MetalRecipes.rule.points("self.thickness"))
            .metalObjectRecipe(MetalRecipes.rule, part: "self", in: Rectangle())
    }
    private var vline: some View {
        Color.clear
            .frame(width: MetalRecipes.rule.points("self.thickness"))
            .metalObjectRecipe(MetalRecipes.rule, part: "self", in: Rectangle())
    }

    private func lane(_ days: [Date]) -> some View {
        let laid = bars(days)
        let row = recipe.points("lane.row"), gap = recipe.points("lane.gap"), pad = recipe.points("lane.pad")
        let rows = max(1, laid.rows)
        return GeometryReader { geo in
            let w = geo.size.width / Double(days.count)
            ZStack(alignment: .topLeading) {
                ForEach(laid.list, id: \.event.id) { b in
                    chip(b.event, compact: true, timed: false)
                        .frame(width: w * (Double(b.b - b.a) + .one) - gap - gap, height: row)
                        .offset(x: w * Double(b.a) + gap, y: pad + Double(b.row) * (row + gap))
                }
            }
        }
        .frame(height: Double(rows) * (row + gap) - gap + pad + pad)
    }

    private func hoursBody(_ days: [Date], gutter: Double, hourH: Double) -> some View {
        GeometryReader { geo in
            let w = (geo.size.width - gutter) / Double(days.count)
            ZStack(alignment: .topLeading) {
                ForEach(0..<hours, id: \.self) { h in
                    hairline.frame(width: geo.size.width).offset(y: Double(h) * hourH)
                    if h > .zero {
                        Text(at(date, (dayStart + h) * 60).formatted(.dateTime.hour().locale(locale)))
                            .font(.metal(MetalType.meta)).monospacedDigit()
                            .foregroundColor(t.ink3.color)
                            .frame(width: gutter - recipe.points("gutter.pad"), alignment: .trailing)
                            .offset(y: Double(h) * hourH - hourH / 4)
                    }
                }
                ForEach(Array(days.enumerated()), id: \.offset) { i, _ in
                    vline.frame(height: geo.size.height).offset(x: gutter + Double(i) * w)
                }
                nowLine(days, gutter: gutter, w: w, hourH: hourH)
                ForEach(timed(days), id: \.event.id) { p in
                    let gap = recipe.points("chip.gap")
                    let len = Double(p.end - p.start) / 60
                    chip(p.event, compact: p.end - p.start < 45, timed: true)
                        .frame(width: w / Double(p.cols) - gap - gap,
                               height: max(len * hourH - gap - gap, recipe.points("chip.min")))
                        .offset(x: gutter + (Double(p.day) + Double(p.col) / Double(p.cols)) * w + gap,
                                y: Double(p.start - dayStart * 60) / 60 * hourH + gap)
                        .gesture(drag(p.event, resize: false, days: days, gutter: gutter, w: w, hourH: hourH))
                }
            }
            .coordinateSpace(name: MetalEventCalendarSpace.name)
        }
    }

    @ViewBuilder
    private func nowLine(_ days: [Date], gutter: Double, w: Double, hourH: Double) -> some View {
        if fixedNow != nil || scenePhase != .active {
            nowMark(now(Date()), days, gutter: gutter, w: w, hourH: hourH)
        } else {
            TimelineView(.everyMinute) { ctx in nowMark(ctx.date, days, gutter: gutter, w: w, hourH: hourH) }
        }
    }

    @ViewBuilder
    private func nowMark(_ n: Date, _ days: [Date], gutter: Double, w: Double, hourH: Double) -> some View {
        let at = Double(minutes(n) - dayStart * 60) / 60
        if let i = days.firstIndex(where: { cal.isDate($0, inSameDayAs: n) }), at >= .zero, at <= Double(hours) {
            let line = recipe.points("now.line"), dot = recipe.points("now.dot")
            let ink = (recipe.color("now.color", colorway: MetalRecipeColorway(colorway)) ?? MetalShared.greenDeep).color
            ZStack(alignment: .leading) {
                Rectangle().fill(ink).frame(width: w, height: line)
                Circle().fill(MetalShared.ledGreen.gradient(diameter: dot)).frame(width: dot, height: dot).offset(x: -dot / 2)
            }
            .offset(x: gutter + Double(i) * w, y: at * hourH - dot / 2)
            .allowsHitTesting(false)
            .id("now")
            .accessibilityHidden(true)
        }
    }

    // MARK: the month

    private var month: some View {
        let days = shown
        let weeks = stride(from: 0, to: days.count, by: 7).map { Array(days[$0..<min($0 + 7, days.count)]) }
        return VStack(spacing: .zero) {
            HStack(spacing: .zero) {
                ForEach(weeks.first ?? [], id: \.self) { d in
                    Text(d.formatted(.dateTime.weekday(.abbreviated).locale(locale)))
                        .font(.metal(MetalType.meta)).foregroundColor(t.ink3.color)
                        .frame(maxWidth: .infinity)
                }
            }
            .frame(height: recipe.points("month.number"))
            ForEach(weeks, id: \.first) { week in
                hairline
                monthWeek(week)
            }
        }
    }

    private func monthWeek(_ week: [Date]) -> some View {
        let laid = bars(week)
        let row = recipe.points("lane.row"), gap = recipe.points("lane.gap"), num = recipe.points("month.number")
        var used = Array(repeating: Set<Int>(), count: week.count)
        var hidden = Array(repeating: 0, count: week.count)
        for b in laid.list {
            for i in b.a...b.b { if b.row < maxEvents { used[i].insert(b.row) } else { hidden[i] += 1 } }
        }
        var singles: [(event: Event, day: Int, slot: Int)] = []
        for (i, d) in week.enumerated() {
            var slot = 0
            for e in shownEvents.filter({ !isBar($0) && cal.isDate($0.start, inSameDayAs: d) }).sorted(by: { $0.start < $1.start }) {
                while used[i].contains(slot) { slot += 1 }
                if slot >= maxEvents { hidden[i] += 1; continue }
                singles.append((e, i, slot))
                slot += 1
            }
        }
        let height = num + Double(maxEvents) * (row + gap) + recipe.points("month.more") + recipe.points("lane.pad")
        let inMonth = cal.component(.month, from: date)
        return GeometryReader { geo in
            let w = geo.size.width / Double(week.count)
            ZStack(alignment: .topLeading) {
                ForEach(Array(week.enumerated()), id: \.offset) { i, d in
                    if i > .zero { vline.frame(height: height).offset(x: Double(i) * w) }
                    Button { date = d; view = .day } label: {
                        Text(d.formatted(.dateTime.day().locale(locale)))
                            .font(.metal(MetalType.ui)).monospacedDigit()
                            .foregroundColor(cal.component(.month, from: d) == inMonth ? t.ink.color : t.ink3.color)
                            .padding(.horizontal, recipe.points("chip.pad"))
                            .frame(height: num)
                    }
                    .buttonStyle(.plain)
                    .offset(x: Double(i) * w + recipe.points("chip.pad"))
                    .accessibilityLabel(d.formatted(.dateTime.weekday(.wide).day().month(.wide).year().locale(locale)))
                    if hidden[i] > .zero {
                        Button("+\(hidden[i]) more") { date = d; view = .day }
                            .buttonStyle(.plain)
                            .font(.metal(MetalType.meta))
                            .foregroundColor(t.ink2.color)
                            .offset(x: Double(i) * w + recipe.points("chip.pad") * 2, y: num + Double(maxEvents) * (row + gap))
                    }
                }
                ForEach(laid.list.filter { $0.row < maxEvents }, id: \.event.id) { b in
                    chip(b.event, compact: true, timed: false)
                        .frame(width: w * (Double(b.b - b.a) + .one) - gap - gap, height: row)
                        .offset(x: w * Double(b.a) + gap, y: num + Double(b.row) * (row + gap))
                }
                ForEach(singles, id: \.event.id) { s in
                    chip(s.event, compact: true, timed: false)
                        .frame(width: w - gap - gap, height: row)
                        .offset(x: w * Double(s.day) + gap, y: num + Double(s.slot) * (row + gap))
                }
            }
        }
        .frame(height: height)
    }

    // MARK: layout

    private struct Bar { let event: Event; let a: Int; let b: Int; var row: Int }

    private func bars(_ days: [Date]) -> (list: [Bar], rows: Int) {
        guard let first = days.first, let last = days.last else { return ([], 0) }
        var list: [Bar] = shownEvents.filter(isBar).compactMap { e in
            let (s, f) = span(e)
            guard f >= first, s <= last else { return nil }
            let a = s < first ? 0 : (days.firstIndex { $0 >= s } ?? 0)
            let b = f > last ? days.count - 1 : max(a, (days.lastIndex { $0 <= f } ?? a))
            return Bar(event: e, a: a, b: b, row: 0)
        }
        list.sort { $0.a != $1.a ? $0.a < $1.a : ($0.b - $0.a) > ($1.b - $1.a) }
        var ends: [Int] = []
        for i in list.indices {
            if let r = ends.firstIndex(where: { $0 < list[i].a }) { list[i].row = r; ends[r] = list[i].b }
            else { list[i].row = ends.count; ends.append(list[i].b) }
        }
        return (list, ends.count)
    }

    private struct Placed { let event: Event; let day: Int; let start: Int; let end: Int; var col = 0; var cols = 1 }

    /// Timed events in the hours, side by side where they overlap (a short one counts half an hour).
    private func timed(_ days: [Date]) -> [Placed] {
        var out: [Placed] = []
        for (i, d) in days.enumerated() {
            var list = shownEvents.filter { !isBar($0) && cal.isDate($0.start, inSameDayAs: d) }.compactMap { e -> Placed? in
                let s = max(minutes(e.start), dayStart * 60)
                let m = minutes(e.end)
                let f = min(m == .zero ? 1440 : m, dayEnd * 60)
                return f > s ? Placed(event: e, day: i, start: s, end: f) : nil
            }
            list.sort { $0.start != $1.start ? $0.start < $1.start : $0.end > $1.end }
            var cluster: [Int] = [], ends: [Int] = [], reach = Int.min
            func flush() { for c in cluster { list[c].cols = ends.count }; cluster = []; ends = [] }
            for j in list.indices {
                let s = list[j].start, e = max(list[j].end, s + 30)
                if s >= reach { flush(); reach = Int.min }
                if let c = ends.firstIndex(where: { $0 <= s }) { list[j].col = c; ends[c] = e } else { list[j].col = ends.count; ends.append(e) }
                cluster.append(j)
                reach = max(reach, e)
            }
            flush()
            out += list
        }
        return out
    }

    // MARK: an event

    private func frozen(_ e: Event) -> Bool { e.disabled || readOnly || busy }

    private func chip(_ e: Event, compact: Bool, timed: Bool) -> some View {
        let lifted = held == e.id
        let pad = recipe.points("chip.pad"), stripe = recipe.points("chip.stripe")
        return VStack(alignment: .leading, spacing: .zero) {
            if !compact && timed {
                Text("\(time(e.start)) – \(time(e.end))").font(.metal(MetalType.meta)).monospacedDigit().foregroundColor(t.ink2.color)
            }
            HStack(spacing: pad) {
                if compact && !e.allDay && !isBar(e) {
                    Text(time(e.start)).font(.metal(MetalType.meta)).monospacedDigit().foregroundColor(t.ink2.color)
                }
                Text(e.title).font(.metal(MetalType.ui)).foregroundColor(t.ink.color)
            }
            Spacer(minLength: .zero)
        }
        .lineLimit(1)
        .padding(.vertical, compact ? .zero : pad)
        .padding(.leading, pad + stripe)
        .padding(.trailing, pad)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: compact ? .leading : .topLeading)
        .background(alignment: .leading) {
            if let c = e.color { Rectangle().fill(c.color).frame(width: stripe) }
        }
        .background { Color.clear.metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: chipShape) }
        .background {
            Color.clear
                .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: chipShape)
                .opacity(lifted ? .one : .zero)
                .metalAnimation(lifted ? .surface : .release, value: lifted)
        }
        .clipShape(chipShape)
        .overlay(alignment: .bottom) {
            if timed && !frozen(e) {
                Color.clear
                    .frame(height: recipe.points("grip.height"))
                    .contentShape(Rectangle())
                    .highPriorityGesture(resizeGesture(e))
                    .accessibilityHidden(true)
            }
        }
        .scaleEffect(lifted && !reduceMotion ? MetalRecipes.sortable.scalar("lift.scale") : .one)
        .zIndex(lifted ? .one : .zero)
        .keyframeAnimator(initialValue: Double.zero, trigger: refusals[e.id, default: .zero]) { v, nudge in
            v.offset(x: nudge)
        } keyframes: { _ in
            KeyframeTrack {
                LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                               spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
            }
        }
        .contentShape(chipShape)
        .onTapGesture { onOpen?(e) }
        .focusable()
        .focused($focus, equals: e.id)
        .onKeyPress(phases: .down) { key(e, timed: timed, $0) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(e.title), \(when(e))")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { onOpen?(e) }
        .accessibilityAction(named: "Later") { nudge(e, minutes: snap, timed: timed, keep: true) }
        .accessibilityAction(named: "Earlier") { nudge(e, minutes: -snap, timed: timed, keep: true) }
        .accessibilityAction(named: "Next day") { nudge(e, days: 1, keep: true) }
        .accessibilityAction(named: "Previous day") { nudge(e, days: -1, keep: true) }
        .accessibilityAction(named: "Longer") { nudge(e, end: snap, keep: true) }
        .accessibilityAction(named: "Shorter") { nudge(e, end: -snap, keep: true) }
    }

    // MARK: moving

    private func refuse(_ e: Event) {
        refusals[e.id, default: .zero] += 1
        if !busy { say("\(e.title) can’t be moved.") }
    }

    private func lift(_ e: Event) -> Bool {
        guard held == nil else { return held == e.id }
        if frozen(e) { refuse(e); return false }
        withMetalAnimation(.surface, reduceMotion: reduceMotion) { held = e.id }
        tick()
        return true
    }

    private func setDraft(_ next: Event) {
        guard next != (draft ?? events.first { $0.id == next.id }) else { return }
        if draft != nil { tick() }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { draft = next }
    }

    private func drag(_ e: Event, resize: Bool, days: [Date], gutter: Double, w: Double, hourH: Double) -> some Gesture {
        DragGesture(minimumDistance: MetalRecipes.sortable.points("self.threshold"), coordinateSpace: .named(MetalEventCalendarSpace.name))
            .onChanged { v in
                guard let base = events.first(where: { $0.id == e.id }) else { return }
                if held == nil {
                    guard lift(base) else { return }
                    grabMinute = dayStart * 60 + Int(v.startLocation.y / hourH * 60) - minutes(base.start)
                }
                let i = min(days.count - 1, max(0, Int((v.location.x - gutter) / w)))
                let minute = dayStart * 60 + Int(v.location.y / hourH * 60)
                let len = Int(base.end.timeIntervalSince(base.start) / 60)
                let s = max(dayStart * 60, min(dayEnd * 60 - len, Int((Double(minute - grabMinute) / Double(snap)).rounded()) * snap))
                var next = base
                next.start = at(days[i], s)
                next.end = next.start.addingTimeInterval(Double(len * 60))
                setDraft(next)
            }
            .onEnded { _ in drop(keep: true) }
    }

    private func resizeGesture(_ e: Event) -> some Gesture {
        DragGesture(minimumDistance: .zero, coordinateSpace: .named(MetalEventCalendarSpace.name))
            .onChanged { v in
                guard let base = events.first(where: { $0.id == e.id }), held == e.id || lift(base) else { return }
                let hourH = recipe.points("hour.height")
                let minute = dayStart * 60 + Int(v.location.y / hourH * 60)
                let end = min(dayEnd * 60, max(minutes(base.start) + snap, Int((Double(minute) / Double(snap)).rounded()) * snap))
                var next = base
                next.end = at(base.start, end)
                setDraft(next)
            }
            .onEnded { _ in drop(keep: true) }
    }

    private func drop(keep: Bool) {
        let next = draft
        withMetalAnimation(.release, reduceMotion: reduceMotion) {
            held = nil
            draft = nil
        }
        guard keep, let next else { return }
        land(next, previous: events)
    }

    /// Lands a change: the binding hears it once, and a refused save gives the previous events back.
    private func land(_ next: Event, previous: [Event]) {
        guard let was = previous.first(where: { $0.id == next.id }), was.start != next.start || was.end != next.end else { return }
        let after = previous.map { $0.id == next.id ? next : $0 }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { events = after }
        say("\(next.title), \(when(next)).")
        guard let onCommit else { return }
        busy = true
        Task { @MainActor in
            do { try await onCommit(after, previous) } catch {
                withMetalAnimation(.settle, reduceMotion: reduceMotion) { events = previous }
                say("Couldn’t save. \(was.title) is back at \(when(was)).")
            }
            busy = false
        }
    }

    /// One step by keys or VoiceOver: by minutes, by days, or the end by minutes. Returns whether it moved.
    @discardableResult
    private func nudge(_ e: Event, minutes by: Int = .zero, timed: Bool = true, days: Int = .zero, end: Int = .zero, keep: Bool = false) -> Bool {
        guard let base = draft?.id == e.id ? draft : events.first(where: { $0.id == e.id }) else { return false }
        if frozen(base) { refuse(base); return false }
        var next = base
        if days != .zero || (!timed && by != .zero) {
            let n = days != .zero ? days : (by > .zero ? 7 : -7)
            next.start = add(n, base.start)
            next.end = add(n, base.end)
        } else if end != .zero {
            let m = minutes(base.end) + end
            guard m >= minutes(base.start) + snap, m <= dayEnd * 60, cal.isDate(base.start, inSameDayAs: base.end) else { return false }
            next.end = at(base.start, m)
        } else {
            let s = minutes(base.start) + by
            let len = Int(base.end.timeIntervalSince(base.start) / 60)
            guard s >= dayStart * 60, s + len <= dayEnd * 60 else { return false }
            next.start = at(base.start, s)
            next.end = next.start.addingTimeInterval(Double(len * 60))
        }
        guard shown.contains(where: { cal.isDate($0, inSameDayAs: next.start) }) else { return false }
        if keep { land(next, previous: events); return true }
        if editing == nil { editing = events }
        held = e.id
        setDraft(next)
        say("\(next.title), \(when(next)).")
        return true
    }

    /// Keys' steps are one move: kept on Return or when focus leaves the event.
    private func keepKeys() {
        guard let previous = editing else { return }
        let next = draft
        editing = nil
        held = nil
        draft = nil
        if let next { land(next, previous: previous) }
    }

    private func key(_ e: Event, timed: Bool, _ press: KeyPress) -> KeyPress.Result {
        let shift = press.modifiers.contains(.shift)
        switch press.key {
        case .return:
            if editing != nil { keepKeys() } else { onOpen?(e) }
        case .escape:
            guard editing != nil else { return .ignored }
            editing = nil
            withMetalAnimation(.settle, reduceMotion: reduceMotion) {
                held = nil
                draft = nil
            }
            say("Put \(e.title) back, \(when(events.first { $0.id == e.id } ?? e)).")
        case .upArrow: if shift && timed { nudge(e, end: -snap) } else { nudge(e, minutes: -snap, timed: timed) }
        case .downArrow: if shift && timed { nudge(e, end: snap) } else { nudge(e, minutes: snap, timed: timed) }
        case .leftArrow: nudge(e, days: -1)
        case .rightArrow: nudge(e, days: 1)
        default: return .ignored
        }
        return .handled
    }
}

/// A step key: the compact cap, as wide as the head is tall, with the set's chevron (Calendar's).
private struct MetalEventCalendarStep: ButtonStyle {
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        let button = MetalRecipes.button
        let down = configuration.isPressed && isEnabled
        let shape = Capsule(style: .continuous)
        return configuration.label
            .foregroundColor(colorway.tokens.ink2.color)
            .frame(width: MetalRecipes.eventCalendar.points("head.height"), height: button.points("compact.height"))
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(button, part: "compact", in: shape).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(button, part: "compact", state: "pressed", in: shape).opacity(down ? .one : .zero)
                }
            }
            .offset(y: down && !reduceMotion ? button.points("self.travel") : .zero)
            .animation(down ? nil : MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation, value: down)
    }
}
