import AppKit
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

/// A value on a generated well track. Marks and labels are fractions of its
/// span; a drag follows the pointer while keys and track jumps use the part spring.
///
/// Geometry, the same as the web slider: the groove is the full width W; the knob (K across)
/// travels K/2 … W − K/2, so at either end it sits flush with the groove's rounded end and never
/// hangs outside it. The fill runs to the knob's centre; marks and ticks use the same travel.
/// Sizes the fill, or places the knob, at a fraction of the knob's travel. The fraction is what
/// animates and it is clamped every frame, so a jump that overshoots on the part spring stops
/// flush against the groove's end instead of carrying the knob past it (the web clamps the same way).
private struct MetalSliderAlong: ViewModifier, Animatable {
    var fraction: Double
    let knob: CGFloat
    let travel: CGFloat
    let centre: CGFloat
    let track: CGFloat
    let fill: Bool

    var animatableData: Double {
        get { fraction }
        set { fraction = newValue }
    }

    func body(content: Content) -> some View {
        let x = knob / 2 + min(max(fraction, .zero), .one) * travel
        if fill {
            content
                .frame(width: max(track, x), height: track)
                .position(x: max(track, x) / 2, y: centre)
        } else {
            content.position(x: x, y: centre)
        }
    }
}

public struct MetalSlider: View {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let largeStep: Double
    let marks: [Double]
    let ticks: [MetalSliderTick]
    let label: String
    let valueText: (Double) -> String
    let onFocusChange: ((Bool) -> Void)?
    let onDragChange: ((Bool) -> Void)?
    let isExternallyDragging: Bool

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool
    /// Focus came from the keyboard (Tab, arrows): only then is the ring drawn, never after a press.
    @State private var keyboardFocus = false
    @State private var dragging = false

    public init(value: Binding<Double>, in range: ClosedRange<Double>,
                step: Double, largeStep: Double, marks: [Double] = [],
                ticks: [MetalSliderTick] = [], label: String,
                valueText: @escaping (Double) -> String,
                onFocusChange: ((Bool) -> Void)? = nil,
                onDragChange: ((Bool) -> Void)? = nil,
                isExternallyDragging: Bool = false) {
        _value = value
        self.range = range
        self.step = step
        self.largeStep = largeStep
        self.marks = marks
        self.ticks = ticks
        self.label = label
        self.valueText = valueText
        self.onFocusChange = onFocusChange
        self.onDragChange = onDragChange
        self.isExternallyDragging = isExternallyDragging
    }

    private var span: Double { max(.leastNonzeroMagnitude, range.upperBound - range.lowerBound) }
    private func clamp(_ fraction: Double) -> Double { min(max(fraction, .zero), .one) }
    private var fraction: Double { clamp((value - range.lowerBound) / span) }

    private func set(_ next: Double) { value = min(max(next, range.lowerBound), range.upperBound) }

