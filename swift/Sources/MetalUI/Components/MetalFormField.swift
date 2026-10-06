import SwiftUI

// Form field: a control with its words. Mirrors components/form-field (form-field.agent.md) from the
// form-field recipe: the label above or beside the control (stacking when narrow), the optional or required
// mark, the changed mark, the description, the readback on the drum, and the error, whose row opens on the
// settle spring and closes on the release spring; the error reaches the control as its invalid ring.

/// Where the label sits: above the control, or beside it (stacking when the field is narrower than the recipe's `side.min`).
public enum MetalFormFieldOrientation: Sendable { case vertical, horizontal }

/// The minority mark after a label: "Optional" when most fields are required, a dot when most are optional.
public enum MetalFormFieldMark: Sendable { case optional, required }

/// A control with its words: a label, a description, a readback of what was understood, and an error.
public struct MetalFormField<Control: View>: View {
    let label: String
    let description: String?
    let readback: String?
    let error: String?
    let mark: MetalFormFieldMark?
    let changed: Bool?
    let orientation: MetalFormFieldOrientation
    let control: Control

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// - Parameters:
    ///   - readback: what was understood ("Tue 8 Oct, 08:00", "= 96"); nil or empty closes its row.
    ///   - error: why the value is not accepted; nil when it is. Show it after the person leaves the field, never on the first keystroke.
    ///   - changed: the value is changed since it was saved; pass false (not nil) once saved so the mark leaves on its spring.
    public init(_ label: String, description: String? = nil, readback: String? = nil, error: String? = nil,
                mark: MetalFormFieldMark? = nil, changed: Bool? = nil, orientation: MetalFormFieldOrientation = .vertical,
                @ViewBuilder control: () -> Control) {
        self.label = label
        self.description = description
        self.readback = readback
        self.error = error
        self.mark = mark
        self.changed = changed
        self.orientation = orientation
        self.control = control()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.formField }
    private var shownReadback: String? { readback.flatMap { $0.isEmpty ? nil : $0 } }

    public var body: some View {
        Group {
            if orientation == .horizontal {
                // Beside while the field is wide enough; stacked otherwise (the web's @container/form-field).
                ViewThatFits(in: .horizontal) {
                    beside.frame(minWidth: recipe.points("side.min"), alignment: .leading)
                    stacked
                }
            } else {
                stacked
            }
        }
        .animation(MetalMotion.resolve(error == nil ? .release : .settle, reduceMotion: reduceMotion).animation, value: error)
        .animation(MetalMotion.resolve(shownReadback == nil ? .release : .settle, reduceMotion: reduceMotion).animation, value: shownReadback == nil)
    }

    private var stacked: some View {
        VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            labelView
            controlView
            words
        }
    }

    private var beside: some View {
        HStack(alignment: .firstTextBaseline, spacing: recipe.points("side.gap")) {
            labelView
                .multilineTextAlignment(.trailing)
                .frame(width: recipe.points("side.label-width"), alignment: .trailing)
            VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
                controlView
                words
            }
        }
    }

    private var labelView: some View {
        let t = colorway.tokens
        return HStack(alignment: .firstTextBaseline, spacing: recipe.points("mark.gap")) {
            Text(label).foregroundColor(t.ink.color)
            if mark == .optional { Text("Optional").foregroundColor(t.ink3.color) }
            if mark == .required {
                Circle().fill(t.ink2.color)
                    .frame(width: recipe.points("required.size"), height: recipe.points("required.size"))
                    .offset(y: -recipe.points("required.lift"))
                    .accessibilityHidden(true)
            }
        }
        .font(.metal(MetalType.ui))
        .tracking(MetalType.ui.trackingPoints)
        // The changed mark hangs before the label, so labels stay in their column.
        .overlay(alignment: .topLeading) {
            if let changed {
                MetalChangedMark(changed: changed)
                    .offset(x: -(recipe.points("changed.gap") + recipe.points("changed.size")), y: recipe.points("changed.top"))
            }
        }
        .opacity(isEnabled ? .one : MetalRecipes.field.scalar("state.disabled"))
        .accessibilityHidden(true)
    }

    private var controlView: some View {
        control
            .environment(\.metalFormInvalid, error != nil)
            .accessibilityLabel(label)
            .accessibilityValue(changed == true ? "changed" : "")
            .accessibilityHint([description, shownReadback, error].compactMap { $0 }.joined(separator: ". "))
    }

    @ViewBuilder private var words: some View {
        if let description {
            Text(description).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color)
                .fixedSize(horizontal: false, vertical: true)
        }
        if let shownReadback {
            Text(shownReadback)
                .font(.metal(MetalType.readout))
                .tracking(MetalType.readout.trackingPoints)
                .monospacedDigit()
                .foregroundColor(colorway.tokens.ink2.color)
                .contentTransition(reduceMotion ? .opacity : .numericText())
                .metalAnimation(.settle, value: shownReadback)
                .transition(.opacity)
        }
        if let error {
            Text(error)
                .font(.metal(MetalType.meta))
                .foregroundColor(recipe.color("error.ink", colorway: MetalRecipeColorway(colorway))?.color ?? MetalShared.red.color)
                .fixedSize(horizontal: false, vertical: true)
                .transition(.opacity)
        }
    }
}

/// The changed mark: a small engraved dot for a value changed since it was saved (or off its default).
/// Put it before what it marks; it pops in on the settle spring and leaves on the release spring.
public struct MetalChangedMark: View {
    let changed: Bool
    @Environment(\.metalColorway) private var colorway

    public init(changed: Bool = true) {
        self.changed = changed
    }

    public var body: some View {
        let recipe = MetalRecipes.formField
        let lip = colorway.tokens.lipShadow.first
        Circle()
            .fill(colorway.tokens.engrave.color)
            .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
            .frame(width: recipe.points("changed.size"), height: recipe.points("changed.size"))
            .metalPresence(changed, pop: recipe.scalar("changed.pop"))
            .accessibilityHidden(true)
    }
}

/// Fields (or a radio or checkbox group) about one thing, under an engraved legend.
public struct MetalFieldset<Content: View>: View {
    let legend: String
    let content: Content

    public init(_ legend: String, @ViewBuilder content: () -> Content) {
        self.legend = legend
        self.content = content()
    }

    public var body: some View {
        let recipe = MetalRecipes.formField
        VStack(alignment: .leading, spacing: recipe.points("self.legend-gap")) {
            MetalLabel(legend, style: .engraved).accessibilityAddTraits(.isHeader)
            VStack(alignment: .leading, spacing: recipe.points("self.fieldset-gap")) { content }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(legend)
    }
}
