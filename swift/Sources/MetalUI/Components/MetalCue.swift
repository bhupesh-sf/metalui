import SwiftUI

// The cue family, in step with mark.tsx and the mark recipe.
//
// One grammar of kinds: time (date, duration) is an engraved groove with the clock; money a quiet
// hairline with a coin (spent stands in); the body a soft green line with its glyph (late night for
// sleep, steps); a colour its 3 pt line and live swatch; a person their avatar; a tag a luggage tag in
// its own hue. The glyph sits at full ink before the words; the line is drawn under them.
//
// Recognition (`fresh`), once: the line draws in from the leading edge (settle), the glyph pops in from
// motion.pop with an overshoot (object, after settle's half), money's figures turn up one step
// (settle), a date shows its resolved value in a graphite chip for motion.chip-hold, and the glyph's own
// act plays once (its host hover, held for motion.act). Inferred: a dashed line, ink2. Raw: the drawing
// and the glyph fade, nothing moves. Reduce Motion: everything is there at once, no act.
// In a TextKit editor the host draws the lines and tags itself from the mark recipe.

/// An in-flow cue kind.
public enum MetalCueKind: Sendable { case date, duration, amount, measurement, tag, derivedTag, hex, person }

/// What sits before a cue's words.
public enum MetalCueGlyph: Sendable {
    /// The kind's own: the clock for time, the swatch for a colour, nothing for the rest.
    case kind
    case icon(MetalIconName)
    case life(MetalLifeIconName)
    /// A person's avatar, from their name.
    case person(String)
    case none
}

extension Text {
    /// Marks recognised text with its cue's line, for text that can't carry a view (a TextKit fallback).
    /// `MetalCueMark` draws the full cue: the glyph, the engraved groove and the recognition moment.
    public func metalCue(_ kind: MetalCueKind, colorway: MetalColorway, hex: MetalRGBA? = nil) -> Text {
        let cw = MetalRecipeColorway(colorway)
        switch kind {
        case .date, .duration:
            return underline(pattern: .solid, color: (MetalRecipes.mark.color("groove.ink", colorway: cw) ?? colorway.tokens.cueQuiet).color)
        case .amount:
            return underline(pattern: .solid, color: colorway.tokens.cueQuiet.color)
        case .measurement:
            return underline(pattern: .solid, color: MetalCue.measureUnderline.color)
        case .hex:
            let base = hex ?? colorway.tokens.ink3
            return underline(pattern: .solid, color: base.color.opacity(MetalCue.hexMix))
        case .tag, .derivedTag:
            return foregroundColor(MetalCueTagLook(name: "", colorway: colorway).ink.color)
        case .person:
            return self
        }
    }
}

/// HSL (degrees, 0–1, 0–1) to the shared colour type.
private func metalHSL(_ h: Double, _ s: Double, _ l: Double) -> MetalRGBA {
    let c = (1 - abs(2 * l - 1)) * s
    let hp = (h.truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360) / 60
    let x = c * (1 - abs(hp.truncatingRemainder(dividingBy: 2) - 1))
    let (r, g, b): (Double, Double, Double) = switch Int(hp) {
    case 0: (c, x, 0)
    case 1: (x, c, 0)
    case 2: (0, c, x)
    case 3: (0, x, c)
    case 4: (x, 0, c)
    default: (c, 0, x)
    }
    let m = l - c / 2
    return MetalRGBA((r + m) * 255, (g + m) * 255, (b + m) * 255, 1)
}

private func metalPercent(_ s: String?) -> Double { (Double(s?.replacingOccurrences(of: "%", with: "") ?? "") ?? .zero) / 100 }

/// The tag palette's size (recipe mark: tag.hue-0 … tag.hue-5), as on the web.
private let metalTagHues = 6

/// A tag's place in the palette, stable for its name (case and hash ignored), the same hash as the web's `markTagHue`.
public func metalTagHue(_ tag: String) -> Int {
    var h = 0
    for c in tag.drop(while: { $0 == "#" }).lowercased().unicodeScalars { h = (h * 31 + Int(c.value)) % 9973 }
    return h % metalTagHues
}

/// A tag's colours from the recipe: paper, edge and ink in its hue.
struct MetalCueTagLook {
    let paper: MetalRGBA, edge: MetalRGBA, ink: MetalRGBA

