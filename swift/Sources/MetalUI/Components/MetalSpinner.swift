import SwiftUI

// WAITING, shown where it happens (spinner.agent.md), in step with the web:
//   MetalWait     the one clock: a show delay, a minimum time on screen, the result, "still" after a while
//   MetalSpinner  the ring in a glyph slot, in the host's ink: turns, fills once the amount is known, draws
//                 the check's tick when done
//   MetalSpinnerBar  a thin bar across the top of a place
//   rim and edge  what MetalAvatar and MetalCard wear while they wait
// Every number is the spinner recipe's (or the button's wait arc). Reduce Motion: nothing turns or travels;
// the signs breathe in place.

/// What the work is doing, as the host knows it.
public enum MetalWork: Sendable, Equatable { case idle, working, done, failed }

/// What to show: `quiet` holds the item without a sign, `shown` shows the sign, `done` the result.
public enum MetalWaitPhase: Sendable, Equatable { case idle, quiet, shown, done, failed }

/// The wait as the clock sees it. Keep one in `@State` and drive it with `.metalWait(_:into:)`.
public struct MetalWait: Equatable, Sendable {
    public internal(set) var phase: MetalWaitPhase = .idle
    /// The work has run past the `still` token: say more ("Still exporting…").
    public internal(set) var still = false
    var shownAt: Date?

    public init() {}
    /// Hold the item: busy, refuse a second action.
    public var busy: Bool { phase == .quiet || phase == .shown }
    /// The sign or its result occupies the slot.
    public var showing: Bool { phase == .shown || phase == .done }

    fileprivate static func settled(_ work: MetalWork) -> MetalWaitPhase { work == .failed ? .failed : .idle }

    /// A change of work, applied at once (timers follow in the clock).
    fileprivate mutating func move(from old: MetalWork, to new: MetalWork) {
        if new == .working {
            still = false
            if phase != .shown { phase = .quiet }
        } else if old == .working {
            if phase != .shown { phase = new == .done ? .done : Self.settled(new) }
        } else if phase != .shown {
            phase = Self.settled(new)
        }
    }
}

private struct MetalWaitTimer: Hashable { let phase: MetalWaitPhase; let work: MetalWork }

private struct MetalWaitClock: ViewModifier {
    let work: MetalWork
    @Binding var wait: MetalWait

    func body(content: Content) -> some View {
        let recipe = MetalRecipes.spinner
        content
            .onAppear { if work == .working, wait.phase == .idle { wait.phase = .quiet } }
            .onChange(of: work) { old, new in wait.move(from: old, to: new) }
            .task(id: MetalWaitTimer(phase: wait.phase, work: work)) {
                switch wait.phase {
                case .quiet:
                    guard await sleep(recipe.durationSeconds("self.delay")) else { return }
                    wait.shownAt = Date()
                    wait.phase = .shown
                case .shown where work != .working:
                    let held = Date().timeIntervalSince(wait.shownAt ?? Date())
                    guard await sleep(max(.zero, recipe.durationSeconds("self.minimum") - held)) else { return }
                    wait.phase = work == .done ? .done : MetalWait.settled(work)
                case .done:
                    guard await sleep(recipe.durationSeconds("self.result")) else { return }
                    wait.phase = .idle
                default: return
                }
            }
            .task(id: work) {
                guard work == .working, await sleep(recipe.durationSeconds("self.still")) else { return }
                wait.still = true
            }
    }

    private func sleep(_ seconds: Double) async -> Bool {
        try? await Task.sleep(for: .seconds(seconds))
        return !Task.isCancelled
    }
}

public extension View {
    /// Turns the host's work into what to show, with the spinner's timing (see spinner.agent.md).
    func metalWait(_ work: MetalWork, into wait: Binding<MetalWait>) -> some View {
        modifier(MetalWaitClock(work: work, wait: wait))
    }

    /// Says the wait twice: `label` when its sign shows, `result` when it is done. The ring says it; a host
    /// whose sign is its own (a card's edge, an avatar's rim, a lamp) adds this.
    func metalWaitSaid(_ phase: MetalWaitPhase, label: String, result: String = "Done") -> some View {
        onChange(of: phase) { _, new in
            if new == .shown { AccessibilityNotification.Announcement(label).post() }
            if new == .done { AccessibilityNotification.Announcement(result).post() }
        }
    }
}

