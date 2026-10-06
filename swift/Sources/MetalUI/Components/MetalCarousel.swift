import SwiftUI

// CAROUSEL, a few peers looked at one or a few at a time (carousel.agent.md; web is the reference)
//
//   rest      the slides in a horizontal scroll view, view-aligned (each snaps its leading edge); by
//             default a slide is the box minus the peek, so the next one shows at the edge
//   controls  one row under the slides: the readout ("3 / 8", its number turning) at the leading end,
//             Previous and Next together at the trailing end, the graphite tool keys with the chevron
//   step      a key, or ← → on the focused scroll view: one slide, on the settle spring
//   ends      the key that would go past an end is disabled (40 %)
//   never     rotates on its own
// Reduce Motion: a step jumps; the readout crossfades.

/// A few peers in a row narrower than all of them: a gallery, onboarding cards, a shelf on a narrow screen.
public struct MetalCarousel<Item: Identifiable, Slide: View>: View {
    let label: String
    let items: [Item]
    let slideWidth: CGFloat?
    @Binding var index: Int
    let slide: (Item) -> Slide

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var position: Item.ID?

    /// `slideWidth` in points; absent, a slide is the box minus the peek. `index` is the first slide in view, from 0.
    public init(_ label: String, items: [Item], slideWidth: CGFloat? = nil, index: Binding<Int> = .constant(.zero),
                @ViewBuilder slide: @escaping (Item) -> Slide) {
        self.label = label
        self.items = items
        self.slideWidth = slideWidth
        self._index = index
        self.slide = slide
        let start = index.wrappedValue
        self._position = State(initialValue: items.indices.contains(start) ? items[start].id : items.first?.id)
    }

    private var current: Int { items.firstIndex { $0.id == position } ?? .zero }

    private func go(_ to: Int) {
        guard items.indices.contains(to) else { return }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { position = items[to].id }
    }

    public var body: some View {
        let r = MetalRecipes.carousel
        let gap = r.points("slide.gap")
        let bleed = r.points("box.bleed")
        VStack(alignment: .leading, spacing: gap) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: gap) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { offset, item in
                        slide(item)
                            .modifier(MetalCarouselSlideWidth(width: slideWidth, peek: r.points("slide.peek")))
                            .accessibilityElement(children: .contain)
                            .accessibilityLabel("\(offset + 1) of \(items.count)")
                    }
                }
                .scrollTargetLayout()
                .padding(.vertical, bleed)
            }
            .contentMargins(.horizontal, bleed, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $position)
            .padding(.vertical, -bleed)
            .focusable()
            .focusEffectDisabled()
            .onKeyPress(.leftArrow) { go(current - 1); return .handled }
            .onKeyPress(.rightArrow) { go(current + 1); return .handled }
            .onKeyPress(.home) { go(.zero); return .handled }
            .onKeyPress(.end) { go(items.count - 1); return .handled }
            .accessibilityLabel("Slides")

            HStack(spacing: r.points("controls.gap")) {
                Text("\(current + 1) / \(items.count)")
                    .font(.metal(MetalType.readout))
                    .monospacedDigit()
                    .foregroundColor(colorway.tokens.ink2.color)
                    .contentTransition(reduceMotion ? .opacity : .numericText(value: Double(current)))
                    .metalAnimation(.settle, value: current)
                    .accessibilityLabel("\(current + 1) of \(items.count)")
                Spacer(minLength: .zero)
                MetalIconButton("Previous slide", variant: .tool, action: { go(current - 1) }) {
                    MetalIcon(.chevron, size: MetalRecipes.iconButton.points("tool.glyph")).rotationEffect(.degrees(90))
                }
                .disabled(current <= .zero)
                MetalIconButton("Next slide", variant: .tool, action: { go(current + 1) }) {
                    MetalIcon(.chevron, size: MetalRecipes.iconButton.points("tool.glyph")).rotationEffect(.degrees(-90))
                }
                .disabled(current >= items.count - 1)
            }
            .padding(.horizontal, bleed)
        }
        .onChange(of: position) { _, _ in if index != current { index = current } }
        .onChange(of: index) { _, next in if next != current { go(next) } }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
        .accessibilityHint("Carousel")
    }
}

/// A slide's own width, or the box minus the peek so the next one shows at the edge.
private struct MetalCarouselSlideWidth: ViewModifier {
    let width: CGFloat?
    let peek: CGFloat

    func body(content: Content) -> some View {
        if let width {
            content.frame(width: width)
        } else {
            content.containerRelativeFrame(.horizontal) { length, _ in max(.zero, length - peek) }
        }
    }
}
