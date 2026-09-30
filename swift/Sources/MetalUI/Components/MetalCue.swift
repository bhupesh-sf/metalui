import SwiftUI

// The cue family. Mirrors the reference cue components and the colorway cue-* tokens.
// In a TextKit editor the in-flow cues are rendering attributes drawn by the host from MetalCue; the
// views here are for SwiftUI surfaces (lens rows, panels, previews) and the margin objects.

/// An in-flow cue kind.
public enum MetalCueKind: Sendable { case date, duration, amount, measurement, tag, derivedTag, hex }

extension Text {
    /// Marks recognised text with its cue. Underline cues keep the text's metrics; tags are drawn by
    /// `MetalCueTag` (a pill needs a background, which `Text` cannot carry).
    public func metalCue(_ kind: MetalCueKind, colorway: MetalColorway, hex: MetalRGBA? = nil) -> Text {
        switch kind {
        case .date:
            return underline(pattern: .dot, color: MetalCue.dateUnderline.color)
        case .duration, .amount:
            return underline(pattern: .solid, color: colorway.tokens.cueQuiet.color)
        case .measurement:
            return underline(pattern: .solid, color: MetalCue.measureUnderline.color)
        case .hex:
            let base = hex ?? colorway.tokens.ink3
            return underline(pattern: .solid, color: base.color.opacity(MetalCue.hexMix))
        case .tag:
            return foregroundColor(colorway.tokens.ink2.color)
        case .derivedTag:
            return foregroundColor(colorway.tokens.ink3.color)
        }
    }
}

/// A tag cue as a view: the soft pill (or the hollow derived pill).
public struct MetalCueTag: View {
    let text: String
    let derived: Bool
    @Environment(\.metalColorway) private var colorway

    public init(_ text: String, derived: Bool = false) {
        self.text = text
        self.derived = derived
    }

    public var body: some View {
        let t = colorway.tokens
        Text(text)
            .font(.metal(MetalType.content))
            .foregroundColor((derived ? t.ink3 : t.ink2).color)
            .padding(.horizontal, MetalCue.tagPadX)
            .padding(.vertical, MetalCue.tagPadY)
            .background {
                let shape = Capsule(style: .continuous)
                if derived {
                    Color.clear.metalRecipe(MetalRecipe(fill: .solid(MetalRGBA(0, 0, 0, 0)), shadows: t.cueDerivedSh), in: shape)
                } else {
                    Color.clear.metalRecipe(MetalRecipe(fill: .solid(t.cueTagBg), shadows: t.cueTagSh), in: shape)
                }
            }
            // The pill's padding is paid back, as on the web, so a row of text keeps its advance.
            .padding(.horizontal, -MetalCue.tagPadX)
    }
}

/* ─────────────────────────────────────────────────────────
 * DIMPLE (the task's checkbox), in step with checkbox.tsx
 *
 * The tick is the check glyph's own route (MetalTickRoute, from icons/src/acts/check.mjs),
 * drawn by a pen with trim(from: 0, to:) on the 24 grid across the well:
 *    0 ms   the key goes dark
 *   40 ms   tick.delay, a beat: the pen touches down
 *  130 ms   tick.down, easing into the corner (ease-press): the short leg
 *  160 ms   tick.pace, a dwell at the corner
 *  160 ms+  the long leg on the part spring; the tail runs a little past the tip and back
 * Unticking draws it back (tick.withdraw, shared by the legs, the same dwell), then the key
 * goes light. Mixed (`mixed`, a group parent): the dash (the tick laid flat) draws on the part
 * spring; mixed ↔ on bends the dash into the tick on the settle spring.
 * Reduce Motion: the tick or dash is whole, or gone, at once.
 * ───────────────────────────────────────────────────────── */

/// A task's checkbox: a 16 pt well that turns dark while a pen draws the check glyph's tick on.
/// `doing` shows the half-filled green square; `ghost` the hollow dimple of an inferred task;
/// `mixed` (a group parent with some rows on) the dark key with a dash.
public enum MetalDimpleSize: Sendable { case margin, row }

