import SwiftUI

// PROGRESS, how far a task has come (progress.agent.md), in step with the web:
//   running   the switch's sunk track; the fill is a whole on-look capsule slid in from the start, so its
//             leading edge stays round. A rising value moves it on the settle spring, a falling one
//             (reset, cancel) drains it on the release spring
//   unknown   value nil: a short lit segment sweeps across and loops; Reduce Motion breathes it in place
//   paused    the fill holds and dims (paused.dim)
//   failed    the fill stops; the failed ink (fill.failed) cross-fades over it; the glyph is sync-error
//   complete  the fill finishes, then the head turns: the glyph to check, the label to yours
// Shapes: bar, slim (no head), ring (MetalSpinner with a value), steps, buffer. Sizes: regular, compact.
// Every number is the progress recipe's (the look is the switch recipe's).

public enum MetalProgressState: Sendable, Equatable { case running, paused, failed, complete }
public enum MetalProgressShape: Sendable, Equatable { case bar, slim, ring }
public enum MetalProgressSize: Sendable, Equatable { case regular, compact }

/// How far a task has come. `value` from 0 to `total` (or the number of `steps`); nil when unknown.
public struct MetalProgress: View {
    private let label: String?
    private let value: Double?
    private let total: Double
    private let state: MetalProgressState
    private let shape: MetalProgressShape
    private let size: MetalProgressSize
    private let steps: Int?
    private let buffer: Double?
    private let detail: String?
    private let showValue: Bool
    private let icon: MetalIconName?
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drawn: Double
    @State private var landed: Bool
    @State private var face: String?

    /// `icon` is the task's glyph while it runs; complete shows check and failed sync-error in its place.
    public init(_ label: String? = nil, value: Double?, total: Double? = nil, state: MetalProgressState = .running,
                shape: MetalProgressShape = .bar, size: MetalProgressSize = .regular, steps: Int? = nil,
                buffer: Double? = nil, detail: String? = nil, showValue: Bool = false, icon: MetalIconName? = nil) {
        self.label = label
        self.value = value
        self.total = total ?? Double(steps ?? 100)
        self.state = state
        self.shape = shape
        self.size = size
        self.steps = steps
        self.buffer = buffer
        self.detail = detail
        self.showValue = showValue
        self.icon = icon
        let top = total ?? Double(steps ?? 100)
        _drawn = State(initialValue: state == .complete ? .one : Self.share(value, top))
        _landed = State(initialValue: state == .complete)
        _face = State(initialValue: label)
    }

    private static func share(_ v: Double?, _ top: Double) -> Double {
        guard let v, top > .zero else { return .zero }
        return min(.one, max(.zero, v / top))
    }

    private var target: Double { state == .complete ? .one : Self.share(value, total) }
    private var compact: Bool { size == .compact }
    private var glyph: MetalIconName? {
        switch state {
        case .complete where landed: return .check
        case .failed: return .syncError
        default: return icon
        }
    }
    private var stepText: String? {
        guard let steps, steps > 1, value != nil || state == .complete else { return nil }
        return "Step \(min(steps, Int((target * Double(steps)).rounded(.down)) + 1)) of \(steps)"
    }
    private var valueText: String { stepText ?? "\(Int((target * 100).rounded())) %" }

    public var body: some View {
        let recipe = MetalRecipes.progress
        Group {
            if shape == .ring {
                MetalSpinner(size: compact ? .small : .regular, label: face ?? "Progress", result: face ?? "Done",
                             phase: state == .complete && landed ? .done : nil, value: value == nil && state != .complete ? nil : drawn * 100)
                    .foregroundStyle(state == .failed ? MetalShared.red.color : colorway.tokens.ink2.color)
                    .opacity(state == .paused ? recipe.scalar("paused.dim") : .one)
            } else {
                VStack(alignment: .leading, spacing: recipe.points(compact ? "compact.gap" : "self.gap")) {
                    if shape == .bar, face != nil || glyph != nil || detail != nil || showValue { head }
                    track
                }
                .frame(minWidth: recipe.points("self.min-width"))
            }
        }
        .onChange(of: target) { old, new in
            withMetalAnimation(new < old ? .release : .settle, reduceMotion: reduceMotion) { drawn = new }
        }
        .onChange(of: label) { _, new in if state != .complete || landed { face = new } }
        .task(id: state) {
            guard state == .complete else { landed = false; face = label; return }
            if !landed && !reduceMotion { try? await Task.sleep(for: .seconds(MetalSprings.settle.duration)) }
            guard !Task.isCancelled else { return }
            landed = true
            face = label
        }
        .animation(.easeOut(duration: MetalSprings.settle.duration), value: state)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(face ?? "")
        .accessibilityValue(value == nil && state != .complete ? "In progress" : valueText)
    }

