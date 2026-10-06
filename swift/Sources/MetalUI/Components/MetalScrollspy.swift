import SwiftUI

// SCROLLSPY, the section being read, in a table of contents (scrollspy.agent.md; web is the reference)
//
//   rail      (vertical) the entries in ui type and ink2; the current one in ink on one marker, the row's
//             raised option plate with its green rail, gliding entry to entry on the settle spring
//   strip     (horizontal) the switcher's track and thumb, on the part spring (the Tabs look)
//   reading   `scrollPosition(id:anchor: .top)` says which section sits at the top, under the offset
//   jump      pick an entry: the scroll view moves to its section on the settle spring
// Reduce Motion: the marker moves at once and the jump is instant.

/// One section of a long page, and its entry in the table of contents.
public struct MetalScrollspySection: Identifiable, Hashable, Sendable {
    public let id: String
    public let title: String
    /// 2 indents the entry one step (a subsection).
    public let level: Int

    public init(_ id: String, title: String, level: Int = 1) {
        self.id = id
        self.title = title
        self.level = level
    }
}

/// The table of contents alone: a rail or a strip that marks `current` and asks for a jump through `onSelect`.
/// Use it beside a scroll view you own; `MetalScrollspy` wires one up for you.
public struct MetalScrollspyRail: View {
    public enum Size: Sendable { case compact, regular }

    let label: String
    let sections: [MetalScrollspySection]
    let current: String?
    let orientation: Axis
    let size: Size
    let onSelect: (String) -> Void

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var marker
    @State private var hovering: String?

    public init(_ label: String, sections: [MetalScrollspySection], current: String?, orientation: Axis = .vertical,
                size: Size = .regular, onSelect: @escaping (String) -> Void) {
        self.label = label
        self.sections = sections
        self.current = current
        self.orientation = orientation
        self.size = size
        self.onSelect = onSelect
    }

    public var body: some View {
        if orientation == .horizontal {
            // The strip scrolls sideways only when it doesn't fit.
            ViewThatFits(in: .horizontal) {
                strip
                ScrollView(.horizontal, showsIndicators: false) { strip }
            }
        } else {
            rail
        }
    }

    private var strip: some View {
        MetalSwitchTrack(label: label, selection: Binding(get: { current ?? sections.first?.id ?? "" }, set: onSelect),
                         options: sections.map { MetalTrackOption(value: $0.id, title: $0.title) },
                         size: size == .compact ? .compact : .regular, role: .value)
    }

    private var rail: some View {
        let recipe = MetalRecipes.scrollspy
        let row = MetalRecipes.row
        let t = colorway.tokens
        let compact = size == .compact
        let shape = RoundedRectangle(cornerRadius: recipe.points("entry.radius"), style: .continuous)
        return VStack(alignment: .leading, spacing: recipe.points("entry.gap")) {
            ForEach(sections) { section in
                let on = section.id == (current ?? sections.first?.id)
                let nested = section.level > 1
                Button { onSelect(section.id) } label: {
                    Text(section.title)
                        .font(.metal(MetalType.ui))
                        .foregroundColor((on || hovering == section.id ? t.ink : t.ink2).color)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, recipe.points("entry.pad-x"))
                        .padding(.vertical, recipe.points(compact ? "entry.pad-y-compact" : "entry.pad-y"))
                        .frame(minHeight: recipe.points(compact ? "entry.height-compact" : "entry.height"))
                        .background {
                            if on {
                                Color.clear
                                    .metalObjectRecipe(row, part: "option", state: "on", in: shape)
                                    .overlay(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: row.points("rail.radius"), style: .continuous)
                                            .fill((row.color("rail.color") ?? MetalShared.greenDeep).color)
                                            .frame(width: row.points("rail.w"))
                                            .padding(.vertical, recipe.points(compact ? "rail.inset-compact" : "rail.inset"))
                                            .offset(x: row.points("rail.offset"))
                                    }
                                    .matchedGeometryEffect(id: "marker", in: marker)
                            }
                        }
                        .contentShape(shape)
                }
                .buttonStyle(.plain)
                .padding(.leading, nested ? recipe.points("entry.indent") : .zero)
                .onHover { hovering = $0 ? section.id : nil }
                .accessibilityAddTraits(on ? [.isSelected] : [])
                .accessibilityHint(on ? "Current section" : "")
            }
        }
        .metalAnimation(.settle, value: current)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }
}

/// A long page and its table of contents: the sections in a scroll view, the rail (beside, trailing) or the
/// strip (above) marking the one at the top, and picking an entry scrolls to it.
public struct MetalScrollspy<Content: View>: View {
    let label: String
    let sections: [MetalScrollspySection]
    let orientation: Axis
    let size: MetalScrollspyRail.Size
    let offset: CGFloat
    let content: (MetalScrollspySection) -> Content

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var position: String?

    /// `offset` is the band at the top a section must reach to be current, and where a jump lands (a header over the scroll view).
    public init(_ label: String, sections: [MetalScrollspySection], orientation: Axis = .vertical,
                size: MetalScrollspyRail.Size = .regular, offset: CGFloat = .zero,
                @ViewBuilder content: @escaping (MetalScrollspySection) -> Content) {
        self.label = label
        self.sections = sections
        self.orientation = orientation
        self.size = size
        self.offset = offset
        self.content = content
    }

    public var body: some View {
        let gap = MetalRecipes.scrollspy.points("entry.indent")
        let rail = MetalScrollspyRail(label, sections: sections, current: position, orientation: orientation, size: size) { id in
            withMetalAnimation(.settle, reduceMotion: reduceMotion) { position = id }
        }
        let layout = orientation == .vertical ? AnyLayout(HStackLayout(alignment: .top, spacing: gap))
            : AnyLayout(VStackLayout(alignment: .leading, spacing: gap))
        return layout {
            if orientation == .horizontal { rail }
            ScrollView {
                VStack(alignment: .leading, spacing: .zero) {
                    ForEach(sections) { section in
                        content(section).id(section.id)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.top, offset, for: .scrollContent)
            .scrollPosition(id: $position, anchor: .top)
            if orientation == .vertical { rail.fixedSize(horizontal: true, vertical: false) }
        }
    }
}
