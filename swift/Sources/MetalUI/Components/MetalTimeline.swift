import SwiftUI

// Timeline: a record of what happened and what is planned, read top to bottom. Mirrors
// components/timeline (timeline.agent.md) from the timeline recipe, on borrowed looks:
//   done      the off lamp (the default)
//   live      the green lamp, "Live"; flickers once when an event turns live on screen
//   running   the lamp gives way to the Spinner's ring after the show delay (.metalWait), "Running"
//   waiting   the amber lamp, steady, "Waiting"
//   failed    the red lamp, "Failed"; blinks twice when an event turns failed on screen, never on appear
//   planned   the off lamp, words in ink3
//   now       where events turn from not planned to planned: a tick across the rail, NOW, and a rule
//   glyph     the glyph in the switch's sunk well; live, running, waiting and failed put their small lamp
//             on its corner
//   rail      the rule's groove down the node column, from under each node's box to the next
// Arrival: insert events inside `withMetalAnimation(.object)`; they land one nest from above.
// Reduce Motion: events fade in place; the lamps hold steady.

public enum MetalTimelineState: Sendable, Equatable { case done, live, running, waiting, failed, planned }
public enum MetalTimelineFormat: Sendable { case relative, date, time, datetime }
public enum MetalTimelineTimeSide: Sendable { case end, start }

/// One event of a `MetalTimeline`.
public struct MetalTimelineEvent: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var description: String?
    public var time: Date?
    /// How long it took, in seconds: "42 s", "1:12".
    public var duration: TimeInterval?
    public var state: MetalTimelineState
    /// A glyph in a sunk well on the rail.
    public var glyph: MetalIconName?

    public init(id: String, _ title: String, description: String? = nil, time: Date? = nil, duration: TimeInterval? = nil,
                state: MetalTimelineState = .done, glyph: MetalIconName? = nil) {
        self.id = id
        self.title = title
        self.description = description
        self.time = time
        self.duration = duration
        self.state = state
        self.glyph = glyph
    }
}

/// A record of events in order, on an engraved rail, with where things stand now.
public struct MetalTimeline: View {
    let events: [MetalTimelineEvent]
    let label: String
    let format: MetalTimelineFormat
    let now: Date
    let timeSide: MetalTimelineTimeSide
    @Environment(\.metalColorway) private var colorway

    /// `label` names the record ("Order 4312"). Relative times count from `now`; nothing ticks at rest.
    public init(_ events: [MetalTimelineEvent], label: String, format: MetalTimelineFormat = .relative, now: Date = Date(),
                timeSide: MetalTimelineTimeSide = .end) {
        self.events = events
        self.label = label
        self.format = format
        self.now = now
        self.timeSide = timeSide
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.timeline }
    private var glyphs: Bool { events.contains { $0.glyph != nil } }

    /// On top of the first event whose planned-ness differs from the one before it.
    private var nowIndex: Int? {
        events.indices.dropFirst().first { (events[$0].state == .planned) != (events[$0 - 1].state == .planned) }
    }

