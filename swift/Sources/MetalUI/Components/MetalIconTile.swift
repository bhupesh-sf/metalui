import SwiftUI

// Icon tile, painted from the generated icon-tile recipe on the well (field) or the small raised surface
// (raise-sm), with the LED part seated on its top-right rim. Mirrors components/icon-tile.

/// A mark for what a row, a card or an empty place is about: a glyph, or one to three characters, in a
/// tile beside the words that name it. Never pressed (the row or card around it is) and never tinted (a
/// state is the LED plus words). Hidden from VoiceOver unless `label` names it.
///
/// The LED holds steady and flickers once when `led` changes after the tile first appears.
public struct MetalIconTile: View {
    public enum Look: Sendable { case sunk, raised }
    public enum Size: String, Sendable { case compact, regular, large, hero }
    public enum Shape: Sendable { case square, round }

    private enum Mark { case glyph(MetalIconName), text(String) }
    private let mark: Mark
    private let look: Look
    private let size: Size
    private let shape: Shape
    private let led: MetalLEDKind?
    private let label: String?
    @State private var gesture: MetalLampGesture = .steady
    @Environment(\.metalColorway) private var colorway

    /// A glyph from the set.
    public init(_ glyph: MetalIconName, look: Look = .sunk, size: Size = .regular, shape: Shape = .square, led: MetalLEDKind? = nil, label: String? = nil) {
        self.init(mark: .glyph(glyph), look: look, size: size, shape: shape, led: led, label: label)
    }

    /// One to three characters ("AC", "JS"), uppercase in the engraved mono.
    public init(text: String, look: Look = .sunk, size: Size = .regular, shape: Shape = .square, led: MetalLEDKind? = nil, label: String? = nil) {
        self.init(mark: .text(text), look: look, size: size, shape: shape, led: led, label: label)
    }

    private init(mark: Mark, look: Look, size: Size, shape: Shape, led: MetalLEDKind?, label: String?) {
        self.mark = mark
        self.look = look
        self.size = size
        self.shape = shape
        self.led = led
        self.label = label
    }

    public var body: some View {
        let recipe = MetalRecipes.iconTile
        let key = size.rawValue
        let side = recipe.points("\(key).size")
        let inset = recipe.points("lamp.inset")
        let named = !(label ?? "").isEmpty
        let mark = face(recipe, key: key)
            .foregroundColor(colorway.tokens.ink2.color)
            .frame(width: side, height: side)
        Group {
            if shape == .round {
                mark.modifier(TileLook(look: look, shape: Circle()))
            } else {
                mark.modifier(TileLook(look: look, shape: RoundedRectangle(cornerRadius: recipe.points("\(key).radius"), style: .continuous)))
            }
        }
        .overlay(alignment: .topTrailing) {
            if let led {
                MetalLED(led, size: size == .compact ? .small : .default, gesture: gesture)
                    .offset(x: inset, y: -inset)
            }
        }
        .onChange(of: led) { gesture = .flicker }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label ?? "")
        .accessibilityAddTraits(named ? .isImage : [])
        .accessibilityHidden(!named)
    }

    @ViewBuilder
    private func face(_ recipe: MetalObjectRecipe, key: String) -> some View {
        switch mark {
        case let .glyph(name):
            MetalIcon(name, size: recipe.points("\(key).glyph"))
        case let .text(text):
            let lip = MetalRecipes.label.textShadows("engraved", colorway: MetalRecipeColorway(colorway)).first
            Text(text.uppercased())
                .font(recipe.font("\(key).font"))
                .tracking(recipe.tracking("\(key).tracking", size: recipe.fontSize("\(key).font")))
                .monospacedDigit()
                // The tracking's trailing space, indented back so the characters sit in the optical centre.
                .padding(.leading, recipe.tracking("\(key).tracking", size: recipe.fontSize("\(key).font")))
                .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
        }
    }
}

/// The tile's material: the well's field cut into the surface, or the small raised plate.
private struct TileLook<S: InsettableShape>: ViewModifier {
    let look: MetalIconTile.Look
    let shape: S

    func body(content: Content) -> some View {
        switch look {
        case .sunk: content.metalObjectRecipe(MetalRecipes.well, part: "self", state: "field", in: shape)
        case .raised: content.metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise-sm", in: shape)
        }
    }
}