public enum MetalSpinnerSize: Sendable { case regular, small }

/// Signs that wait for the show delay appear at once (a still capture has no clock).
private struct MetalWaitFrozenKey: EnvironmentKey { static let defaultValue = false }

extension EnvironmentValues {
    var metalWaitFrozen: Bool {
        get { self[MetalWaitFrozenKey.self] }
        set { self[MetalWaitFrozenKey.self] = newValue }
    }
}

/// The arc's turn (or, under Reduce Motion, its breath), running only while `running`.
private struct MetalTurn: ViewModifier {
    let running: Bool
    let seconds: Double
    let visible: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var on = false

    func body(content: Content) -> some View {
        let breathe = MetalRecipes.progress
        content
            .rotationEffect(.degrees(on && !reduceMotion ? 360 : .zero))
            .opacity(visible ? (reduceMotion && on ? breathe.scalar("segment.dim") : .one) : .zero)
            .animation(on ? (reduceMotion
                ? .easeInOut(duration: breathe.durationSeconds("segment.breathe")).repeatForever(autoreverses: true)
                : .linear(duration: seconds).repeatForever(autoreverses: false)) : nil, value: on)
            .onChange(of: running, initial: true) { _, now in on = now }
    }
}

/// The check glyph's tick on the 24 grid, drawn by `trim`.
private struct MetalWaitTick: Shape {
    func path(in rect: CGRect) -> Path {
        let k = rect.width / MetalTickShape.grid
        var path = Path()
        path.addLines(MetalTickShape.tick.map { CGPoint(x: $0.x * k, y: $0.y * k) })
        return path
    }
}

/// Waiting in a glyph slot: the ring stands in for the item's glyph after the show delay, in the host's ink.
public struct MetalSpinner<Glyph: View>: View {
    private let size: MetalSpinnerSize
    private let label: String
    private let result: String
    private let phase: MetalWaitPhase?
    private let value: Double?
    private let glyph: Glyph
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalWaitFrozen) private var frozen
    @State private var arrived = false
    @State private var drawn: Double

    /// `phase` from `.metalWait`; leave it nil to show the ring after the show delay on appear.
    /// `value` (0–100) once the amount is known: the ring fills instead of turning.
    public init(size: MetalSpinnerSize = .regular, label: String = "Loading", result: String = "Done",
                phase: MetalWaitPhase? = nil, value: Double? = nil, @ViewBuilder glyph: () -> Glyph) {
        self.size = size
        self.label = label
        self.result = result
        self.phase = phase
        self.value = value
        self.glyph = glyph()
        _drawn = State(initialValue: phase == .done ? .one : .zero)
    }

    public var body: some View {
        let recipe = MetalRecipes.spinner
        let wait = MetalRecipes.button
        let side = recipe.points(size == .small ? "self.small" : "self.size")
        let unit = side / MetalTickShape.grid
        let across = unit * (wait.points("wait.radius") + wait.points("wait.radius"))
        let line = StrokeStyle(lineWidth: unit * wait.points("wait.stroke"), lineCap: .round, lineJoin: .round)
        let fade = Animation.easeOut(duration: recipe.durationSeconds("self.fade"))
        let known = value != nil
        let signed = phase == .shown || phase == .done
        let live = phase == nil ? arrived || frozen : phase == .shown
        ZStack {
            glyph.opacity(signed ? .zero : .one)
            Circle()
                .trim(from: .zero, to: wait.scalar("wait.arc"))
                .stroke(style: line)
                .frame(width: across, height: across)
                .modifier(MetalTurn(running: !known && (live || phase == .done), seconds: recipe.durationSeconds("self.turn"), visible: !known && live))
            if let value {
                Circle().stroke(style: line).frame(width: across, height: across)
                    .opacity(live ? recipe.scalar("track.opacity") : .zero)
                Circle()
                    .trim(from: .zero, to: min(.one, max(.zero, value / 100)))
                    .stroke(style: line)
                    .rotationEffect(.degrees(-90))
                    .frame(width: across, height: across)
                    .opacity(live ? .one : .zero)
                    .metalAnimation(.settle, value: value)
            }
            MetalWaitTick()
                .trim(from: .zero, to: drawn)
                .stroke(style: line)
                .opacity(phase == .done ? .one : .zero)
        }
        .frame(width: side, height: side)
        .animation(fade, value: phase)
        .animation(fade, value: arrived)
        .task(id: phase) {
            guard phase == nil else { return }
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("self.delay")))
            if !Task.isCancelled { arrived = true }
        }
        .onChange(of: phase) { _, new in
            guard new == .done else { return }
            drawn = .zero
            withAnimation(reduceMotion ? nil : .easeOut(duration: recipe.durationSeconds("tick.draw"))) { drawn = .one }
        }
        .metalWaitSaid(phase ?? .idle, label: label, result: result)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue(value.map { "\(Int($0.rounded())) %" } ?? (phase == .done ? result : ""))
    }
}