    public var body: some View {
        let recipe = MetalRecipes.slider
        let finish = MetalRecipeColorway(colorway)
        GeometryReader { geometry in
            let width = geometry.size.width
            let centre = geometry.size.height / 2
            let track = recipe.points("track.height")
            let knob = recipe.points("knob.size")
            // One travel for the knob, the fill's end, the marks and the ticks.
            let travel = max(.zero, width - knob)
            let along = { (f: Double) in knob / 2 + clamp(f) * travel }
            let x = along(fraction)
            let place = { (fill: Bool) in
                MetalSliderAlong(fraction: fraction, knob: knob, travel: travel, centre: centre, track: track, fill: fill)
            }
            ZStack(alignment: .topLeading) {
                // The visible well is thin; the entire control remains a drag
                // surface, including space above/below the track and knob.
                Color.clear.frame(width: width, height: geometry.size.height)
                Color.clear
                    .metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: Capsule())
                    .frame(width: width, height: track)
                    .position(x: width / 2, y: centre)
                Color.clear
                    .metalObjectRecipe(recipe, part: "fill", in: Capsule())
                    .opacity(recipe.scalar("fill.opacity"))
                    .modifier(place(true))
                Canvas { context, _ in
                    let markWidth = recipe.points("mark.w")
                    let markHeight = recipe.points("mark.h")
                    let radius = recipe.points("mark.radius")
                    let color = (recipe.color("mark.color", colorway: finish) ?? colorway.tokens.scrubberMark).color
                    for mark in marks {
                        let x = along(mark)
                        let rect = CGRect(x: x - markWidth / 2, y: centre - markHeight / 2,
                                          width: markWidth, height: markHeight)
                        context.fill(Path(roundedRect: rect, cornerRadius: radius), with: .color(color))
                    }
                }
                .frame(width: width, height: geometry.size.height)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
                ForEach(ticks) { tick in
                    VStack(spacing: .zero) {
                        Rectangle()
                            .fill((recipe.color("tick.color", colorway: finish) ?? colorway.tokens.scrubberDayTick).color)
                            .frame(width: recipe.points("tick.w"), height: recipe.points("tick.h"))
                        MetalLabel(tick.label, style: .engraved)
                    }
                    .fixedSize()
                    .position(x: along(tick.at),
                              y: centre + recipe.points("tick.top") + recipe.points("tick.h"))
                    .accessibilityHidden(true)
                }
                // Clear, so only the recipe paints: a bare Circle would fill black over it.
                Color.clear
                    .metalObjectRecipe(recipe, part: "knob", in: Circle())
                    .frame(width: knob, height: knob)
                    // A host that passes presses through must know where the knob is drawn.
                    .metalHitRegion()
                    .modifier(place(false))
                    .accessibilityHidden(true)
            }
            .frame(width: width, height: geometry.size.height)
            // The whole control is the drag surface; the knob never leaves it.
            .contentShape(Rectangle())
            // The web slider's cursors: a pointing hand over the track, an open hand on the
            // knob, a closed hand while dragging.
            .onContinuousHover { phase in
                guard !dragging else { return }
                switch phase {
                case let .active(point):
                    let overKnob = abs(point.x - x) <= knob / 2 && abs(point.y - centre) <= knob / 2
                    (overKnob ? NSCursor.openHand : NSCursor.pointingHand).set()
                case .ended:
                    NSCursor.arrow.set()
                }
            }
            .gesture(DragGesture(minimumDistance: .zero)
                .onChanged { gesture in
                    if !dragging {
                        NSCursor.closedHand.set()
                        onDragChange?(true)
                    }
                    dragging = true
                    keyboardFocus = false
                    focused = true
                    // The pointer maps onto the knob's travel, so the knob's centre stays under it.
                    set(range.lowerBound + clamp((gesture.location.x - knob / 2) / max(.leastNonzeroMagnitude, travel)) * span)
                }
                .onEnded { _ in
                    dragging = false
                    onDragChange?(false)
                    NSCursor.openHand.set()
                })
            .animation(dragging || isExternallyDragging ? nil : MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation,
                       value: value)
        }
        // Focus by keyboard navigation only, like NSSlider: a click or a host
        // taking the keyboard never parks typing here.
        .focusable(interactions: .activate)
        // No system ring: MetalUI's own ring, and only for keyboard focus.
        .focusEffectDisabled()
        .focused($focused)
        .overlay {
            if focused && keyboardFocus {
                RoundedRectangle(cornerRadius: MetalRecipes.slider.points("track.height"), style: .continuous)
                    .inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2))
                    .stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                    .allowsHitTesting(false)
            }
        }
        .onChange(of: focused) { _, isFocused in
            #if os(macOS)
            keyboardFocus = isFocused && NSApp.currentEvent?.type == .keyDown
            #endif
            onFocusChange?(isFocused)
        }
        .onKeyPress(.leftArrow, phases: .down) { press in
            keyboardFocus = true
            set(value - (press.modifiers.contains(.shift) ? largeStep : step))
            return .handled
        }
        .onKeyPress(.rightArrow, phases: .down) { press in
            keyboardFocus = true
            set(value + (press.modifiers.contains(.shift) ? largeStep : step))
            return .handled
        }
        .onKeyPress(.home) { set(range.lowerBound); return .handled }
        .onKeyPress(.end) { set(range.upperBound); return .handled }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label)
        .accessibilityValue(valueText(value))
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: set(value + step)
            case .decrement: set(value - step)
            @unknown default: break
            }
        }
    }
}