    init(name: String, colorway: MetalColorway) {
        let r = MetalRecipes.mark, cw = MetalRecipeColorway(colorway)
        let hue = Double(r.text("tag.hue-\(metalTagHue(name))")?.replacingOccurrences(of: "deg", with: "") ?? "") ?? .zero
        let sat = metalPercent(r.text("tag.saturation"))
        paper = metalHSL(hue, sat, metalPercent(r.text("tag.lightness", colorway: cw)))
        edge = metalHSL(hue, sat, metalPercent(r.text("tag.edge-lightness", colorway: cw)))
        ink = metalHSL(hue, sat, metalPercent(r.text("tag.ink-lightness", colorway: cw)))
    }
}

/// The luggage tag's outline: the point on the leading edge, round corners at the far end, a punched
/// hole near the point (fill it with `eoFill`).
struct MetalTagShape: Shape {
    var point: CGFloat
    var radius: CGFloat
    var hole: CGFloat
    var holeX: CGFloat

    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX + point, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX - radius, y: rect.minY))
        p.addQuadCurve(to: CGPoint(x: rect.maxX, y: rect.minY + radius), control: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - radius))
        p.addQuadCurve(to: CGPoint(x: rect.maxX - radius, y: rect.maxY), control: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX + point, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.midY))
        p.closeSubpath()
        p.addEllipse(in: CGRect(x: rect.minX + holeX - hole, y: rect.midY - hole, width: hole * 2, height: hole * 2))
        return p
    }
}

/// A tag cue as a view: the luggage tag in its own hue, the hash a quiet mark. `derived` (inferred by
/// the model) is hollow and dashed until confirmed. The tag's overhang is paid back, so a row of text
/// keeps its advance.
public struct MetalCueTag: View {
    let text: String
    let derived: Bool
    @Environment(\.metalColorway) private var colorway

    public init(_ text: String, derived: Bool = false) {
        self.text = text
        self.derived = derived
    }

    public var body: some View {
        let r = MetalRecipes.mark
        let look = MetalCueTagLook(name: text, colorway: colorway)
        let start = r.points("tag.pad-start"), end = r.points("tag.pad-end")
        let shape = MetalTagShape(point: r.points("tag.point"), radius: r.points("tag.radius"), hole: r.points("tag.hole"), holeX: r.points("tag.hole-x"))
        let hash = text.hasPrefix("#")
        (Text(hash ? "#" : "").foregroundColor((derived ? colorway.tokens.ink2 : look.ink).color.opacity(metalPercent(r.text("tag.hash"))))
            + Text(hash ? String(text.dropFirst()) : text).foregroundColor((derived ? colorway.tokens.ink2 : look.ink).color))
            .font(.metal(MetalType.content))
            .padding(.leading, start)
            .padding(.trailing, end)
            .padding(.vertical, MetalCue.tagPadY)
            .background {
                if derived {
                    RoundedRectangle(cornerRadius: r.points("tag.radius"), style: .continuous)
                        .strokeBorder((r.color("inferred.ring", colorway: MetalRecipeColorway(colorway)) ?? colorway.tokens.ink3).color,
                                      style: StrokeStyle(lineWidth: r.points("inferred.dash"), dash: [MetalCueLine.dash, MetalCueLine.dash]))
                } else {
                    let edge = r.scalar("tag.edge")
                    ZStack {
                        shape.fill(look.edge.color, style: FillStyle(eoFill: true))
                        MetalTagShape(point: shape.point, radius: shape.radius, hole: shape.hole + edge, holeX: shape.holeX - edge)
                            .inset(edge)
                            .fill(look.paper.color, style: FillStyle(eoFill: true))
                    }
                }
            }
            .padding(.leading, -start)
            .padding(.trailing, -end)
            .accessibilityLabel(derived ? "\(text), suggested tag" : "\(text), tag")
    }
}

extension MetalTagShape {
    /// The same cut, `amount` inside the rect.
    func inset(_ amount: CGFloat) -> some Shape { MetalInsetTag(base: self, amount: amount) }
}

private struct MetalInsetTag: Shape {
    let base: MetalTagShape
    let amount: CGFloat
    func path(in rect: CGRect) -> Path { base.path(in: rect.insetBy(dx: amount, dy: amount)) }
}

enum MetalCueLine {
    /// The dash of an inferred line, as on the web (2 on, 2 off).
    static let dash: CGFloat = 2
}

