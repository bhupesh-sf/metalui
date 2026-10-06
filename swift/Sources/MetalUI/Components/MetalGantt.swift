import SwiftUI

// MetalGantt: a plan laid out against dates (gantt.agent.md). Tasks down, days across: a two-tier header
// (months over days or weeks, years over months) in the readout type, a name column on the opaque frost
// with Table's row height and rule, a hairline at each lower unit, and today's line with NOW. A task is a
// pill on the small raised plate with Progress's well inside; a milestone the same plate as a diamond.
// Held, a bar rises (Sortable's lift.scale, the raised plate's shadow) and follows the hand; its slot,
// snapped to whole days, is the well's track; it lands on the object spring. Its ends resize a day at a
// time. Keys (macOS): ← → a day, Shift its end, Option Shift its start, ↑ ↓ the next bar; a burst
// commits after self.commit or when focus leaves; Escape undoes it. VoiceOver: adjust a day later or
// earlier, Longer, Shorter. A rejected onCommit puts the dates back.
// Gaps against the web (docs/sheets/gantt.md): the header scrolls with the rows (not sticky), and the
// name column stays put while the dates scroll sideways, but scrolls with the rows.

public enum MetalGanttScale: String, Sendable { case day, week, month }

/// One task of a `MetalGantt`: a bar from `start` to `end` (both days included), or a milestone on `start`.
public struct MetalGanttTask: Identifiable, Equatable, Sendable {
    public let id: String
    public var name: String
    public var start: Date
    public var end: Date
    /// How much is done, 0 to 100.
    public var progress: Double?
    public var milestone: Bool
    /// It can't be moved or resized.
    public var locked: Bool

    public init(id: String, _ name: String, start: Date, end: Date? = nil, progress: Double? = nil, milestone: Bool = false, locked: Bool = false) {
        self.id = id
        self.name = name
        self.start = start
        self.end = end ?? start
        self.progress = progress
        self.milestone = milestone
        self.locked = locked
    }
}

private enum MetalGanttMode { case move, start, end }

private struct MetalGanttUnit: Identifiable {
    let at: Int
    let span: Int
    let label: String
    var id: Int { at }
}

public struct MetalGantt: View {
    public typealias Task = MetalGanttTask

    @Binding private var tasks: [Task]
    private let label: String
    private let scale: MetalGanttScale
    private let today: Date
    private let from: Date?
    private let to: Date?
    private let nameLabel: String
    private let disabled: Bool
    private let onCommit: (([Task], [Task]) async throws -> Void)?