public extension MetalSpinner where Glyph == EmptyView {
    init(size: MetalSpinnerSize = .regular, label: String = "Loading", result: String = "Done",
         phase: MetalWaitPhase? = nil, value: Double? = nil) {
        self.init(size: size, label: label, result: result, phase: phase, value: value) { EmptyView() }
    }
}

/// A thin bar across the top of a place (overlay it at the top): it creeps toward the end while the place
/// loads and completes when it arrives. `value` (0–100) once the amount is known.
public struct MetalSpinnerBar: View {
    private let phase: MetalWaitPhase
    private let value: Double?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalWaitFrozen) private var frozen
    @State private var reach = Double.zero

    public init(phase: MetalWaitPhase, value: Double? = nil) {
        self.phase = phase
        self.value = value
    }

    public var body: some View {
        let recipe = MetalRecipes.spinner
        let shown = phase == .shown || phase == .done
        Color.clear.metalObjectRecipe(MetalRecipes.`switch`, part: "self", state: "on", in: Rectangle())
            .scaleEffect(x: reduceMotion && value == nil ? Double.one : frozen ? MetalRecipes.spinner.scalar("bar.reach") : reach, y: Double.one, anchor: .leading)
            .frame(height: recipe.points("bar.height"))
            .opacity(shown ? .one : .zero)
            .animation(.easeOut(duration: recipe.durationSeconds("self.fade")).delay(phase == .done ? recipe.durationSeconds("bar.finish") : .zero), value: shown)
            .onChange(of: phase, initial: true) { _, now in move(now) }
            .onChange(of: value) { _, _ in move(phase) }
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private func move(_ phase: MetalWaitPhase) {
        let recipe = MetalRecipes.spinner
        switch phase {
        case .shown:
            if let value { withMetalAnimation(.settle, reduceMotion: reduceMotion) { reach = value / 100 }; return }
            reach = .zero
            withAnimation(MetalShared.easeSlide.animation(duration: recipe.durationSeconds("bar.creep"))) { reach = recipe.scalar("bar.reach") }
        case .done:
            withAnimation(.easeOut(duration: recipe.durationSeconds("bar.finish"))) { reach = .one }
        default:
            reach = .zero
        }
    }
}

/// A short arc travelling round an avatar's rim while its photo is on its way (MetalAvatar `waiting`).
struct MetalSpinnerRim: View {
    let waiting: Bool
    @Environment(\.metalWaitFrozen) private var frozen
    @State private var arrived = false

    var body: some View {
        let recipe = MetalRecipes.spinner
        GeometryReader { box in
            let unit = box.size.width / MetalTickShape.grid
            Circle()
                .trim(from: .zero, to: recipe.scalar("rim.arc"))
                .stroke(style: StrokeStyle(lineWidth: unit * recipe.points("rim.stroke"), lineCap: .round))
                .frame(width: unit * (recipe.points("rim.radius") + recipe.points("rim.radius")), height: unit * (recipe.points("rim.radius") + recipe.points("rim.radius")))
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .modifier(MetalTurn(running: arrived, seconds: recipe.durationSeconds("rim.turn"), visible: arrived || frozen))
        }
        .animation(.easeOut(duration: recipe.durationSeconds("self.fade")), value: arrived)
        .task(id: waiting) {
            guard waiting else { arrived = false; return }
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("self.delay")))
            if !Task.isCancelled { arrived = true }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// A lit edge travelling round a large item's own border while it waits (MetalCard `waiting`).
struct MetalSpinnerEdge<S: InsettableShape>: View {
    let shape: S
    let waiting: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalWaitFrozen) private var frozen
    @State private var arrived = false