    public var body: some View {
        let column = recipe.points(glyphs ? "well.size" : "lamp.column")
        let box = recipe.points(glyphs ? "well.box" : "lamp.box")
        Grid(alignment: .topLeading, horizontalSpacing: recipe.points("event.gap"), verticalSpacing: .zero) {
            ForEach(Array(events.enumerated()), id: \.element.id) { i, event in
                if i == nowIndex { nowRow(column: column) }
                MetalTimelineRow(event: event, last: i == events.count - 1, column: column, box: box,
                                 format: format, now: now, timeSide: timeSide)
            }
        }
        .fixedSize(horizontal: false, vertical: true)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    /// A tick across the rail, NOW in the readout type, and an engraved rule to the end of the row.
    @ViewBuilder private func nowRow(column: Double) -> some View {
        let run = HStack(spacing: recipe.points("event.gap")) {
            ZStack {
                MetalRule(.horizontal)
                MetalRule(.vertical)
            }
            .frame(width: column)
            Text("Now").font(.metal(MetalType.readout)).textCase(.uppercase).foregroundColor(colorway.tokens.ink2.color)
            MetalRule(.horizontal)
        }
        .padding(.bottom, recipe.points("now.pad"))
        .accessibilityHidden(true)
        GridRow {
            if timeSide == .start { Color.clear.gridCellUnsizedAxes([.horizontal, .vertical]) }
            run.gridCellColumns(timeSide == .start ? 2 : 3)
        }
    }
}

private struct MetalTimelineRow: View {
    let event: MetalTimelineEvent
    let last: Bool
    let column: Double
    let box: Double
    let format: MetalTimelineFormat
    let now: Date
    let timeSide: MetalTimelineTimeSide

    var body: some View {
        GridRow {
            if timeSide == .start { MetalTimelineWhen(event: event, format: format, now: now, box: box, end: false) }
            MetalTimelineNode(event: event, last: last, column: column, box: box)
            MetalTimelineText(event: event, last: last, box: box, format: format, now: now)
            if timeSide == .end { MetalTimelineWhen(event: event, format: format, now: now, box: box, end: true) }
        }
    }
}

/// Lands one nest from above, fading; under Reduce Motion it only fades.
private struct MetalTimelineArrival: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content.transition(reduceMotion ? .opacity : .offset(y: -MetalRadius.nest).combined(with: .opacity))
    }
}

/// The node on the rail and the groove under it to the next event.
private struct MetalTimelineNode: View {
    let event: MetalTimelineEvent
    let last: Bool
    let column: Double
    let box: Double

    @State private var wait = MetalWait()
    @State private var gesture: MetalLampGesture = .steady

    private var recipe: MetalObjectRecipe { MetalRecipes.timeline }

    private var kind: MetalLEDKind {
        switch event.state {
        case .done, .planned: return .off
        case .live, .running: return .live
        case .waiting: return .waiting
        case .failed: return .failed
        }
    }

    private var work: MetalWork { event.state == .running ? .working : event.state == .done ? .done : .idle }

    var body: some View {
        VStack(spacing: .zero) {
            node.frame(width: column, height: box)
            if !last { MetalRule(.vertical).frame(maxHeight: .infinity) }
        }
        .frame(width: column)
        .frame(maxHeight: .infinity, alignment: .top)
        .gridCellUnsizedAxes(.vertical)
        .metalWait(work, into: $wait)
        .metalWaitSaid(wait.phase, label: "\(event.title), running", result: "\(event.title), done")
        .onChange(of: event.state) { _, new in
            gesture = new == .failed ? .blink2 : new == .live ? .flicker : .steady
        }
        .modifier(MetalTimelineArrival())
        .accessibilityHidden(true)
    }

    @ViewBuilder private var node: some View {
        if let glyph = event.glyph {
            ZStack(alignment: .topTrailing) {
                MetalSpinner(size: .small, label: "\(event.title), running", phase: wait.phase) {
                    MetalIcon(glyph, size: recipe.points("well.glyph"))
                }
                .frame(width: recipe.points("well.size"), height: recipe.points("well.size"))
                .metalObjectRecipe(MetalRecipes.switch, part: "self", in: Circle())
                if event.state != .done && event.state != .planned && !wait.showing {
                    MetalLED(kind, size: .small, gesture: gesture)
                        .offset(x: recipe.points("well.lamp-inset"), y: -recipe.points("well.lamp-inset"))
                }
            }
        } else {
            MetalSpinner(size: .small, label: "\(event.title), running", phase: wait.phase) {
                MetalLED(kind, gesture: gesture)
            }
        }
    }
}