    @State private var held: String?
    @State private var mode: MetalGanttMode = .move
    @State private var base: Task?
    @State private var previous: [Task] = []
    @State private var follow: CGFloat = .zero
    @State private var busy = false
    @State private var refusals: [String: Int] = [:]
    @State private var burst: [Task]?
    @State private var burstTimer: _Concurrency.Task<Void, Never>?
    @FocusState private var focus: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalColorway) private var colorway

    /// `label` names the plan ("Autumn catalogue"). Dates are calendar days: the time is ignored.
    public init(_ tasks: Binding<[Task]>, label: String, scale: MetalGanttScale = .week, today: Date = Date(),
                from: Date? = nil, to: Date? = nil, nameLabel: String = "Task", disabled: Bool = false,
                onCommit: (([Task], [Task]) async throws -> Void)? = nil) {
        self._tasks = tasks
        self.label = label
        self.scale = scale
        self.today = today
        self.from = from
        self.to = to
        self.nameLabel = nameLabel
        self.disabled = disabled
        self.onCommit = onCommit
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.gantt }
    private var calendar: Calendar { Calendar.current }
    private var day: Double { recipe.points("scale.\(scale.rawValue)") }
    private var head: Double { MetalRecipes.table.points("head.height") }
    private var row: Double { MetalRecipes.table.points("row.height") }

    // MARK: dates

    private func add(_ d: Date, _ n: Int) -> Date { calendar.date(byAdding: .day, value: n, to: calendar.startOfDay(for: d)) ?? d }
    private func between(_ a: Date, _ b: Date) -> Int {
        calendar.dateComponents([.day], from: calendar.startOfDay(for: a), to: calendar.startOfDay(for: b)).day ?? .zero
    }
    private func last(_ t: Task) -> Date { t.milestone ? t.start : t.end }

    /// A unit beyond the tasks either side, on unit starts.
    private var range: (from: Date, days: Int) {
        let now = calendar.startOfDay(for: Date())
        let lo = tasks.map(\.start).min() ?? now
        let hi = tasks.map(last).max() ?? add(now, 28)
        var a: Date, b: Date
        switch scale {
        case .day:
            a = add(lo, -2); b = add(hi, 2)
        case .week:
            let week = calendar.dateInterval(of: .weekOfYear, for: lo)?.start ?? lo
            a = add(week, -7)
            b = add(calendar.dateInterval(of: .weekOfYear, for: hi)?.end ?? hi, 6)
        case .month:
            let m = calendar.dateInterval(of: .month, for: lo)?.start ?? lo
            a = calendar.date(byAdding: .month, value: -1, to: m) ?? m
            let end = calendar.dateInterval(of: .month, for: hi)?.end ?? hi
            b = add(calendar.date(byAdding: .month, value: 1, to: end) ?? end, -1)
        }
        if let from { a = calendar.startOfDay(for: from) }
        if let to { b = to }
        return (a, between(a, b) + 1)
    }

    private func units(_ start: Date, _ days: Int, key: (Date, Int) -> Int, text: (Date) -> String) -> [MetalGanttUnit] {
        var out: [MetalGanttUnit] = []
        var prior: Int?
        for i in .zero..<days {
            let d = add(start, i)
            let k = key(d, i)
            if k == prior, let u = out.popLast() { out.append(MetalGanttUnit(at: u.at, span: u.span + 1, label: u.label)) }
            else { out.append(MetalGanttUnit(at: i, span: 1, label: text(d))) }
            prior = k
        }
        return out
    }

    private func tiers(_ start: Date, _ days: Int) -> [[MetalGanttUnit]] {
        let ym = { (d: Date) in self.calendar.component(.year, from: d) * 12 + self.calendar.component(.month, from: d) }
        let months = units(start, days, key: { d, _ in ym(d) }, text: { $0.formatted(.dateTime.month(.wide).year()) })
        switch scale {
        case .day:
            return [months, units(start, days, key: { _, i in i }, text: { "\(self.calendar.component(.day, from: $0))" })]
        case .week:
            return [months, units(start, days, key: { _, i in i / 7 }, text: { $0.formatted(.dateTime.month(.abbreviated).day()) })]
        case .month:
            return [units(start, days, key: { d, _ in self.calendar.component(.year, from: d) }, text: { $0.formatted(.dateTime.year()) }),
                    units(start, days, key: { d, _ in ym(d) }, text: { $0.formatted(.dateTime.month(.abbreviated)) })]
        }
    }

    private func date(_ d: Date) -> String { d.formatted(.dateTime.month(.abbreviated).day()) }
    private func when(_ t: Task) -> String { t.milestone ? date(t.start) : "\(date(t.start)) to \(date(t.end))" }
    private func spoken(_ t: Task) -> String {
        let done = t.progress.map { ", \(Int($0.rounded()))% done" } ?? ""
        return "\(t.name), \(t.milestone ? "milestone, " : "")\(when(t))\(t.milestone ? "" : done)"
    }

    // MARK: body

    public var body: some View {
        let r = range
        let width = Double(r.days) * day
        let lanes = tiers(r.from, r.days)
        let t = colorway.tokens
        ScrollView(.vertical) {
            HStack(alignment: .top, spacing: .zero) {
                VStack(alignment: .leading, spacing: .zero) {
                    Text(nameLabel.uppercased())
                        .font(.metal(MetalType.label))
                        .tracking(MetalType.label.trackingPoints)
                        .foregroundColor(t.ink2.color)
                        .frame(maxWidth: .infinity, minHeight: head, maxHeight: head, alignment: .leading)
                        .padding(.top, head)
                    ForEach(tasks) { task in
                        Text(task.name)
                            .font(.metal(MetalType.ui))
                            .foregroundColor(t.ink.color)
                            .lineLimit(1)
                            .frame(maxWidth: .infinity, minHeight: row, maxHeight: row, alignment: .leading)
                            .overlay(alignment: .bottom) { t.rule.color.frame(height: MetalRecipes.rule.points("self.thickness")) }
                    }
                }
                .padding(.horizontal, MetalRecipes.table.points("row.pad-x"))
                .frame(width: recipe.points("self.side"))
                .background(t.frostOpaque.color)
                .accessibilityHidden(true)
                ScrollView(.horizontal) {
                    VStack(alignment: .leading, spacing: .zero) {
                        header(lanes)
                        ZStack(alignment: .topLeading) {
                            ForEach(lanes.last?.dropFirst() ?? []) { u in
                                t.rule.color.frame(width: MetalRecipes.rule.points("self.thickness")).offset(x: Double(u.at) * day)
                            }
                            VStack(spacing: .zero) {
                                ForEach(tasks) { task in lane(task, from: r.from, width: width) }
                            }
                            nowLine(r.from, days: r.days)
                        }
                    }
                    .frame(width: width, alignment: .leading)
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
        .onChange(of: focus) { _, _ in flush() }
    }

    private func header(_ lanes: [[MetalGanttUnit]]) -> some View {
        let t = colorway.tokens
        return VStack(alignment: .leading, spacing: .zero) {
            ForEach(Array(lanes.enumerated()), id: \.offset) { i, tier in
                ZStack(alignment: .topLeading) {
                    ForEach(tier) { u in
                        Text(u.label)
                            .font(.metal(MetalType.readout))
                            .monospacedDigit()
                            .foregroundColor(i == .zero ? t.ink2.color : t.ink3.color)
                            .lineLimit(1)
                            .padding(.horizontal, recipe.points("unit.pad"))
                            .frame(width: Double(u.span) * day, height: head, alignment: .leading)
                            .clipped()
                            .overlay(alignment: .leading) { t.rule.color.frame(width: MetalRecipes.rule.points("self.thickness")) }
                            .offset(x: Double(u.at) * day)
                    }
                }
                .frame(height: head, alignment: .topLeading)
            }
        }
        .background(t.frostOpaque.color)
        .overlay(alignment: .bottom) { t.rule.color.frame(height: MetalRecipes.rule.points("self.thickness")) }
        .accessibilityHidden(true)
    }

    @ViewBuilder private func nowLine(_ start: Date, days: Int) -> some View {
        let at = Double(between(start, today)) + today.timeIntervalSince(calendar.startOfDay(for: today)) / 86_400
        if at >= .zero, at <= Double(days) {
            let t = colorway.tokens
            t.ink3.color
                .frame(width: MetalRecipes.rule.points("self.thickness"), height: row * Double(tasks.count))
                .overlay(alignment: .top) {
                    Text("Now".uppercased())
                        .font(.metal(MetalType.readout))
                        .foregroundColor(t.ink2.color)
                        .padding(.horizontal, recipe.points("now.pad"))
                        .background(Capsule().fill(t.frostOpaque.color))
                        .fixedSize()
                        .padding(.top, recipe.points("now.pad"))
                }
                .offset(x: at * day)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
    }

    // MARK: a row and its bar

    private func lane(_ task: Task, from start: Date, width: Double) -> some View {
        let at = Double(between(start, task.start))
        let span = task.milestone ? 1 : between(task.start, task.end) + 1
        let size = recipe.points("milestone.size")
        let w = task.milestone ? size : max(recipe.points("bar.min"), Double(span) * day)
        let x = task.milestone ? (at + .one / 2) * day - size / 2 : at * day
        let lifted = held == task.id
        return ZStack(alignment: .leading) {
            Color.clear
            if lifted, mode == .move { slot(task, width: w).offset(x: x) }
            bar(task, width: w, lifted: lifted).offset(x: x + (lifted ? follow : .zero))
        }
        .frame(width: width, height: row)
        .overlay(alignment: .bottom) { colorway.tokens.rule.color.frame(height: MetalRecipes.rule.points("self.thickness")) }
    }

    private func slot(_ task: Task, width: Double) -> some View {
        let h = task.milestone ? width : recipe.points("bar.height")
        return Color.clear
            .metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: plateShape(task))
            .frame(width: task.milestone ? width / (Double.one + .one).squareRoot() : width, height: task.milestone ? h / (Double.one + .one).squareRoot() : h)
            .rotationEffect(task.milestone ? .degrees(45) : .zero)
            .frame(width: width, height: h)
            .allowsHitTesting(false)
    }

    private func plateShape(_ task: Task) -> RoundedRectangle {
        RoundedRectangle(cornerRadius: task.milestone ? recipe.points("milestone.corner") : recipe.points("bar.height") / 2, style: .continuous)
    }

    /// The raised plate (a pill, or a diamond), with the lift's shadow fading in over it.
    private func plate(_ task: Task, side: Double, height: Double, lifted: Bool) -> some View {
        let shape = plateShape(task)
        let raised = Color.clear
            .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: shape)
            .opacity(lifted ? .one : .zero)
            .metalAnimation(lifted ? .surface : .release, value: lifted)
        return Color.clear
            .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: shape)
            .overlay { raised }
            .frame(width: side, height: height)
            .rotationEffect(task.milestone ? .degrees(45) : .zero)
    }

    /// Its dates after its end, while held or focused.
    private func dates(_ task: Task, width: Double, shown: Bool) -> some View {
        let text = task.milestone ? date(task.start) : "\(date(task.start)) – \(date(task.end))"
        return Text(text)
            .font(.metal(MetalType.meta))
            .monospacedDigit()
            .foregroundColor(colorway.tokens.ink2.color)
            .fixedSize()
            .offset(x: width + recipe.points("dates.gap"))
            .opacity(shown ? .one : .zero)
            .metalAnimation(.settle, value: shown)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private func face(_ task: Task, width: Double, lifted: Bool) -> some View {
        let side = task.milestone ? width / (Double.one + .one).squareRoot() : width
        let height = task.milestone ? side : recipe.points("bar.height")
        let box = task.milestone ? width : height
        let fill: Double? = task.milestone ? nil : task.progress.map { min(max($0, .zero), 100) / 100 }
        return ZStack {
            plate(task, side: side, height: height, lifted: lifted)
            if let fill {
                MetalProgressWell(fill: fill, buffer: nil, state: .running)
                    .frame(height: recipe.points("bar.track"))
                    .padding(.horizontal, recipe.points("bar.inset"))
                    .allowsHitTesting(false)
            }
        }
        .frame(width: width, height: box)
        .overlay(alignment: .leading) { dates(task, width: width, shown: lifted || focus == task.id) }
    }

    private func bar(_ task: Task, width: Double, lifted: Bool) -> some View {
        let edge = recipe.points("bar.edge")
        let frozen = task.locked || disabled
        let lift = lifted && !reduceMotion ? MetalRecipes.sortable.scalar("lift.scale") : .one
        let held = face(task, width: width, lifted: lifted)
            .scaleEffect(lift)
            .metalAnimation(lifted ? .surface : .object, value: lifted)
            .zIndex(lifted ? .one : .zero)
            .modifier(MetalGanttShake(trigger: refusals[task.id, default: .zero]))
            .contentShape(Rectangle())
            .gesture(drag(task, .move))
        let gripped = held
            .overlay(alignment: .leading) { if !task.milestone { grip(task, .start, edge: edge).offset(x: -edge / 2) } }
            .overlay(alignment: .trailing) { if !task.milestone { grip(task, .end, edge: edge).offset(x: edge / 2) } }
        return gripped
            .focusable(!disabled)
        .focused($focus, equals: task.id)
        .onKeyPress(phases: .down) { key(task, $0) }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(spoken(task))
        .accessibilityAddTraits(.isButton)
        .accessibilityAdjustableAction { direction in
            guard !frozen else { return }
            step(task, .move, direction == .increment ? 1 : -1)
            flush()
        }
        .accessibilityAction(named: "Longer") { if !frozen && !task.milestone { step(task, .end, 1); flush() } }
        .accessibilityAction(named: "Shorter") { if !frozen && !task.milestone { step(task, .end, -1); flush() } }
    }

    private func grip(_ task: Task, _ end: MetalGanttMode, edge: Double) -> some View {
        Color.clear
            .frame(width: edge)
            .contentShape(Rectangle())
            #if os(macOS)
            .onHover { inside in if inside { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() } }
            #endif
            .highPriorityGesture(drag(task, end))
    }

    // MARK: moving

    private func shifted(_ t: Task, _ m: MetalGanttMode, _ n: Int) -> Task {
        var next = t
        let length = between(t.start, t.end)
        switch m {
        case _ where t.milestone:
            next.start = add(t.start, n); next.end = next.start
        case .move:
            next.start = add(t.start, n); next.end = add(t.end, n)
        case .end:
            next.end = add(t.start, max(.zero, length + n))
        case .start:
            next.start = add(t.end, -max(.zero, length - n))
        }
        return next
    }

    private func replace(_ t: Task) {
        guard let i = tasks.firstIndex(where: { $0.id == t.id }), tasks[i] != t else { return }
        tasks[i] = t
        #if os(macOS)
        NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .now)
        #endif
    }

    private func refuse(_ task: Task) {
        refusals[task.id, default: .zero] += 1
        say("\(task.name) can’t be moved.")
    }

    private func drag(_ task: Task, _ m: MetalGanttMode) -> some Gesture {
        DragGesture(minimumDistance: MetalRecipes.sortable.points("self.threshold"))
            .onChanged { value in
                if held == nil {
                    guard !busy, !disabled else { return }
                    guard !task.locked else { if base?.id != task.id { base = task; refuse(task) }; return }
                    previous = tasks
                    base = task
                    mode = task.milestone ? .move : m
                    withMetalAnimation(.surface, reduceMotion: reduceMotion) { held = task.id }
                }
                guard held == task.id, let base else { return }
                let n = Int((value.translation.width / day).rounded())
                replace(shifted(base, mode, n))
                let shown = tasks.first { $0.id == task.id } ?? base
                follow = mode == .move ? value.translation.width - Double(between(base.start, shown.start)) * day : .zero
            }
            .onEnded { _ in
                guard held == task.id else { base = nil; return }
                withMetalAnimation(.object, reduceMotion: reduceMotion) {
                    follow = .zero
                    held = nil
                }
                if let t = tasks.first(where: { $0.id == task.id }) { say("\(t.name), \(when(t)).") }
                base = nil
                commit(tasks, previous)
            }
    }

    private func step(_ task: Task, _ m: MetalGanttMode, _ n: Int) {
        guard let current = tasks.first(where: { $0.id == task.id }) else { return }
        if burst == nil { burst = tasks }
        replace(shifted(current, m, n))
        if let t = tasks.first(where: { $0.id == task.id }) { say("\(t.name), \(when(t)).") }
    }

    private func key(_ task: Task, _ press: KeyPress) -> KeyPress.Result {
        switch press.key {
        case .upArrow, .downArrow:
            guard let i = tasks.firstIndex(where: { $0.id == task.id }) else { return .ignored }
            let j = i + (press.key == .upArrow ? -1 : 1)
            if tasks.indices.contains(j) { focus = tasks[j].id }
            return .handled
        case .escape:
            guard let back = burst else { return .ignored }
            burstTimer?.cancel()
            burst = nil
            tasks = back
            if let t = back.first(where: { $0.id == task.id }) { say("\(t.name), \(when(t)).") }
            return .handled
        case .leftArrow, .rightArrow:
            guard !busy, !disabled, held == nil else { return .handled }
            guard !task.locked else { refuse(task); return .handled }
            let shift = press.modifiers.contains(.shift)
            let m: MetalGanttMode = shift ? (press.modifiers.contains(.option) ? .start : .end) : .move
            step(task, m, press.key == .rightArrow ? 1 : -1)
            burstTimer?.cancel()
            let wait = recipe.durationSeconds("self.commit")
            burstTimer = _Concurrency.Task { @MainActor in
                try? await _Concurrency.Task.sleep(for: .seconds(wait))
                if !_Concurrency.Task.isCancelled { flush() }
            }
            return .handled
        default:
            return .ignored
        }
    }

    /// Commits a burst of keys.
    private func flush() {
        burstTimer?.cancel()
        guard let back = burst else { return }
        burst = nil
        commit(tasks, back)
    }

    /// Saves a changed plan; a failure puts the dates back.
    private func commit(_ next: [Task], _ previous: [Task]) {
        guard next != previous, let onCommit else { return }
        busy = true
        _Concurrency.Task { @MainActor in
            do { try await onCommit(next, previous) } catch {
                tasks = previous
                let changed = zip(next, previous).first { $0 != $1 }?.1
                say(changed.map { "Couldn’t save. \($0.name) is back at \(when($0))." } ?? "Couldn’t save.")
            }
            busy = false
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
}

/// A locked bar shakes once on the refusal spring; under Reduce Motion it stays.
private struct MetalGanttShake: ViewModifier {
    let trigger: Int
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

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
