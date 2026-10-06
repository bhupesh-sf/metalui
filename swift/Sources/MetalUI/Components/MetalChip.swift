import SwiftUI

/// The four small pill finishes from the generated chip recipe.
public enum MetalChipVariant: Sendable {
    case suggestion, glass, glassAction, tag

    var part: String {
        switch self {
        case .suggestion: return "suggestion"
        case .glass: return "glass"
        case .glassAction: return "glass-action"
        case .tag: return "tag"
        }
    }
}


private struct MetalChipShape: InsettableShape {
    let glass: Bool
    let radius: Double
    var inset: Double = .zero

    func path(in rect: CGRect) -> Path {
        let bounds = rect.insetBy(dx: inset, dy: inset)
        return glass
            ? RoundedRectangle(cornerRadius: max(.zero, radius - inset), style: .continuous).path(in: bounds)
            : Capsule(style: .continuous).path(in: bounds)
    }

    func inset(by amount: CGFloat) -> MetalChipShape {
        var shape = self
        shape.inset += amount
        return shape
    }
}

/// A chip supplies paint and layout; its slots decide whether it is an action.
public struct MetalChip<Content: View>: View {
    let variant: MetalChipVariant
    let waiting: Bool
    @ViewBuilder let content: Content
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var hovering = false

    /// `waiting`: its work is under way (put a small MetalSpinner before its text): it takes no hits and its
    /// text and actions dim.
    public init(_ variant: MetalChipVariant = .suggestion, waiting: Bool = false, @ViewBuilder content: () -> Content) {
        self.variant = variant
        self.waiting = waiting
        self.content = content()
    }

    public var body: some View {
        let recipe = MetalRecipes.chip
        let glass = variant == .glass || variant == .glassAction
        let fontKey = glass ? "glass.font" : variant == .tag ? "tag.font" : "suggestion.font"
        let trackingKey = glass ? "glass.tracking" : variant == .tag ? "tag.tracking" : "suggestion.tracking"
        let part = variant.part
        let cw = MetalRecipeColorway(colorway)
        let shape = MetalChipShape(glass: glass, radius: recipe.points("glass.radius"))

        HStack(spacing: recipe.points(glass ? "glass.gap" : "suggestion.gap")) { content }
            .font(recipe.font(fontKey))
            .tracking(recipe.tracking(trackingKey, size: recipe.fontSize(fontKey)))
            .foregroundColor(recipe.color("\(part).ink", colorway: cw)?.color ?? .clear)
            .padding(.leading, recipe.points(variant == .suggestion ? "suggestion.pad-left" : glass ? "glass.pad-x" : "tag.pad-x"))
            .padding(.trailing, recipe.points(variant == .suggestion ? "suggestion.pad-right" : glass ? "glass.pad-x" : "tag.pad-x"))
            .frame(height: variant == .tag ? recipe.lineHeight("tag.font") :
                    recipe.points(glass ? "glass.height" : "suggestion.height"))
            .metalObjectRecipe(recipe, part: part, state: hovering && variant == .glassAction ? "hover" : nil, in: shape)
            .background {
                if variant == .glass && !reduceTransparency {
                    MetalBackdropView(backdrop: MetalBackdrop(blur: recipe.filterNumber("glass.blur", function: "blur") ?? .zero,
                                                             saturation: recipe.filterNumber("glass.blur", function: "saturate") ?? .one,
                                                             dark: colorway == .graphite))
                        .clipShape(shape)
                }
            }
            .onHover { hovering = $0 }
            .fixedSize()
            .environment(\.metalChipWaiting, waiting)
            .allowsHitTesting(!waiting)
            .accessibilityElement(children: .contain)
            .accessibilityValue(waiting ? "In progress" : "")
    }
}

private struct MetalChipWaitingKey: EnvironmentKey { static let defaultValue = false }

extension EnvironmentValues {
    var metalChipWaiting: Bool {
        get { self[MetalChipWaitingKey.self] }
        set { self[MetalChipWaitingKey.self] = newValue }
    }
}

/// Decorative lead content: the LED part's lamp, or a glyph.
public struct MetalChipLead<Content: View>: View {
    let led: MetalLEDKind?
    @ViewBuilder let content: Content

    /// - Parameter led: the LED part's lamp, at the chip's size, in one of its kinds (`.link` for a link's kind).
    public init(led: MetalLEDKind? = nil, @ViewBuilder content: () -> Content) {
        self.led = led
        self.content = content()
    }

    public var body: some View {
        if let led {
            MetalLED(led, diameter: MetalRecipes.chip.points("led.size"))
                .accessibilityHidden(true)
        } else {
            content.accessibilityHidden(true)
        }
    }
}

public struct MetalChipText<Content: View>: View {
    @ViewBuilder let content: Content
    @Environment(\.metalChipWaiting) private var waiting
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View { content.metalWaitDim(waiting) }
}

public struct MetalChipActions<Content: View>: View {
    @ViewBuilder let content: Content
    @Environment(\.metalChipWaiting) private var waiting
    public init(@ViewBuilder content: () -> Content) { self.content = content() }
    public var body: some View {
        HStack(spacing: MetalRecipes.chip.points("suggestion.gap")) { content }.metalWaitDim(waiting)
    }
}