    var body: some View {
        let recipe = MetalRecipes.spinner
        let ink = Color.primary.opacity(recipe.scalar("edge.opacity"))
        let tail = recipe.scalar("edge.tail")
        GeometryReader { box in
            let side = box.size.width + box.size.height
            AngularGradient(stops: [.init(color: ink.opacity(.zero), location: .zero),
                                    .init(color: ink.opacity(.zero), location: Double.one - tail),
                                    .init(color: ink, location: Double.one)], center: .center)
                .opacity(reduceMotion ? .zero : .one)
                .background(reduceMotion ? ink : .clear)
                .frame(width: side, height: side)
                .position(x: box.size.width / 2, y: box.size.height / 2)
                .modifier(MetalTurn(running: arrived, seconds: recipe.durationSeconds("edge.turn"), visible: arrived || frozen))
        }
        .mask(shape.strokeBorder(lineWidth: recipe.points("edge.width")))
        .animation(.easeOut(duration: recipe.durationSeconds("self.fade")), value: arrived)
        .task(id: waiting) {
            guard waiting else { arrived = false; return }
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("self.delay")))
            if !Task.isCancelled { arrived = true }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

extension View {
    /// A part of a small item while the item waits: dimmed (the part holding the sign is not).
    func metalWaitDim(_ waiting: Bool) -> some View {
        opacity(waiting ? MetalRecipes.spinner.scalar("item.dim") : .one)
            .animation(.easeOut(duration: MetalRecipes.spinner.durationSeconds("self.fade")), value: waiting)
    }
}

/// A wait said in words ("Searching the web"), in ink2 with a light passing across them after the show
/// delay: a working line under a reply, a tool's progress. `active: false` stops the light; the words stay.
/// Reduce Motion: the words breathe in place.
public struct MetalSpinnerText: View {
    private let words: String
    private let active: Bool
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalWaitFrozen) private var frozen
    @State private var arrived = false
    @State private var swept = false

    public init(_ words: String, active: Bool = true) {
        self.words = words
        self.active = active
    }

    public var body: some View {
        let recipe = MetalRecipes.spinner
        let breathe = MetalRecipes.progress
        let t = colorway.tokens
        let band = recipe.scalar("text.band")
        let lit = active && (arrived || frozen)
        Text(words)
            .foregroundColor(t.ink2.color)
            .opacity(lit && reduceMotion && swept ? breathe.scalar("segment.dim") : .one)
            .overlay {
                if lit && !reduceMotion {
                    GeometryReader { box in
                        let w = box.size.width
                        Text(words)
                            .foregroundColor(t.ink.color)
                            .frame(width: w, alignment: .leading)
                            .mask {
                                LinearGradient(stops: [.init(color: .clear, location: .zero),
                                                       .init(color: .black, location: band / 2),
                                                       .init(color: .clear, location: band)],
                                               startPoint: .leading, endPoint: .trailing)
                                    .frame(width: w)
                                    .offset(x: swept ? w : -band * w)
                            }
                    }
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
                }
            }
            .animation(lit ? (reduceMotion
                ? .easeInOut(duration: breathe.durationSeconds("segment.breathe")).repeatForever(autoreverses: true)
                : .linear(duration: recipe.durationSeconds("text.sweep")).repeatForever(autoreverses: false)) : nil, value: swept)
            .task(id: active) {
                swept = false
                arrived = false
                guard active else { return }
                try? await Task.sleep(for: .seconds(recipe.durationSeconds("self.delay")))
                guard !Task.isCancelled else { return }
                arrived = true
                swept = true
            }
            .accessibilityElement()
            .accessibilityLabel(words)
            .accessibilityAddTraits(.updatesFrequently)
    }
}