public struct MetalDimple: View {
    @Binding var isOn: Bool
    let doing: Bool
    let ghost: Bool
    let mixed: Bool
    let size: MetalDimpleSize
    let label: String

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false
    /// How much of the pen's route is drawn, as a share of the route with its tail.
    @State private var drawn: CGFloat
    /// 0 the dash, 1 the tick.
    @State private var bend: CGFloat
    /// The key stays dark while the pen takes the tick away.
    @State private var inked: Bool
    /// Bumped by every change of mark, so a stroke scheduled for an older one is dropped.
    @State private var stroke = 0

    public init(isOn: Binding<Bool>, doing: Bool = false, ghost: Bool = false, mixed: Bool = false,
                size: MetalDimpleSize = .margin, label: String) {
        _isOn = isOn
        self.doing = doing
        self.ghost = ghost
        self.mixed = mixed
        self.size = size
        self.label = label
        let mark = MetalDimple.mark(on: isOn.wrappedValue, mixed: mixed, doing: doing)
        _drawn = State(initialValue: mark == nil ? 0 : MetalTickShape.rest)
        _bend = State(initialValue: mark == .dash ? 0 : 1)
        _inked = State(initialValue: mark != nil)
    }

    enum Mark: Equatable { case tick, dash }

    static func mark(on: Bool, mixed: Bool, doing: Bool) -> Mark? {
        on ? .tick : mixed && !doing ? .dash : nil
    }

    private var mark: Mark? { MetalDimple.mark(on: isOn, mixed: mixed, doing: doing) }

