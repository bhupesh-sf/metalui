import SwiftUI

// Stepper: the steps of a wizard. Mirrors components/stepper (stepper.agent.md) from the stepper recipe,
// on borrowed looks:
//   upcoming  the switch's sunk well, its number in ink3
//   current   under the switcher's raised thumb, number in ink; the thumb glides from step to step on
//             the part spring (it may overshoot its stop)
//   done      the checkbox's on look with the set's check; the groove after it fills with the switch's
//             on look on the settle spring and drains on release
//   error     the field's invalid hairline ring; the words under the title in the form error's ink
//   waiting   the number gives way to the Spinner's ring after the show delay (.metalWait)
//   unreachable  past the furthest step reached (linear): not a button, "not available yet"
//   disabled  40 %
//   panel     horizontal: under the list; vertical: under its step's title, the groove running beside it.
//             The new one drifts in one nest from the way you went and fades, settle spring
// Reduce Motion: the thumb and the fill move at once; the panel fades.

/// One step of a `MetalStepper`.
public struct MetalStep: Sendable, Equatable {
    public var title: String
    public var description: String?
    /// What's wrong with this step: it rings the indicator and is said under the title.
    public var error: String?
    /// The step is working: its number gives way to the Spinner's ring after the show delay.
    public var waiting: Bool
    /// Done or not, overriding the default (done once you've passed it).
    public var complete: Bool?
    public var disabled: Bool

    public init(_ title: String, description: String? = nil, error: String? = nil, waiting: Bool = false, complete: Bool? = nil, disabled: Bool = false) {
        self.title = title
        self.description = description
        self.error = error
        self.waiting = waiting
        self.complete = complete
        self.disabled = disabled
    }
}

public enum MetalStepperOrientation: Sendable { case horizontal, vertical }
public enum MetalStepperLayout: Sendable { case stacked, inline }

/// The steps of a wizard, and the current step's panel.
public struct MetalStepper<Panel: View>: View {
    let steps: [MetalStep]
    @Binding var current: Int
    let linear: Bool
    let orientation: MetalStepperOrientation
    let layout: MetalStepperLayout
    let panel: (Int) -> Panel

    @State private var reached: Int
    @State private var forward = true
    @Namespace private var glide
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `current` is the step's index. `linear`: only steps up to the furthest reached can be visited.
    /// `panel` draws a step's content (under the list, or under its title when vertical).
    public init(_ steps: [MetalStep], current: Binding<Int>, linear: Bool = true,
                orientation: MetalStepperOrientation = .horizontal, layout: MetalStepperLayout = .stacked,
                @ViewBuilder panel: @escaping (Int) -> Panel) {
        self.steps = steps
        self._current = current
        self.linear = linear
        self.orientation = orientation
        self.layout = layout
        self.panel = panel
        self._reached = State(initialValue: current.wrappedValue)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.stepper }
    private var furthest: Int { max(reached, current) }

    func done(_ i: Int) -> Bool {
        let step = steps[i]
        return step.error == nil && (step.complete ?? (i < furthest && i != current))
    }

    func reachable(_ i: Int) -> Bool { !steps[i].disabled && (!linear || i <= furthest) }

    public var body: some View {
        VStack(alignment: .leading, spacing: recipe.points("panel.gap")) {
            if orientation == .vertical {
                VStack(alignment: .leading, spacing: .zero) {
                    ForEach(steps.indices, id: \.self) { i in
                        verticalStep(i)
                    }
                }
            } else {
                HStack(alignment: .top, spacing: .zero) {
                    ForEach(steps.indices, id: \.self) { i in
                        horizontalStep(i)
                    }
                }
                arriving(panel(current)).id(current)
            }
        }
        .accessibilityElement(children: .contain)
        .onChange(of: current) { old, new in
            forward = new > old
            reached = max(reached, new)
        }
    }

