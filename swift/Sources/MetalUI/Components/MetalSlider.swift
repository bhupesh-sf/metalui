#if canImport(AppKit)
import AppKit
#else
import UIKit
#endif
import SwiftUI

public struct MetalSliderTick: Identifiable, Sendable {
    public let at: Double
    public let label: String
    public var id: Double { at }

    public init(at: Double, label: String) {
        self.at = at
        self.label = label
    }
}

/// The slider's sizes: the groove's thickness and the knob together, with the end glyphs and the gap
/// beside the groove (tokens.json `recipes.slider.props.compact | regular | large`).
public enum MetalSliderSize: String, CaseIterable, Sendable {
    case compact
    case regular
    case large
}

/// Horizontal (the default), or vertical: the minimum at the bottom, ↑ increases.
public enum MetalSliderOrientation: Sendable {
    case horizontal
    case vertical
}

/// The fill: green (an amount someone set, the default) or ink (anything else: a place in a song).
public enum MetalSliderTone: Sendable {
    case green
    case ink
}

/// How tick labels are set: the meta type at ink2 (readable on any surface, the default), or engraved
/// for a host that engraves its own scale (the time scrubber's weekdays).
public enum MetalSliderTickStyle: Sendable {
    case meta
    case engraved
}

/// Where a point of the travel lands in the control: along the axis from the minimum's end, mirrored
/// right to left, and up from the bottom when vertical.
private struct MetalSliderAxis {
    let vertical: Bool
    let mirrored: Bool
    let length: CGFloat
    let centre: CGFloat

    func point(_ along: CGFloat) -> CGPoint {
        vertical ? CGPoint(x: centre, y: length - along) : CGPoint(x: mirrored ? length - along : along, y: centre)
    }

    /// How far along the travel a point in the control is.
    func along(_ location: CGPoint) -> CGFloat {
        vertical ? length - location.y : mirrored ? length - location.x : location.x
    }
}

/// Places the knob at a fraction of its travel. The fraction is what animates and it is clamped every
/// frame, so a jump that overshoots on the part spring stops flush against the groove's end instead
/// of carrying the knob past it (the web clamps the same way).
private struct MetalSliderKnobAlong: ViewModifier, Animatable {
    var fraction: Double
    let knob: CGFloat
    let travel: CGFloat
    let axis: MetalSliderAxis

    var animatableData: Double {
        get { fraction }
        set { fraction = newValue }
    }

    func body(content: Content) -> some View {
        let at = axis.point(knob / 2 + min(max(fraction, .zero), .one) * travel)
        content.position(x: at.x, y: at.y)
    }
}

/// Sizes the fill from `lo` to `hi` of the travel (each clamped every frame). From the groove's start
/// when `between` is off; from a knob's centre (the lower knob, or the origin) when it is on.
private struct MetalSliderFillAlong: ViewModifier, Animatable {
    var lo: Double
    var hi: Double
    let between: Bool
    let knob: CGFloat
    let travel: CGFloat
    let track: CGFloat
    let axis: MetalSliderAxis

    var animatableData: AnimatablePair<Double, Double> {
        get { AnimatablePair(lo, hi) }
        set { lo = newValue.first; hi = newValue.second }
    }

    func body(content: Content) -> some View {
        let clamp = { (f: Double) in min(max(f, .zero), .one) }
        let start = between ? knob / 2 + clamp(lo) * travel : .zero
        let end = knob / 2 + clamp(hi) * travel
        let length = max(track, end - start)
        let middle = axis.point(start + length / 2)
        content
            .frame(width: axis.vertical ? track : length, height: axis.vertical ? length : track)
            .position(x: middle.x, y: middle.y)
    }
}