    public var body: some View {
        let recipe = MetalRecipes.checkbox
        let row = size == .row && !ghost
        let side = recipe.points(ghost ? "ghost.size" : row ? "row.size" : "self.size")
        let radius = recipe.points(ghost ? "ghost.radius" : row ? "row.radius" : "self.radius")
        let shape = RoundedRectangle(cornerRadius: radius, style: .continuous)
        let fade = recipe.durationSeconds("self.fade")
        let dark = isOn || inked || mark != nil
        let grid = side / MetalTickShape.grid
        Button {
            isOn.toggle()
        } label: {
            ZStack(alignment: .topLeading) {
                Color.clear
                    .frame(width: side, height: side)
                    .metalObjectRecipe(recipe, part: "self",
                                       state: dark ? "on" : ghost ? "ghost" : hovering ? "hover" : nil,
                                       in: shape)
                if ghost && hovering && !dark {
                    MetalInnerShadows(layers: recipe.shadows("self", state: "ghost-hover"), shape: shape)
                        .frame(width: side, height: side)
                }
                if !ghost {
                    MetalTickShape(bend: bend)
                        .trim(from: 0, to: drawn)
                        .stroke((recipe.color("tick.color") ?? MetalCue.tick).color,
                                style: StrokeStyle(lineWidth: recipe.scalar("tick.pen") * grid, lineCap: .round, lineJoin: .round))
                        .frame(width: side, height: side)
                        .rotationEffect(.degrees(Double(recipe.text("tick.rotate")?.replacingOccurrences(of: "deg", with: "") ?? "") ?? .zero),
                                        anchor: UnitPoint(x: MetalTickRoute.corner.x / MetalTickShape.grid, y: MetalTickRoute.corner.y / MetalTickShape.grid))
                        .opacity(drawn > .zero ? .one : .zero)
                        .allowsHitTesting(false)
                }
                if doing && !isOn {
                    let inset = recipe.points("doing.inset")
                    let inner = side - 2 * inset
                    Color.clear
                        .frame(width: inner, height: inner)
                        .metalObjectRecipe(recipe, part: "doing", in: RoundedRectangle(cornerRadius: recipe.points("doing.radius"), style: .continuous))
                        .opacity(recipe.scalar("doing.opacity"))
                        .offset(x: inset, y: inset)
                }
            }
            .frame(width: side, height: side)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .animation(reduceMotion ? nil : .easeInOut(duration: fade), value: hovering)
        .animation(reduceMotion ? nil : .easeInOut(duration: fade), value: dark)
        .onChange(of: mark) { old, new in pen(from: old, to: new) }
        .overlay {
            if isFocused && isEnabled {
                shape.inset(by: -(MetalButtonMetrics.focusOffset + MetalButtonMetrics.focusWidth / 2))
                    .stroke(MetalShared.focus.color, lineWidth: MetalButtonMetrics.focusWidth)
            }
        }
        .opacity(isEnabled ? .one : MetalButtonMetrics.disabled)
        .accessibilityLabel(label)
        .accessibilityValue(isOn ? "done" : doing || mixed ? "mixed" : "open")
        .accessibilityAddTraits(.isToggle)
    }

    /// Runs the pen for a change of mark: draw, withdraw, or bend the dash and tick into each other.
    private func pen(from old: Mark?, to new: Mark?) {
        stroke += 1
        let this = stroke
        let recipe = MetalRecipes.checkbox
        let part = MetalMotion.resolve(.part, reduceMotion: reduceMotion)
        let settle = MetalMotion.resolve(.settle, reduceMotion: reduceMotion)
        inked = true
        guard part.allowsTravel else {
            var still = Transaction(animation: nil)
            still.disablesAnimations = true
            withTransaction(still) {
                if let new { bend = new == .tick ? 1 : 0; drawn = MetalTickShape.rest } else { drawn = 0; inked = false }
            }
            return
        }
        let beat = recipe.durationSeconds("tick.delay")
        let down = recipe.durationSeconds("tick.down")
        let pace = recipe.durationSeconds("tick.pace")
        let withdraw = recipe.durationSeconds("tick.withdraw")
        let press = MetalShared.easePress
        let later = { (seconds: Double, step: @escaping () -> Void) in
            DispatchQueue.main.asyncAfter(deadline: .now() + seconds) { if stroke == this { step() } }
        }
        switch (old, new) {
        case let (.some, .some(to)) where drawn > 0:
            // The same stroke bends: the dash's corner drops and its tail rises (or back).
            withAnimation(settle.animation) { bend = to == .tick ? 1 : 0; drawn = MetalTickShape.rest }
        case let (_, .some(to)):
            bend = to == .tick ? 1 : 0
            if to == .dash || drawn >= MetalTickShape.short {
                later(drawn > 0 ? 0 : beat) { withAnimation(part.animation) { drawn = MetalTickShape.rest } }
            } else {
                later(beat) { withAnimation(press.animation(duration: down)) { drawn = MetalTickShape.short } }
                later(beat + down + pace) { withAnimation(part.animation) { drawn = MetalTickShape.rest } }
            }
        case (_, nil):
            let share = { (d: CGFloat) in withdraw * Double(d / MetalTickShape.rest) }
            let finish = { later(0) { inked = false } }
            if old == .dash || drawn <= MetalTickShape.short {
                withAnimation(press.animation(duration: share(drawn))) { drawn = 0 }
                later(share(drawn)) { finish() }
            } else {
                let long = share(drawn - MetalTickShape.short), short = share(MetalTickShape.short)
                withAnimation(press.animation(duration: long)) { drawn = MetalTickShape.short }
                later(long + pace) { withAnimation(press.animation(duration: short)) { drawn = 0 } }
                later(long + pace + short) { finish() }
            }
        }
    }
}

/// The dimple's tick: the check glyph's route on the 24 grid, bent from the dash (0) to the tick (1),
/// with its long leg run on past the tip by its own length (room for the pen's overshoot). Trim it
/// to `rest` for the route itself.
struct MetalTickShape: Shape {
    var bend: CGFloat

    static let grid: CGFloat = 24
    static let tick = [MetalTickRoute.start, MetalTickRoute.corner, MetalTickRoute.tip]
    /// The tick laid flat across its own width at its middle height, the corner at the same share of the way.
    static let dash: [CGPoint] = {
        let xs = tick.map(\.x), ys = tick.map(\.y)
        let y = (ys.min()! + ys.max()!) / 2, x0 = xs.min()!, x1 = xs.max()!
        return [CGPoint(x: x0, y: y), CGPoint(x: x0 + (x1 - x0) * shareOfShortLeg, y: y), CGPoint(x: x1, y: y)]
    }()
    private static func legs(_ r: [CGPoint]) -> (CGFloat, CGFloat) {
        (hypot(r[1].x - r[0].x, r[1].y - r[0].y), hypot(r[2].x - r[1].x, r[2].y - r[1].y))
    }
    static let shareOfShortLeg: CGFloat = { let (a, b) = legs(tick); return a / (a + b) }()
    /// The route's share of the whole path (the route plus the tail): where a drawn tick rests.
    static let rest: CGFloat = { let (a, b) = legs(tick); return (a + b) / (a + 2 * b) }()
    /// The short leg's share of the whole path: the corner.
    static let short: CGFloat = { let (a, b) = legs(tick); return a / (a + 2 * b) }()