/// A recognised chunk as a view: the glyph before the words, the kind's line under them, and the
/// moment of recognition when `fresh`. The chip (the glyph's name, then `resolved`) shows on hover and,
/// for a fresh date, once.
public struct MetalCueMark: View {
    let text: String
    let kind: MetalCueKind
    let resolved: String?
    let label: String?
    let glyph: MetalCueGlyph
    let hex: MetalRGBA?
    let fresh: Bool
    let inferred: Bool
    let raw: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var drawn: CGFloat
    @State private var popped: Bool
    @State private var turned: Bool
    @State private var acting = false
    @State private var chipOnce = false
    @State private var hovering = false

    public init(_ text: String, kind: MetalCueKind, resolved: String? = nil, label: String? = nil, glyph: MetalCueGlyph = .kind,
                hex: MetalRGBA? = nil, fresh: Bool = false, inferred: Bool = false, raw: Bool = false) {
        self.text = text
        self.kind = kind
        self.resolved = resolved
        self.label = label
        self.glyph = glyph
        self.hex = hex
        self.fresh = fresh
        self.inferred = inferred
        self.raw = raw
        _drawn = State(initialValue: fresh ? .zero : 1)
        _popped = State(initialValue: !fresh)
        _turned = State(initialValue: !fresh || kind != .amount)
    }

    private var hasGlyph: Bool {
        switch glyph {
        case .none: return false
        case .kind: return kind == .date || kind == .duration || kind == .hex
        default: return true
        }
    }

    private var name: String? {
        label ?? (hasGlyph ? ["Date", "Duration", "Amount", "Measure", "Tag", "Tag", "Colour", "Person"][[MetalCueKind.date, .duration, .amount, .measurement, .tag, .derivedTag, .hex, .person].firstIndex(of: kind) ?? 0] : nil)
    }

    private var chip: String? {
        switch (name, resolved) {
        case let (n?, v?): return "\(n) · \(v)".uppercased()
        case let (n?, nil): return n.uppercased()
        case let (nil, v?): return v.uppercased()
        default: return nil
        }
    }

    @ViewBuilder private var glyphView: some View {
        let r = MetalRecipes.mark
        let size = r.points("glyph.size")
        switch glyph {
        case .none: EmptyView()
        case .icon(let icon): MetalIcon(icon, size: size)
        case .life(let icon): MetalLifeIcon(icon, size: size)
        case .person(let who):
            // The avatar at the glyph's size: the regular disc, scaled.
            let side = r.points("glyph.person")
            MetalAvatar(name: who)
                .scaleEffect(side / MetalRecipes.avatar.points("size.regular"))
                .frame(width: side, height: side)
        case .kind:
            if kind == .hex {
                RoundedRectangle(cornerRadius: MetalCue.swatchRadius, style: .continuous)
                    .fill((hex ?? colorway.tokens.ink3).color)
                    .frame(width: MetalCue.swatch, height: MetalCue.swatch)
                    .metalObjectRecipe(r, part: "swatch", in: RoundedRectangle(cornerRadius: MetalCue.swatchRadius, style: .continuous))
            } else if kind == .date || kind == .duration {
                MetalIcon(.clock, size: size)
            }
        }
    }

    @ViewBuilder private var line: some View {
        let r = MetalRecipes.mark, cw = MetalRecipeColorway(colorway)
        switch kind {
        case .tag, .derivedTag, .person: EmptyView()
        default:
            let thickness: CGFloat = switch kind {
            case .date, .duration: r.points("groove.thickness")
            case .measurement: r.points("line.body")
            case .hex: r.points("line.hex")
            default: r.points("line.thickness")
            }
            let ink: MetalRGBA = switch kind {
            case .date, .duration: r.color("groove.ink", colorway: cw) ?? colorway.tokens.cueQuiet
            case .measurement: MetalCue.measureUnderline
            case .hex: (hex ?? colorway.tokens.ink3).withAlpha(MetalCue.hexMix)
            default: colorway.tokens.cueQuiet
            }
            VStack(spacing: .zero) {
                if inferred {
                    Rectangle().fill(.clear).frame(height: thickness)
                        .overlay(Line().stroke((r.color("inferred.ring", colorway: cw) ?? ink).color,
                                               style: StrokeStyle(lineWidth: thickness, dash: [MetalCueLine.dash, MetalCueLine.dash])))
                } else {
                    Rectangle().fill(ink.color).frame(height: thickness)
                    if kind == .date || kind == .duration {
                        Rectangle().fill((r.color("groove.lip", colorway: cw) ?? ink).color).frame(height: thickness)
                    }
                }
            }
            .scaleEffect(x: drawn, y: 1, anchor: .leading)
        }
    }