    private var head: some View {
        let recipe = MetalRecipes.progress
        let ink = colorway.tokens
        let words = detail ?? (showValue && (value != nil || state == .complete) ? valueText : nil)
        return HStack(spacing: recipe.points("self.glyph-gap")) {
            if let glyph {
                MetalIcon(glyph, size: recipe.points(compact ? "compact.glyph" : "self.glyph"))
                    .foregroundStyle(ink.ink2.color)
            }
            if let face {
                Text(face)
                    .font(.metal(compact ? MetalType.meta : MetalType.ui))
                    .foregroundStyle(ink.ink.color)
                    .lineLimit(1)
                    .contentTransition(reduceMotion ? .opacity : .numericText())
            }
            Spacer(minLength: .zero)
            if let words {
                Text(words)
                    .font(.metal(MetalType.meta))
                    .monospacedDigit()
                    .foregroundStyle(ink.ink2.color)
                    .contentTransition(reduceMotion ? .opacity : .numericText(value: drawn))
            }
        }
        .animation(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: words)
        .animation(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: face)
    }

    private var track: some View {
        let recipe = MetalRecipes.progress
        let height = recipe.points(shape == .slim ? "slim.height" : compact ? "compact.height" : "self.height")
        let wells = max(1, steps ?? 1)
        return HStack(spacing: recipe.points("steps.gap")) {
            ForEach(0..<wells, id: \.self) { i in
                // Each well holds the part of the whole past i / wells.
                let part = { (v: Double) in min(.one, max(.zero, (v - Double(i) / Double(wells)) * Double(wells))) }
                MetalProgressWell(
                    fill: value == nil && state != .complete ? nil : part(drawn),
                    buffer: buffer.map { part(Self.share($0, total)) },
                    state: state
                )
            }
        }
        .frame(height: height)
    }
}

/// One sunk well and its fill (or, unknown, the sweeping segment).
private struct MetalProgressWell: View {
    let fill: Double?
    let buffer: Double?
    let state: MetalProgressState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let recipe = MetalRecipes.progress
        let shape = Capsule(style: .continuous)
        GeometryReader { box in
            let width = box.size.width
            ZStack(alignment: .leading) {
                if let buffer, fill != nil {
                    Color.clear.metalObjectRecipe(MetalRecipes.`switch`, part: "self", state: "on", in: shape)
                        .opacity(recipe.scalar("buffer.opacity"))
                        .offset(x: (buffer - .one) * width)
                        .metalAnimation(.settle, value: buffer)
                }
                if let fill {
                    ZStack {
                        Color.clear.metalObjectRecipe(MetalRecipes.`switch`, part: "self", state: "on", in: shape)
                        Color.clear.metalObjectRecipe(recipe, part: "fill", state: "failed", in: shape)
                            .opacity(state == .failed ? .one : .zero)
                    }
                    .opacity(state == .paused ? recipe.scalar("paused.dim") : .one)
                    .offset(x: (fill - .one) * width)
                } else {
                    MetalProgressSegment(width: width)
                }
            }
        }
        .metalObjectRecipe(MetalRecipes.`switch`, part: "self", in: shape)
        .clipShape(shape)
    }
}

/// The unknown amount: a lit segment sweeping across, or breathing in the middle under Reduce Motion.
private struct MetalProgressSegment: View {
    let width: Double
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var on = false

    var body: some View {
        let recipe = MetalRecipes.progress
        let ratio = recipe.scalar("segment.ratio")
        let segment = width * ratio
        Color.clear.metalObjectRecipe(MetalRecipes.`switch`, part: "self", state: "on", in: Capsule(style: .continuous))
            .frame(width: segment)
            .offset(x: reduceMotion ? (width - segment) / 2 : on ? width : -segment)
            .opacity(reduceMotion && on ? recipe.scalar("segment.dim") : .one)
            .animation(reduceMotion
                ? .easeInOut(duration: recipe.durationSeconds("segment.breathe")).repeatForever(autoreverses: true)
                : .easeInOut(duration: recipe.durationSeconds("segment.sweep")).repeatForever(autoreverses: false), value: on)
            .onAppear { on = true }
    }
}