    var animatableData: CGFloat {
        get { bend }
        set { bend = newValue }
    }

    func path(in rect: CGRect) -> Path {
        let k = rect.width / Self.grid
        let p = zip(Self.dash, Self.tick).map { d, t in
            CGPoint(x: rect.minX + (d.x + (t.x - d.x) * bend) * k, y: rect.minY + (d.y + (t.y - d.y) * bend) * k)
        }
        var path = Path()
        path.move(to: p[0])
        path.addLine(to: p[1])
        path.addLine(to: p[2])
        path.addLine(to: CGPoint(x: 2 * p[2].x - p[1].x, y: 2 * p[2].y - p[1].y))
        return path
    }
}

/// Urgency: a 5 pt amber LED in the margin of an open task that is due soon.
public struct MetalCueUrgency: View {
    public init() {}

    public var body: some View {
        Color.clear
            .frame(width: MetalCue.urgencyLed, height: MetalCue.urgencyLed)
            .metalObjectRecipe(MetalRecipes.mark, part: "urgency", in: Circle())
            .accessibilityLabel("Due soon")
    }
}

/// A URL at rest: a 20 pt host pill with the link glyph.
public struct MetalCueURLPill: View {
    let host: String
    let action: () -> Void
    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false

    public init(host: String, action: @escaping () -> Void) {
        self.host = host
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: MetalCue.urlGap) {
                MetalIcon(.link, size: MetalCue.urlGlyph)
                Text(host).font(.metal(MetalType.ui))
            }
            .foregroundColor(colorway.tokens.cueUrlInk.color)
            .padding(.leading, MetalCue.urlPadStart)
            .padding(.trailing, MetalCue.urlPadEnd)
            .frame(height: MetalCue.urlHeight)
            .metalRecipe(MetalRecipe(fill: .solid(hovering ? MetalCue.urlBgHover : MetalCue.urlBg), shadows: MetalCue.urlRing), in: Capsule(style: .continuous))
            .metalAnimation(.settle, value: hovering)
        }
        .buttonStyle(.plain)
        .onHover { hovering = $0 }
        .accessibilityLabel("Link, \(host)")
    }
}

/// A value the recognizer read that is not in the text: a hollow pill in the label role.
public struct MetalCueInferred: View {
    let text: String
    @Environment(\.metalColorway) private var colorway

    public init(_ text: String) { self.text = text }

    public var body: some View {
        Text(text.uppercased())
            .font(.metal(MetalType.readout))
            .tracking(MetalType.readout.trackingPoints)
            .foregroundColor(colorway.tokens.ink2.color)
            .padding(.horizontal, MetalCue.inferredPad)
            .frame(height: MetalCue.inferredHeight)
            .metalRecipe(MetalRecipe(fill: .solid(MetalRGBA(0, 0, 0, 0)), shadows: MetalCue.inferredRing), in: Capsule(style: .continuous))
    }
}

/// The life glyph trailing a block: a middle dot, then the glyph at 16 (tuned cut), ink3 at rest.
public struct MetalCueLife: View {
    let icon: MetalLifeIconName
    @Environment(\.metalColorway) private var colorway
    @Environment(\.metalIconInteraction) private var hostInteraction
    @State private var ownHover = false

    public init(_ icon: MetalLifeIconName) { self.icon = icon }

    public var body: some View {
        let hovered = hostInteraction?.isHovered ?? ownHover
        HStack(spacing: .zero) {
            Text("·").foregroundColor(colorway.tokens.ink3.color)
                .padding(.leading, MetalCue.lifeGapBefore)
                .padding(.trailing, MetalCue.lifeGapAfter)
                .accessibilityHidden(true)
            MetalLifeIcon(icon)
                .foregroundStyle((hovered ? colorway.tokens.ink2 : colorway.tokens.ink3).color)
                .offset(y: -MetalCue.lifeDrop)
        }
        .onHover { ownHover = $0 }
        .accessibilityLabel(icon.label)
    }
}