    private struct Line: Shape {
        func path(in rect: CGRect) -> Path {
            var p = Path()
            p.move(to: CGPoint(x: rect.minX, y: rect.midY))
            p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
            return p
        }
    }

    public var body: some View {
        let r = MetalRecipes.mark
        let offset = r.points("line.offset")
        HStack(alignment: .firstTextBaseline, spacing: r.points("glyph.gap")) {
            if hasGlyph {
                glyphView
                    .foregroundStyle(colorway.tokens.ink.color)
                    .alignmentGuide(.firstTextBaseline) { d in d[.bottom] + r.points("glyph.drop") }
                    .scaleEffect(popped ? 1 : r.scalar("motion.pop"))
                    .opacity(popped && !raw ? .one : .zero)
                    .metalIconInteraction(acting ? MetalIconInteraction(isHovered: true) : nil)
            }
            Text(text)
                .font(.metal(MetalType.content))
                .foregroundColor((inferred && !raw ? colorway.tokens.ink2 : colorway.tokens.ink).color)
                .offset(y: turned ? .zero : MetalCue.chipRise)
                .opacity(turned ? .one : .zero)
                .overlay(alignment: Alignment(horizontal: .leading, vertical: .firstTextBaseline)) {
                    line.opacity(raw ? .zero : .one).alignmentGuide(.firstTextBaseline) { _ in -offset }
                }
        }
        .overlay(alignment: .top) {
            if let chip, hovering || chipOnce, !raw {
                Text(chip)
                    .font(.metal(r.typeRole("chip.font", trackingKey: "chip.tracking")))
                    .foregroundColor(MetalCue.chipInk.color)
                    .padding(.horizontal, MetalCue.chipPadX)
                    .padding(.vertical, MetalCue.chipPadY)
                    .metalFrost(.graphite, in: Capsule(style: .continuous))
                    .fixedSize()
                    .alignmentGuide(.top) { d in d[.bottom] + MetalCue.chipGap }
                    .transition(.opacity)
                    .allowsHitTesting(false)
            }
        }
        .onHover { hovering = $0 }
        .metalAnimation(.part, value: hovering)
        .metalAnimation(.settle, value: raw)
        .onAppear(perform: recognise)
        .accessibilityElement(children: .combine)
        .accessibilityLabel([text, name, resolved].compactMap { $0 }.joined(separator: ", "))
    }

    /// The moment of recognition, once.
    private func recognise() {
        guard fresh, drawn == .zero || !popped else { return }
        guard !reduceMotion else { drawn = 1; popped = true; turned = true; return }
        let r = MetalRecipes.mark
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { drawn = 1; turned = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + r.durationSeconds("motion.glyph-delay")) {
            withMetalAnimation(.object, reduceMotion: reduceMotion) { popped = true }
            acting = true
            DispatchQueue.main.asyncAfter(deadline: .now() + r.durationSeconds("motion.act")) { acting = false }
        }
        if kind == .date, resolved != nil {
            withMetalAnimation(.part, reduceMotion: reduceMotion) { chipOnce = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + r.durationSeconds("motion.chip-hold")) {
                withMetalAnimation(.release, reduceMotion: reduceMotion) { chipOnce = false }
            }
        }
    }
}

extension MetalRGBA {
    /// The same colour at `alpha` of its own opacity.
    func withAlpha(_ share: Double) -> MetalRGBA { MetalRGBA(red, green, blue, alpha * share) }
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

/// A value the recognizer read that is not in the text: a dashed pill in the label role, a suggestion
/// until confirmed. With `onConfirm` it is a button; confirming stamps it solid with a small press and
/// one sparkle (none under Reduce Motion).
public struct MetalCueInferred: View {
    let text: String
    let confirmed: Bool
    let onConfirm: (() -> Void)?
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pressed = false
    @State private var sparkle = false

    public init(_ text: String, confirmed: Bool = false, onConfirm: (() -> Void)? = nil) {
        self.text = text
        self.confirmed = confirmed
        self.onConfirm = onConfirm
    }