/// A value on a generated well track. Marks (notches cut across the groove) and labelled ticks are
/// fractions of its span; a drag follows the pointer while keys and track jumps use the part spring.
///
/// Geometry, the same as the web slider: the groove is the full length W; the knob (K across)
/// travels K/2 … W − K/2, so at either end it sits flush with the groove's rounded end and never
/// hangs outside it. The fill runs to the knob's centre; marks and ticks use the same travel.
///
/// Kinds, as on the web: a range (`range:`, two knobs, the fill between them; Tab and Shift-Tab move
/// between the knobs, the arrows move the one chosen), `orientation: .vertical` (the minimum at the
/// bottom), `detents` (a notch at every step; the knob clicks stop to stop on the part spring even
/// while dragged, with the trackpad's level-change haptic), `origin` (the fill grows from it, either
/// way), `tone: .ink`, and `bubble` (the value on the tooltip's chip over the knob while it is dragged).
/// Right to left it mirrors; the arrows and the refusal follow.
///
/// States, as on the web: hover lifts the knob (settle spring, a longer shadow), pressing or dragging
/// presses it (a tight shadow), the knob grows away from the nearer end so it never pokes past the
/// groove, keyboard focus rings the knob, `.disabled(true)` dims it to 40 % and takes no input, and an
/// arrow pushing past an end nudges the groove one nest that way on the refusal spring (none under
/// Reduce Motion). The readout turns on the drum (the settle spring); Reduce Motion crossfades it.
public struct MetalSlider: View {
    @Binding var values: [Double]
    let range: ClosedRange<Double>
    let step: Double
    let largeStep: Double
    let marks: [Double]
    let ticks: [MetalSliderTick]
    let tickStyle: MetalSliderTickStyle
    let size: MetalSliderSize
    let orientation: MetalSliderOrientation
    let detents: Bool
    let origin: Double?
    let tone: MetalSliderTone
    let bubble: Bool
    let startIcon: MetalIconName?
    let endIcon: MetalIconName?
    let showsValue: Bool
    let label: String
    let valueText: (Double) -> String
    let onFocusChange: ((Bool) -> Void)?
    let onDragChange: ((Bool) -> Void)?
    let isExternallyDragging: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.layoutDirection) private var direction
    @FocusState private var focused: Bool
    /// Focus came from the keyboard (Tab, arrows): only then is the ring drawn, never after a press.
    @State private var keyboardFocus = false
    @State private var dragging = false
    @State private var hovering = false
    /// The knob the keys move and the bubble stands over: the last one dragged or tabbed to.
    @State private var active = 0
    /// Each refusal counts up; its direction is the way the groove nudges (a unit on one axis).
    @State private var refusals = 0
    @State private var refusalDirection = CGSize(width: .one, height: .zero)

    /// One knob on `value`.
    public init(value: Binding<Double>, in range: ClosedRange<Double>,
                step: Double, largeStep: Double, marks: [Double] = [],
                ticks: [MetalSliderTick] = [], tickStyle: MetalSliderTickStyle = .meta,
                size: MetalSliderSize = .regular,
                orientation: MetalSliderOrientation = .horizontal,
                detents: Bool = false, origin: Double? = nil,
                tone: MetalSliderTone = .green, bubble: Bool = false,
                startIcon: MetalIconName? = nil, endIcon: MetalIconName? = nil,
                showsValue: Bool = false,
                label: String,
                valueText: @escaping (Double) -> String,
                onFocusChange: ((Bool) -> Void)? = nil,
                onDragChange: ((Bool) -> Void)? = nil,
                isExternallyDragging: Bool = false) {
        self.init(values: Binding(get: { [value.wrappedValue] }, set: { value.wrappedValue = $0[0] }),
                  range: range, step: step, largeStep: largeStep, marks: marks, ticks: ticks, tickStyle: tickStyle,
                  size: size, orientation: orientation, detents: detents, origin: origin, tone: tone, bubble: bubble,
                  startIcon: startIcon, endIcon: endIcon, showsValue: showsValue, label: label, valueText: valueText,
                  onFocusChange: onFocusChange, onDragChange: onDragChange, isExternallyDragging: isExternallyDragging)
    }

    /// Two knobs on a span: `selection` is lower…upper; they push each other and never cross.
    public init(range selection: Binding<ClosedRange<Double>>, in range: ClosedRange<Double>,
                step: Double, largeStep: Double, marks: [Double] = [],
                ticks: [MetalSliderTick] = [], tickStyle: MetalSliderTickStyle = .meta,
                size: MetalSliderSize = .regular,
                orientation: MetalSliderOrientation = .horizontal,
                detents: Bool = false,
                tone: MetalSliderTone = .green, bubble: Bool = false,
                startIcon: MetalIconName? = nil, endIcon: MetalIconName? = nil,
                showsValue: Bool = false,
                label: String,
                valueText: @escaping (Double) -> String,
                onFocusChange: ((Bool) -> Void)? = nil,
                onDragChange: ((Bool) -> Void)? = nil) {
        self.init(values: Binding(get: { [selection.wrappedValue.lowerBound, selection.wrappedValue.upperBound] },
                                  set: { selection.wrappedValue = min($0[0], $0[1])...max($0[0], $0[1]) }),
                  range: range, step: step, largeStep: largeStep, marks: marks, ticks: ticks, tickStyle: tickStyle,
                  size: size, orientation: orientation, detents: detents, origin: nil, tone: tone, bubble: bubble,
                  startIcon: startIcon, endIcon: endIcon, showsValue: showsValue, label: label, valueText: valueText,
                  onFocusChange: onFocusChange, onDragChange: onDragChange, isExternallyDragging: false)
    }

    private init(values: Binding<[Double]>, range: ClosedRange<Double>, step: Double, largeStep: Double,
                 marks: [Double], ticks: [MetalSliderTick], tickStyle: MetalSliderTickStyle,
                 size: MetalSliderSize, orientation: MetalSliderOrientation, detents: Bool, origin: Double?,
                 tone: MetalSliderTone, bubble: Bool, startIcon: MetalIconName?, endIcon: MetalIconName?,
                 showsValue: Bool, label: String, valueText: @escaping (Double) -> String,
                 onFocusChange: ((Bool) -> Void)?, onDragChange: ((Bool) -> Void)?, isExternallyDragging: Bool) {
        _values = values
        self.range = range
        self.step = step
        self.largeStep = largeStep
        self.marks = marks
        self.ticks = ticks
        self.tickStyle = tickStyle
        self.size = size
        self.orientation = orientation
        self.detents = detents
        self.origin = origin
        self.tone = tone
        self.bubble = bubble
        self.startIcon = startIcon
        self.endIcon = endIcon
        self.showsValue = showsValue
        self.label = label
        self.valueText = valueText
        self.onFocusChange = onFocusChange
        self.onDragChange = onDragChange
        self.isExternallyDragging = isExternallyDragging
    }

    private var span: Double { max(.leastNonzeroMagnitude, range.upperBound - range.lowerBound) }
    private func clamp(_ fraction: Double) -> Double { min(max(fraction, .zero), .one) }
    private func fraction(_ value: Double) -> Double { clamp((value - range.lowerBound) / span) }
    private var fractions: [Double] { values.map(fraction) }
    private var isRange: Bool { values.count > 1 }
    private var vertical: Bool { orientation == .vertical }
    private var mirrored: Bool { direction == .rightToLeft && !vertical }
    private var activeIndex: Int { min(active, values.count - 1) }
    /// The fill's ends: between the knobs, or between the origin and the knob, or from the start.
    private var originFraction: Double? { isRange ? nil : origin.map(fraction) }
    private var between: Bool { isRange || originFraction != nil }
    private var lo: Double { isRange ? fractions[0] : originFraction.map { min($0, fractions[0]) } ?? .zero }
    private var hi: Double { isRange ? fractions[1] : originFraction.map { max($0, fractions[0]) } ?? fractions[0] }

    /// Detents notch every step inside the ends, up to this many; past it a stop is too fine to feel.
    private static let maxDetents = 24
    private var stops: [Double] {
        guard detents, step > .zero else { return [] }
        let count = Int((span / step).rounded())
        guard count > 1, count <= Self.maxDetents else { return [] }
        return (1..<count).map { range.lowerBound + Double($0) * step }
    }
    /// Every notch: the host's marks, the detents and the origin.
    private var notches: [Double] { marks + stops.map(fraction) + (originFraction.map { [$0] } ?? []) }

    /// A value on a detent when there are detents, inside the range always.
    private func settle(_ next: Double) -> Double {
        let snapped = detents && step > .zero ? range.lowerBound + ((next - range.lowerBound) / step).rounded() * step : next
        return min(max(snapped, range.lowerBound), range.upperBound)
    }

    /// Moves one knob; in a range it pushes the other rather than crossing it.
    private func set(_ index: Int, _ next: Double) {
        var all = values
        let value = settle(next)
        all[index] = value
        if isRange {
            if index == 0, value > all[1] { all[1] = value }
            if index == 1, value < all[0] { all[0] = value }
        }
        if all != values { values = all }
    }

    /// A key that pushes past an end: the value stays, and the groove says no with a nudge toward
    /// that end (left for the maximum right to left, up when vertical).
    private func push(_ delta: Double) {
        let index = activeIndex
        let value = values[index]
        let atEnd = delta > .zero ? value >= range.upperBound : value <= range.lowerBound
        if atEnd {
            guard MetalMotion.resolve(.refusal, reduceMotion: reduceMotion).allowsTravel else { return }
            let toward: CGFloat = delta > .zero ? .one : -.one
            refusalDirection = vertical ? CGSize(width: .zero, height: -toward) : CGSize(width: mirrored ? -toward : toward, height: .zero)
            refusals += 1
        } else {
            set(index, value + delta)
        }
    }

    /// One arrow: ↑ and → increase (→ decreases right to left), ↓ and ← decrease.
    private func arrow(_ sign: Double, _ press: KeyPress) -> KeyPress.Result {
        keyboardFocus = true
        push(sign * (press.modifiers.contains(.shift) ? largeStep : step))
        return .handled
    }

    /// A number of the slider's size (`track`, `knob`, `glyph`, `gap`).
    private func metric(_ key: String) -> CGFloat { MetalRecipes.slider.points("\(size.rawValue).\(key)") }

    /// What the readout and the accessibility value say: one value, or a range's two joined.
    private func words(_ all: [Double], joiner: String = "–") -> String { all.map(valueText).joined(separator: joiner) }

    public var body: some View {
        let layout = vertical
            ? AnyLayout(VStackLayout(spacing: metric("gap")))
            : AnyLayout(HStackLayout(spacing: metric("gap")))
        layout {
            // Vertical reads from the top: the value, the end's glyph, the groove, the start's glyph.
            if vertical {
                if showsValue { readout }
                if let endIcon { glyph(endIcon, atEnd: fractions.last == .one) }
                control
                if let startIcon { glyph(startIcon, atEnd: fractions.first == .zero) }
            } else {
                if let startIcon { glyph(startIcon, atEnd: fractions.first == .zero) }
                control
                if let endIcon { glyph(endIcon, atEnd: fractions.last == .one) }
                if showsValue { readout }
            }
        }
        // Vertical ticks hang to the right of the groove (the bubble to its left): keep room for them
        // outside the column, so the glyphs and the value stay centred on the groove.
        .padding(direction == .rightToLeft ? .leading : .trailing,
                 vertical && !ticks.isEmpty ? MetalRecipes.slider.points("vertical.label") : .zero)
        // Disabled: the whole slider, glyphs and value too, at the recipe's 40 %.
        .opacity(isEnabled ? .one : MetalRecipes.slider.scalar("self.disabled"))
        // Focus by keyboard navigation only, like NSSlider: a click or a host
        // taking the keyboard never parks typing here.
        .focusable(interactions: .activate)
        // No system ring: MetalUI's own ring, and only for keyboard focus.
        .focusEffectDisabled()
        .focused($focused)
        .onChange(of: focused) { _, isFocused in
            #if os(macOS)
            keyboardFocus = isFocused && NSApp.currentEvent?.type == .keyDown
            #endif
            onFocusChange?(isFocused)
        }
        // Detents: each stop the value lands on plays the trackpad's level-change haptic, once.
        .onChange(of: values) { _, _ in
            guard detents else { return }
            #if os(macOS)
            NSHapticFeedbackManager.defaultPerformer.perform(.levelChange, performanceTime: .now)
            #endif
        }
        .onKeyPress(.leftArrow, phases: .down) { arrow(mirrored ? .one : -.one, $0) }
        .onKeyPress(.rightArrow, phases: .down) { arrow(mirrored ? -.one : .one, $0) }
        .onKeyPress(.upArrow, phases: .down) { arrow(.one, $0) }
        .onKeyPress(.downArrow, phases: .down) { arrow(-.one, $0) }
        .onKeyPress(.home) {
            let floor = isRange && activeIndex == 1 ? values[0] : range.lowerBound
            values[activeIndex] <= range.lowerBound ? push(-step) : set(activeIndex, floor)
            return .handled
        }
        .onKeyPress(.end) {
            let ceiling = isRange && activeIndex == 0 ? values[1] : range.upperBound
            values[activeIndex] >= range.upperBound ? push(step) : set(activeIndex, ceiling)
            return .handled
        }
        // A range is two stops for Tab: forward from the lower knob to the upper, back the other way,
        // and on out of the slider from either end.
        .onKeyPress(.tab, phases: .down) { press in
            guard isRange else { return .ignored }
            let back = press.modifiers.contains(.shift)
            guard back ? activeIndex == 1 : activeIndex == 0 else { return .ignored }
            keyboardFocus = true
            active = back ? 0 : 1
            return .handled
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(isRange ? "\(label), \(activeIndex == 0 ? "minimum" : "maximum")" : label)
        .accessibilityValue(isRange ? words(values, joiner: " to ") : valueText(values[0]))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: set(activeIndex, values[activeIndex] + step)
            case .decrement: set(activeIndex, values[activeIndex] - step)
            @unknown default: break
            }
        }
    }

    /// An end's glyph at ink2. It plays its act as the value arrives at its end.
    private func glyph(_ icon: MetalIconName, atEnd: Bool) -> some View {
        MetalIcon(icon, size: metric("glyph"), interaction: MetalIconInteraction(isPressed: atEnd))
            .foregroundStyle(colorway.tokens.ink2.color)
    }

    /// Detents and few steps measure every value; many, the ends (numbers grow toward them).
    private static let measureAll = 24

    /// The value beside the groove (above it when vertical), in the figure type. It keeps the width of
    /// its widest value so the groove never moves, and its digits turn on the drum as it changes (the
    /// settle spring; Reduce Motion crossfades).
    private var readout: some View {
        let count = step > .zero ? Int((span / step).rounded(.down)) : .zero
        let each = !isRange && count > .zero && count <= Self.measureAll
            ? (0...count).map { range.lowerBound + Double($0) * step }
            : [range.lowerBound, range.upperBound]
        return ZStack(alignment: vertical ? .center : .trailing) {
            ForEach(Array(each.enumerated()), id: \.offset) { _, value in
                Text(words(Array(repeating: value, count: values.count))).hidden()
            }
            Text(words(values))
                .contentTransition(reduceMotion ? .opacity : .numericText(value: values.last ?? .zero))
                .foregroundStyle(colorway.tokens.ink.color)
        }
        .font(.metal(MetalType.figure))
        .monospacedDigit()
        .metalAnimation(.settle, value: values)
        .accessibilityHidden(true)
    }

    /// The value on the tooltip's chip over the knob (to its left when vertical).
    private func bubbleChip(_ index: Int) -> some View {
        let tip = MetalRecipes.tooltip
        let recipe = MetalRecipes.slider
        let shown = dragging && index == activeIndex
        return Text(valueText(values[index]))
            .font(.metal(MetalType.figure))
            .monospacedDigit()
            .foregroundStyle((tip.color("self.ink", colorway: MetalRecipeColorway(colorway)) ?? colorway.tokens.ink).color)
            .lineLimit(1)
            .fixedSize()
            .padding(.horizontal, recipe.points("bubble.pad-x"))
            .padding(.vertical, recipe.points("bubble.pad-y"))
            .metalObjectRecipe(tip, part: "self", in: RoundedRectangle(cornerRadius: recipe.points("bubble.radius"), style: .continuous))
            .scaleEffect(shown ? .one : recipe.scalar("bubble.rest"), anchor: vertical ? .trailing : .bottom)
            .opacity(shown ? .one : .zero)
            .metalAnimation(.settle, value: shown)
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }

    private var control: some View {
        let recipe = MetalRecipes.slider
        let finish = MetalRecipeColorway(colorway)
        let track = metric("track")
        let knob = metric("knob")
        return GeometryReader { geometry in
            let length = vertical ? geometry.size.height : geometry.size.width
            let cross = vertical ? geometry.size.width : geometry.size.height
            let axis = MetalSliderAxis(vertical: vertical, mirrored: mirrored, length: length, centre: cross / 2)
            // One travel for the knobs, the fill's ends, the marks and the ticks.
            let travel = max(.zero, length - knob)
            let along = { (f: Double) in knob / 2 + clamp(f) * travel }
            let knobAt = { (i: Int) in
                MetalSliderKnobAlong(fraction: fractions[i], knob: knob, travel: travel, axis: axis)
            }
            ZStack(alignment: .topLeading) {
                // The visible well is thin; the entire control remains a drag
                // surface, including space beside the track and knob.
                Color.clear.frame(width: geometry.size.width, height: geometry.size.height)
                Color.clear
                    .metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: Capsule())
                    .frame(width: vertical ? track : length, height: vertical ? length : track)
                    .position(axis.point(length / 2))
                Color.clear
                    .metalObjectRecipe(recipe, part: "fill", state: tone == .ink ? "ink" : nil, in: Capsule())
                    .modifier(MetalSliderFillAlong(lo: lo, hi: hi, between: between, knob: knob, travel: travel, track: track, axis: axis))
                // Marks are notches cut across the groove: the groove's full thickness.
                Canvas { context, _ in
                    let markWidth = recipe.points("mark.w")
                    let radius = recipe.points("mark.radius")
                    let color = (recipe.color("mark.color", colorway: finish) ?? colorway.tokens.scrubberMark).color
                    for mark in notches {
                        let at = axis.point(along(mark))
                        let size = vertical ? CGSize(width: track, height: markWidth) : CGSize(width: markWidth, height: track)
                        let rect = CGRect(x: at.x - size.width / 2, y: at.y - size.height / 2, width: size.width, height: size.height)
                        context.fill(Path(roundedRect: rect, cornerRadius: radius), with: .color(color))
                    }
                }
                .frame(width: geometry.size.width, height: geometry.size.height)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
                // Each tick hangs a gap from the groove (under it; to its right when
                // vertical): a short line, then its label, on the travel.
                let gap = recipe.points("tick.gap")
                let tickColor = (recipe.color("tick.color", colorway: finish) ?? colorway.tokens.scrubberDayTick).color
                ForEach(ticks) { tick in
                    let at = axis.point(along(tick.at))
                    Group {
                        if vertical {
                            HStack(spacing: gap) {
                                Rectangle().fill(tickColor)
                                    .frame(width: recipe.points("tick.h"), height: recipe.points("tick.w"))
                                tickLabel(tick.label)
                            }
                        } else {
                            VStack(spacing: gap) {
                                Rectangle().fill(tickColor)
                                    .frame(width: recipe.points("tick.w"), height: recipe.points("tick.h"))
                                tickLabel(tick.label)
                            }
                        }
                    }
                    .fixedSize()
                    // hung from a point, so a wide label at an end never widens the control
                    .frame(width: .zero, height: .zero, alignment: vertical ? .leading : .top)
                    .position(x: vertical ? axis.centre + track / 2 + gap : at.x,
                              y: vertical ? at.y : axis.centre + track / 2 + gap)
                    .accessibilityHidden(true)
                }
                // Clear, so only the recipe paints: a bare Circle would fill black over it. The face
                // lifts on hover and presses while held, growing away from the nearer end.
                let knobState: String? = dragging ? "press" : hovering ? "hover" : nil
                ForEach(values.indices, id: \.self) { i in
                    let f = fractions[i]
                    let anchor = vertical ? UnitPoint(x: UnitPoint.center.x, y: .one - f) : UnitPoint(x: mirrored ? .one - f : f, y: UnitPoint.center.y)
                    Color.clear
                        .metalObjectRecipe(recipe, part: "knob", state: knobState, in: Circle())
                        .frame(width: knob, height: knob)
                        .scaleEffect(dragging && i == activeIndex ? recipe.scalar("knob.press") : hovering ? recipe.scalar("knob.lift") : .one,
                                     anchor: anchor)
                        .metalAnimation(.settle, value: knobState)
                        .overlay {
                            // Keyboard focus rings the knob the keys move.
                            if focused && keyboardFocus && i == activeIndex {
                                Circle()
                                    .inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2))
                                    .stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                                    .allowsHitTesting(false)
                            }
                        }
                        // A host that passes presses through must know where the knob is drawn.
                        .metalHitRegion()
                        .modifier(knobAt(i))
                        .accessibilityHidden(true)
                }
                if bubble {
                    ForEach(values.indices, id: \.self) { i in
                        let gapBubble = recipe.points("bubble.gap")
                        bubbleChip(i)
                            .frame(width: .zero, height: .zero, alignment: vertical ? .trailing : .bottom)
                            .offset(x: vertical ? -(knob / 2 + gapBubble) : .zero, y: vertical ? .zero : -(knob / 2 + gapBubble))
                            .modifier(knobAt(i))
                    }
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
            // The whole control is the drag surface; the knob never leaves it.
            .contentShape(Rectangle())
            // The web slider's cursors: a pointing hand over the track, an open hand on a
            // knob, a closed hand while dragging.
            .onContinuousHover { phase in
                guard !dragging else { return }
                switch phase {
                case let .active(point):
                    hovering = true
                    let pointer = axis.along(point)
                    let crossOff = vertical ? abs(point.x - axis.centre) : abs(point.y - axis.centre)
                    let overKnob = crossOff <= knob / 2 && fractions.contains { abs(pointer - along($0)) <= knob / 2 }
                    (overKnob ? MetalCursor.openHand : .pointingHand).set()
                case .ended:
                    hovering = false
                    MetalCursor.arrow.set()
                }
            }
            .gesture(DragGesture(minimumDistance: .zero)
                .onChanged { gesture in
                    // The pointer maps onto the knob's travel, so the knob's centre stays under it.
                    let f = clamp((axis.along(gesture.location) - knob / 2) / max(.leastNonzeroMagnitude, travel))
                    if !dragging {
                        MetalCursor.closedHand.set()
                        onDragChange?(true)
                        // A range takes the nearer knob; on a tie, the one on the side pulled toward.
                        if isRange {
                            let d0 = abs(f - fractions[0]), d1 = abs(f - fractions[1])
                            active = d0 == d1 ? (f > fractions[1] ? 1 : 0) : (d0 < d1 ? 0 : 1)
                        }
                    }
                    dragging = true
                    keyboardFocus = false
                    focused = true
                    set(activeIndex, range.lowerBound + f * span)
                }
                .onEnded { _ in
                    dragging = false
                    onDragChange?(false)
                    MetalCursor.openHand.set()
                })
            // A jump rides the part spring; a drag follows the hand, except over detents (the spring
            // is the click).
            .animation((dragging && !detents) || isExternallyDragging ? nil : MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation,
                       value: values)
            // Drawn left to right and mirrored by hand (MetalSliderAxis), so the pointer, the marks and
            // the ticks agree whatever the layout direction.
            .environment(\.layoutDirection, .leftToRight)
        }
        .frame(minWidth: vertical ? knob : nil, idealWidth: vertical ? knob : nil,
               minHeight: vertical ? knob : nil, idealHeight: vertical ? recipe.points("vertical.length") : nil)
        // A refusal: one nest toward the pushed end, ringing back on the refusal spring.
        .keyframeAnimator(initialValue: Double.zero, trigger: refusals) { content, nudge in
            content.offset(x: nudge * refusalDirection.width, y: nudge * refusalDirection.height)
        } keyframes: { _ in
            KeyframeTrack {
                LinearKeyframe(MetalRadius.nest, duration: .zero)
                SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                               spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
            }
        }
    }

    @ViewBuilder
    private func tickLabel(_ label: String) -> some View {
        switch tickStyle {
        case .meta:
            Text(label).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
        case .engraved:
            MetalLabel(label, style: .engraved)
        }
    }
}
