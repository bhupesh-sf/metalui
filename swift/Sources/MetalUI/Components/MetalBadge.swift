import SwiftUI

// Badge, painted from the generated badge recipe: a shallow stamp with the engraved words, a leading LED
// or glyph, or a count on the drum; and the corner count (`.metalBadge(count:)`) as a readout cap in the
// other colorway. Mirrors components/badge.

/// One short fact about a thing: a kind, a version, a state, or how many are waiting. Not pressable and
/// not announced; a badge you remove is a `MetalChip`, the system's own state a `MetalStatusBadge`.
///
/// The LED holds steady and flickers once when `led` changes after it first appears. A count turns on
/// the drum (up as it grows, down as it shrinks) and reads `max+` past `max`.
public struct MetalBadge: View {
    public enum Size: Sendable { case regular, compact }

    private enum Face { case words(String), count(Int, max: Int, label: String?) }
    private let face: Face
    private let led: MetalLEDKind?
    private let glyph: MetalIconName?
    private let size: Size
    @State private var gesture: MetalLampGesture = .steady
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// Words, with an optional LED (`led`) or glyph before them; one lead, the LED wins.
    public init(_ text: String, led: MetalLEDKind? = nil, glyph: MetalIconName? = nil, size: Size = .regular) {
        self.face = .words(text)
        self.led = led
        self.glyph = glyph
        self.size = size
    }

    /// A count in place of words; `label` is what it means for VoiceOver ("3 unread").
    public init(count: Int, max: Int = 99, label: String? = nil, size: Size = .regular) {
        self.face = .count(count, max: max, label: label)
        self.led = nil
        self.glyph = nil
        self.size = size
    }

    static func face(_ count: Int, max: Int) -> String { count > max ? "\(max)+" : "\(count)" }

    private var group: String { size == .compact ? "compact" : "regular" }

    public var body: some View {
        let recipe = MetalRecipes.badge
        let cw = MetalRecipeColorway(colorway)
        let lip = MetalRecipes.label.textShadows("engraved", colorway: cw).first
        let height = recipe.points("\(group).height")
        Group {
            switch face {
            case let .words(text):
                HStack(spacing: recipe.points("\(group).gap")) {
                    if let led {
                        MetalLED(led, size: size == .compact ? .small : .default, gesture: gesture)
                    } else if let glyph {
                        MetalIcon(glyph, size: recipe.points("\(group).glyph"))
                            .accessibilityHidden(true)
                    }
                    Text(text.uppercased())
                        .font(recipe.font("\(group).font"))
                        .tracking(recipe.tracking("\(group).tracking", size: recipe.fontSize("\(group).font")))
                }
                .padding(.horizontal, recipe.points("\(group).pad"))
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(text)
            case let .count(count, max, label):
                let font = size == .compact ? "count-compact" : "count"
                Text(Self.face(count, max: max))
                    .font(recipe.font("\(font).font"))
                    .tracking(recipe.tracking("\(font).tracking", size: recipe.fontSize("\(font).font")))
                    .monospacedDigit()
                    .contentTransition(reduceMotion ? .opacity : .numericText(value: Double(count)))
                    .metalAnimation(.settle, value: count)
                    .padding(.horizontal, recipe.points("\(font).pad"))
                    .frame(minWidth: height)
                    .accessibilityLabel(label ?? Self.face(count, max: max))
            }
        }
        .foregroundColor(colorway.tokens.ink2.color)
        .shadow(color: lip?.color.color ?? .clear, radius: lip?.blur ?? .zero, x: lip?.x ?? .zero, y: lip?.y ?? .zero)
        .frame(height: height)
        .metalObjectRecipe(recipe, part: "self", in: Capsule(style: .continuous))
        .fixedSize()
        .onChange(of: led) { gesture = .flicker }
    }
}

/// A count on a control's top-right corner: a compact readout cap in the other colorway, ringed in the
/// surface. In from `corner.from` on the object spring when it leaves zero; gone on the release spring at
/// zero, keeping its last number as it leaves. Hidden from VoiceOver: say the count in the control's label.
struct MetalBadgeCorner: ViewModifier {
    let count: Int
    let max: Int
    @State private var last: Int
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(count: Int, max: Int) {
        self.count = count
        self.max = max
        _last = State(initialValue: count)
    }

    func body(content: Content) -> some View {
        let recipe = MetalRecipes.badge
        let cw = MetalRecipeColorway(colorway)
        let shown = count > 0
        let motion = MetalMotion.resolve(shown ? .object : .release, reduceMotion: reduceMotion)
        let offset = recipe.points("corner.offset")
        let ring = recipe.points("corner.ring")
        content.overlay(alignment: .topTrailing) {
            Text(MetalBadge.face(last, max: max))
                .font(recipe.font("count-compact.font"))
                .tracking(recipe.tracking("count-compact.tracking", size: recipe.fontSize("count-compact.font")))
                .monospacedDigit()
                .contentTransition(reduceMotion ? .opacity : .numericText(value: Double(last)))
                .foregroundColor(recipe.color("corner.ink", colorway: cw)?.color ?? .clear)
                .padding(.horizontal, recipe.points("count-compact.pad"))
                .frame(minWidth: recipe.points("compact.height"), minHeight: recipe.points("compact.height"), maxHeight: recipe.points("compact.height"))
                .metalObjectRecipe(recipe, part: "corner", in: Capsule(style: .continuous))
                .background(Capsule(style: .continuous).fill(colorway.tokens.s.color).padding(-ring))
                .fixedSize()
                .scaleEffect(shown || !motion.allowsTravel ? Double.one : recipe.scalar("corner.from"))
                .opacity(shown ? Double.one : .zero)
                .offset(x: -offset, y: offset)
                .animation(motion.animation, value: shown)
                .metalAnimation(.settle, value: last)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
        }
        .onChange(of: count) { if count > 0 { last = count } }
    }
}

extension View {
    /// Puts a count on this control's top-right corner (a notification badge). Say it in the control's label too.
    public func metalBadge(count: Int, max: Int = 99) -> some View {
        modifier(MetalBadgeCorner(count: count, max: max))
    }
}