    public var body: some View {
        let r = MetalRecipes.mark, cw = MetalRecipeColorway(colorway)
        let ring = (confirmed ? r.color("inferred.confirmed", colorway: cw) : r.color("inferred.ring", colorway: cw)) ?? colorway.tokens.ink3
        let shape = Capsule(style: .continuous)
        let pill = Text(text.uppercased())
            .font(.metal(MetalType.readout))
            .tracking(MetalType.readout.trackingPoints)
            .foregroundColor((confirmed ? colorway.tokens.ink : colorway.tokens.ink2).color)
            .padding(.horizontal, MetalCue.inferredPad)
            .frame(height: MetalCue.inferredHeight)
            .overlay {
                shape.strokeBorder(ring.color, style: StrokeStyle(lineWidth: r.points("inferred.dash"), dash: confirmed ? [] : [MetalCueLine.dash, MetalCueLine.dash]))
            }
            .overlay(alignment: .topTrailing) {
                if sparkle { MetalCueSparkle() }
            }
            .scaleEffect(pressed ? r.scalar("motion.stamp") : 1)
            .onChange(of: confirmed) { was, now in
                guard !was, now, !reduceMotion else { return }
                withMetalAnimation(.part, reduceMotion: reduceMotion) { pressed = true }
                sparkle = true
                DispatchQueue.main.asyncAfter(deadline: .now() + MetalSpringClass.part.spring.duration / 3) {
                    withMetalAnimation(.part, reduceMotion: reduceMotion) { pressed = false }
                }
            }
        if let onConfirm, !confirmed {
            Button(action: onConfirm) { pill }
                .buttonStyle(.plain)
                .accessibilityLabel("Confirm \(text)")
        } else {
            pill
        }
    }
}

/// One four-point sparkle: grows and turns on the object spring, then fades on release, once.
struct MetalCueSparkle: View {
    @State private var grown = false
    @State private var gone = false

    var body: some View {
        let size = MetalRecipes.mark.points("motion.sparkle")
        MetalSparkleShape()
            .fill(MetalShared.green.color)
            .frame(width: size, height: size)
            .scaleEffect(grown ? 1 : 0.001)
            .rotationEffect(.degrees(grown ? .zero : -45))
            .opacity(gone ? .zero : .one)
            .offset(x: size / 2, y: -size * 0.6)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
            .onAppear {
                withAnimation(MetalSpringClass.object.spring.animation) { grown = true }
                DispatchQueue.main.asyncAfter(deadline: .now() + MetalRecipes.mark.durationSeconds("motion.sparkle-ms")) {
                    withAnimation(MetalSpringClass.release.spring.animation) { gone = true }
                }
            }
    }
}

private struct MetalSparkleShape: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width, h = rect.height
        let pts = [(0.5, 0.0), (0.61, 0.39), (1.0, 0.5), (0.61, 0.61), (0.5, 1.0), (0.39, 0.61), (0.0, 0.5), (0.39, 0.39)]
        var p = Path()
        for (i, (x, y)) in pts.enumerated() {
            let pt = CGPoint(x: rect.minX + x * w, y: rect.minY + y * h)
            if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
        }
        p.closeSubpath()
        return p
    }
}

/// The life glyph trailing a block, for the whole line's kind: a middle dot, then the glyph at 16 (tuned
/// cut), ink3 at rest, its `label` on hover. `fresh`: the glyph plays its own act once.
public struct MetalCueLife: View {
    let icon: MetalLifeIconName
    let label: String?
    let fresh: Bool
    @Environment(\.metalColorway) private var colorway
    @Environment(\.metalIconInteraction) private var hostInteraction
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var ownHover = false
    @State private var acting = false

    public init(_ icon: MetalLifeIconName, label: String? = nil, fresh: Bool = false) {
        self.icon = icon
        self.label = label
        self.fresh = fresh
    }

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
                .metalIconInteraction(acting ? MetalIconInteraction(isHovered: true) : nil)
        }
        .onHover { ownHover = $0 }
        .help(label ?? icon.label)
        .onAppear {
            guard fresh, !reduceMotion else { return }
            acting = true
            DispatchQueue.main.asyncAfter(deadline: .now() + MetalRecipes.mark.durationSeconds("motion.act")) { acting = false }
        }
        .accessibilityLabel(label ?? icon.label)
    }
}