    private func arriving<V: View>(_ view: V) -> some View {
        let nest = MetalRadius.nest
        let x = orientation == .horizontal ? (forward ? nest : -nest) : .zero
        let y = orientation == .vertical ? (forward ? nest : -nest) : .zero
        let travels = MetalMotion.resolve(.settle, reduceMotion: reduceMotion).allowsTravel
        return view
            .frame(maxWidth: .infinity, alignment: .leading)
            .transition(.asymmetric(insertion: travels ? .offset(x: x, y: y).combined(with: .opacity) : .opacity, removal: .identity))
    }

    @ViewBuilder private func horizontalStep(_ i: Int) -> some View {
        let last = i == steps.count - 1
        if layout == .inline {
            HStack(spacing: .zero) {
                MetalStepperStep(index: i, step: steps[i], current: i == current, done: done(i), reachable: reachable(i),
                                 inline: true, glide: glide) { go(i) }
                if !last { MetalStepperGroove(on: done(i), vertical: false).padding(.horizontal, recipe.points("groove.gap")) }
            }
            .frame(maxWidth: last ? nil : .infinity)
        } else {
            MetalStepperStep(index: i, step: steps[i], current: i == current, done: done(i), reachable: reachable(i),
                             inline: false, glide: glide) { go(i) }
                .frame(maxWidth: .infinity)
                .overlay(alignment: .topLeading) {
                    if !last {
                        // From this indicator's edge to the next one's, through the middle of the next column.
                        GeometryReader { box in
                            let size = recipe.points("indicator.size")
                            let gap = recipe.points("groove.gap")
                            MetalStepperGroove(on: done(i), vertical: false)
                                .frame(width: max(.zero, box.size.width - size - gap - gap))
                                .offset(x: box.size.width / 2 + size / 2 + gap,
                                        y: recipe.points("step.pad") + (size - recipe.points("groove.thickness")) / 2)
                        }
                    }
                }
        }
    }

    private func verticalStep(_ i: Int) -> some View {
        let size = recipe.points("indicator.size")
        let pad = recipe.points("step.pad")
        let gap = recipe.points("groove.gap")
        let last = i == steps.count - 1
        let lane = pad + (size - recipe.points("groove.thickness")) / 2
        return VStack(alignment: .leading, spacing: .zero) {
            MetalStepperStep(index: i, step: steps[i], current: i == current, done: done(i), reachable: reachable(i),
                             inline: true, glide: glide) { go(i) }
            if i == current {
                arriving(panel(i))
                    .padding(.leading, size + pad + recipe.points("step.gap"))
                    .padding(.top, pad)
                    .padding(.bottom, recipe.points("panel.gap"))
                    .id(current)
            }
        }
        .padding(.bottom, last ? .zero : recipe.points("vertical.gap"))
        .overlay(alignment: .topLeading) {
            if !last {
                MetalStepperGroove(on: done(i), vertical: true)
                    .padding(.top, size + pad + gap)
                    .padding(.bottom, gap - pad)
                    .padding(.leading, lane)
            }
        }
    }

    private func go(_ i: Int) {
        guard i != current else { return }
        withMetalAnimation(.part, reduceMotion: reduceMotion) { current = i }
    }
}

public extension MetalStepper where Panel == EmptyView {
    /// The steps alone; the host shows the panels.
    init(_ steps: [MetalStep], current: Binding<Int>, linear: Bool = true,
         orientation: MetalStepperOrientation = .horizontal, layout: MetalStepperLayout = .stacked) {
        self.init(steps, current: current, linear: linear, orientation: orientation, layout: layout) { _ in EmptyView() }
    }
}

/// One step: its indicator, title and line; a button when you can go to it.
private struct MetalStepperStep: View {
    let index: Int
    let step: MetalStep
    let current: Bool
    let done: Bool
    let reachable: Bool
    let inline: Bool
    let glide: Namespace.ID
    let action: () -> Void

    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false
    @State private var wait = MetalWait()

    private var recipe: MetalObjectRecipe { MetalRecipes.stepper }