/// The title and the line under it; the pad to the next event; what a reader hears.
private struct MetalTimelineText: View {
    let event: MetalTimelineEvent
    let last: Bool
    let box: Double
    let format: MetalTimelineFormat
    let now: Date
    @Environment(\.metalColorway) private var colorway

    private var recipe: MetalObjectRecipe { MetalRecipes.timeline }

    var body: some View {
        let t = colorway.tokens
        let planned = event.state == .planned
        // Set down so the title's first line centres on the node.
        let drop = (box - recipe.points("event.line")) / 2
        VStack(alignment: .leading, spacing: recipe.points("event.text-gap")) {
            Text(event.title).font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                .foregroundColor(planned ? t.ink3.color : t.ink.color)
            if let description = event.description {
                Text(description).font(.metal(MetalType.meta))
                    .foregroundColor(planned ? t.ink3.color : t.ink2.color)
            }
        }
        .padding(.top, drop)
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.bottom, last ? .zero : recipe.points("event.pad"))
        .modifier(MetalTimelineArrival())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(event.title)
        .accessibilityValue(MetalTimelineWords.said(event, format: format, now: now))
    }
}

/// The state's word, the duration and the time, in tabular figures.
private struct MetalTimelineWhen: View {
    let event: MetalTimelineEvent
    let format: MetalTimelineFormat
    let now: Date
    let box: Double
    let end: Bool
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let t = colorway.tokens
        let words = MetalTimelineWords.shown(event, format: format, now: now)
        Text(words.joined(separator: " · "))
            .font(.metal(MetalType.meta)).monospacedDigit()
            .foregroundColor(event.state == .planned ? t.ink3.color : t.ink2.color)
            .lineLimit(1)
            .frame(minHeight: box)
            .gridColumnAlignment(.trailing)
            .help(format == .relative ? event.time.map(MetalTimelineWords.exact) ?? "" : "")
            .modifier(MetalTimelineArrival())
            .accessibilityHidden(true)
    }
}

private enum MetalTimelineWords {
    static func word(_ state: MetalTimelineState) -> String? {
        switch state {
        case .live: return "Live"
        case .running: return "Running"
        case .waiting: return "Waiting"
        case .failed: return "Failed"
        case .done, .planned: return nil
        }
    }

    /// "42 s" under a minute, then "1:12", then "1:02:05".
    static func took(_ seconds: TimeInterval) -> String {
        let s = Int(seconds.rounded())
        if s < 60 { return "\(s) s" }
        let h = s / 3600, m = (s % 3600) / 60, r = s % 60
        return h > 0 ? String(format: "%d:%02d:%02d", h, m, r) : String(format: "%d:%02d", m, r)
    }

    static func exact(_ d: Date) -> String { d.formatted(date: .abbreviated, time: .shortened) }

    static func time(_ d: Date, format: MetalTimelineFormat, now: Date) -> String {
        switch format {
        case .relative:
            if abs(d.timeIntervalSince(now)) >= 7 * 24 * 3600 { return d.formatted(.dateTime.day().month(.abbreviated)) }
            let f = RelativeDateTimeFormatter()
            f.unitsStyle = .short
            return f.localizedString(for: d, relativeTo: now)
        case .date: return d.formatted(.dateTime.day().month(.abbreviated))
        case .time: return d.formatted(date: .omitted, time: .shortened)
        case .datetime: return d.formatted(.dateTime.day().month(.abbreviated).hour().minute())
        }
    }

    static func shown(_ e: MetalTimelineEvent, format: MetalTimelineFormat, now: Date) -> [String] {
        [word(e.state), e.duration.map(took), e.time.map { time($0, format: format, now: now) }].compactMap { $0 }
    }

    static func said(_ e: MetalTimelineEvent, format: MetalTimelineFormat, now: Date) -> String {
        [e.description, e.state == .planned ? "planned" : word(e.state), e.duration.map(took), e.time.map(exact)]
            .compactMap { $0 }.joined(separator: ", ")
    }
}