    var body: some View {
        let t = colorway.tokens
        let shape = RoundedRectangle(cornerRadius: recipe.points("step.radius"), style: .continuous)
        let content = Group {
            if inline {
                HStack(alignment: .top, spacing: recipe.points("step.gap")) { indicator; words(.leading) }
            } else {
                VStack(spacing: recipe.points("step.gap")) { indicator; words(.center) }
            }
        }
        .padding(recipe.points("step.pad"))
        .background {
            if hovering && reachable { Color.clear.metalObjectRecipe(MetalRecipes.row, part: "list", state: "hover", in: shape) }
        }
        .contentShape(shape)
        .opacity(step.disabled ? recipe.scalar("step.disabled") : .one)
        .metalWait(step.waiting ? .working : done ? .done : .idle, into: $wait)

        Group {
            if reachable {
                Button(action: action) { content }.buttonStyle(.plain).onHover { hovering = $0 }
            } else {
                content
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Step \(index + 1): \(step.title)")
        .accessibilityValue(said)
        .accessibilityAddTraits(current ? .isSelected : [])
        .foregroundColor(t.ink.color)
    }

    private var said: String {
        [done ? "completed" : nil,
         step.error.map { "has a problem: \($0)" },
         !reachable && !current ? (step.disabled ? "unavailable" : "not available yet") : nil,
         step.description].compactMap { $0 }.joined(separator: ", ")
    }

    private var indicator: some View {
        let t = colorway.tokens
        let size = recipe.points("indicator.size")
        let circle = Circle()
        return ZStack {
            if current {
                Color.clear.metalObjectRecipe(MetalRecipes.switcher, part: "thumb", in: circle)
                    .matchedGeometryEffect(id: "thumb", in: glide)
            } else if done {
                Color.clear.metalObjectRecipe(MetalRecipes.checkbox, part: "self", state: "on", in: circle)
            } else {
                Color.clear.metalObjectRecipe(MetalRecipes.switch, part: "self", in: circle)
            }
            MetalSpinner(size: .small, label: "\(step.title), working", phase: wait.phase) {
                if done {
                    MetalIcon(.check, size: recipe.points("indicator.glyph"))
                        .foregroundColor((MetalRecipes.checkbox.color("tick.color") ?? t.ink).color)
                } else {
                    Text("\(index + 1)").font(.metal(MetalType.meta)).monospacedDigit()
                        .foregroundColor(current ? t.ink.color : t.ink3.color)
                }
            }
            if step.error != nil {
                circle.strokeBorder(t.invalid.color, lineWidth: MetalRing.invalidWidth)
            }
        }
        .frame(width: size, height: size)
    }

    private func words(_ alignment: HorizontalAlignment) -> some View {
        let t = colorway.tokens
        return VStack(alignment: alignment, spacing: recipe.points("step.text-gap")) {
            Text(step.title).font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                .foregroundColor(current ? t.ink.color : reachable ? t.ink2.color : t.ink3.color)
            if let error = step.error {
                Text(error).font(.metal(MetalType.meta))
                    .foregroundColor((MetalRecipes.formField.color("error.ink", colorway: MetalRecipeColorway(colorway)) ?? t.invalid).color)
            } else if let description = step.description {
                Text(description).font(.metal(MetalType.meta)).foregroundColor(t.ink3.color)
            }
        }
        .multilineTextAlignment(alignment == .center ? .center : .leading)
    }
}

/// The groove between two steps: the switch's sunk well, filled with its on look once the step before is done.
private struct MetalStepperGroove: View {
    let on: Bool
    let vertical: Bool

    var body: some View {
        let thickness = MetalRecipes.stepper.points("groove.thickness")
        let capsule = Capsule(style: .continuous)
        GeometryReader { box in
            Color.clear.metalObjectRecipe(MetalRecipes.switch, part: "self", state: "on", in: capsule)
                .offset(x: vertical || on ? .zero : -box.size.width, y: !vertical || on ? .zero : -box.size.height)
                .metalAnimation(on ? .settle : .release, value: on)
        }
        .metalObjectRecipe(MetalRecipes.switch, part: "self", in: capsule)
        .clipShape(capsule)
        .frame(width: vertical ? thickness : nil, height: vertical ? nil : thickness)
    }
}
