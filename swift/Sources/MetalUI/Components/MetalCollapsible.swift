import SwiftUI

// Collapsible: show and hide in place, on its own. Mirrors components/collapsible (collapsible.agent.md)
// from the collapsible recipe:
//   row      a 32 row: the title, an optional summary in ink3 and the set's chevron at the end; the
//            row's panel hover hangs past the column, so the title lines up with what it opens
//   key      MetalCollapsibleKey: a ghost key with the chevron, beside a line that names what opens
//   more     `more:`: a quiet key after the panel, "Show 3 more" turning to "Show less"; the chevron
//            turns over; what was hidden opens above it
//   open     the panel is uncovered from its top edge as it slides out from one nest above, fading in,
//            on the settle spring; what follows moves with it (SwiftUI lays it out on the same spring)
//   close    it slides back under its trigger on the release spring
//   chevron  a quarter turn (row, key) or a half (more) on the part spring; it may overshoot
// Reduce Motion: the content crossfades, nothing slides, the chevron snaps.

/// What a closed "show more" key says.
public enum MetalCollapsibleMore: Sendable, Equatable {
    /// "Show 3 more".
    case count(Int)
    /// Other words while closed ("Show all 12 files").
    case words(String)
}

private extension MetalObjectRecipe {
    /// A turn written as "-90deg", in degrees.
    func degrees(_ key: String) -> Double { Double((text(key) ?? "").replacingOccurrences(of: "deg", with: "")) ?? .zero }
}

/// Opens and closes on the collapsible's springs, resolved for Reduce Motion.
@MainActor
private func toggle(_ isOpen: Binding<Bool>, reduceMotion: Bool) {
    withMetalAnimation(isOpen.wrappedValue ? .release : .settle, reduceMotion: reduceMotion) { isOpen.wrappedValue.toggle() }
}

/// Show and hide in place: a row trigger (or a "Show 3 more" key after the panel) and what it opens.
public struct MetalCollapsible<Content: View>: View {
    let title: String?
    let summary: String?
    let more: MetalCollapsibleMore?
    let less: String
    @Binding var isOpen: Bool
    let content: Content

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    /// A row: the title, a summary of what's inside while closed ("PNG, 2×"), and the chevron.
    public init(_ title: String, isOpen: Binding<Bool>, summary: String? = nil, @ViewBuilder content: () -> Content) {
        self.title = title
        self.summary = summary
        self.more = nil
        self.less = ""
        self._isOpen = isOpen
        self.content = content()
    }

    /// The rest of a list: the panel opens above a quiet "Show 3 more" key, which says `less` while open.
    public init(isOpen: Binding<Bool>, more: MetalCollapsibleMore, less: String = "Show less", @ViewBuilder content: () -> Content) {
        self.title = nil
        self.summary = nil
        self.more = more
        self.less = less
        self._isOpen = isOpen
        self.content = content()
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.collapsible }

    public var body: some View {
        VStack(alignment: .leading, spacing: .zero) {
            if let more {
                MetalCollapsiblePanel(isOpen: isOpen) { content }
                moreKey(more)
            } else {
                row
                MetalCollapsiblePanel(isOpen: isOpen) { content }
            }
        }
        .opacity(isEnabled ? .one : recipe.scalar("row.disabled"))
    }

    private var row: some View {
        MetalCollapsibleRow(isOpen: $isOpen, summary: summary) {
            Text(title ?? "").font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                .foregroundColor(colorway.tokens.ink.color).lineLimit(1)
        }
        .accessibilityLabel([title, isOpen ? nil : summary].compactMap { $0 }.joined(separator: ", "))
    }

    private func moreKey(_ more: MetalCollapsibleMore) -> some View {
        let t = colorway.tokens
        let shape = RoundedRectangle(cornerRadius: recipe.points("more.radius"), style: .continuous)
        let closed: String = switch more {
        case .count(let n): "Show \(n) more"
        case .words(let w): w
        }
        return Button { toggle($isOpen, reduceMotion: reduceMotion) } label: {
            HStack(spacing: recipe.points("more.gap")) {
                Text(isOpen ? less : closed)
                    .font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                    .contentTransition(reduceMotion ? .opacity : .numericText())
                    .metalAnimation(.settle, value: isOpen)
                MetalCollapsibleChevron(isOpen: isOpen, closed: .zero, open: recipe.degrees("chevron.over"))
            }
            .foregroundColor(hovering ? t.ink.color : t.ink2.color)
            .padding(.horizontal, recipe.points("more.pad-x"))
            .frame(height: recipe.points("more.height"))
            .metalObjectRecipe(MetalRecipes.row, part: "panel", state: hovering && isEnabled ? "hover" : nil, in: shape)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .padding(.leading, -recipe.points("more.pad-x"))
        .onHover { hovering = $0 }
        .accessibilityValue(isOpen ? "expanded" : "collapsed")
    }
}

/// A ghost key with the chevron, for beside a line that already names what opens. Pair it with a
/// `MetalCollapsiblePanel` on the same binding.
public struct MetalCollapsibleKey: View {
    let label: String
    @Binding var isOpen: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(_ label: String, isOpen: Binding<Bool>) {
        self.label = label
        self._isOpen = isOpen
    }

    public var body: some View {
        MetalIconButton(label, action: { toggle($isOpen, reduceMotion: reduceMotion) }) {
            MetalCollapsibleChevron(isOpen: isOpen, closed: MetalRecipes.collapsible.degrees("chevron.closed"), open: .zero,
                                    size: MetalRecipes.iconButton.points("ghost.glyph"))
        }
        .accessibilityValue(isOpen ? "expanded" : "collapsed")
        .opacity(isEnabled ? .one : MetalRecipes.collapsible.scalar("row.disabled"))
    }

    @Environment(\.isEnabled) private var isEnabled
}

/// The row: a label of the host's (React's Trigger children), the summary while closed and the chevron; the
/// hover plate hangs past the column. Reasoning and Tool call put their lamp and words in the label.
struct MetalCollapsibleRow<Label: View>: View {
    @Binding var isOpen: Bool
    var summary: String? = nil
    var onPress: (() -> Void)? = nil
    @ViewBuilder let label: Label

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false

    var body: some View {
        let recipe = MetalRecipes.collapsible
        let shape = RoundedRectangle(cornerRadius: recipe.points("row.radius"), style: .continuous)
        Button {
            onPress?()
            toggle($isOpen, reduceMotion: reduceMotion)
        } label: {
            HStack(spacing: recipe.points("row.gap")) {
                label.frame(maxWidth: .infinity, alignment: .leading)
                if let summary {
                    Text(summary).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink3.color).lineLimit(1)
                        .opacity(isOpen ? .zero : .one)
                        .metalAnimation(.settle, value: isOpen)
                }
                MetalCollapsibleChevron(isOpen: isOpen, closed: recipe.degrees("chevron.closed"), open: .zero)
            }
            .padding(.horizontal, recipe.points("row.pad-x"))
            .frame(height: recipe.points("row.height"))
            .metalObjectRecipe(MetalRecipes.row, part: "panel", state: hovering && isEnabled ? "hover" : nil, in: shape)
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        // The hover plate hangs past the column, so the title lines up with the content.
        .padding(.horizontal, -recipe.points("row.pad-x"))
        .onHover { hovering = $0 }
        .accessibilityValue(isOpen ? "expanded" : "collapsed")
    }
}

/// What opens: uncovered from its top edge as it slides out on the settle spring; it slides back on
/// release. It adds no padding of its own.
public struct MetalCollapsiblePanel<Content: View>: View {
    let isOpen: Bool
    let content: Content
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(isOpen: Bool, @ViewBuilder content: () -> Content) {
        self.isOpen = isOpen
        self.content = content()
    }

    public var body: some View {
        if isOpen {
            content
                .frame(maxWidth: .infinity, alignment: .leading)
                .transition(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).allowsTravel
                    ? .modifier(active: MetalCollapsibleReveal(progress: .zero), identity: MetalCollapsibleReveal(progress: .one))
                    : .opacity)
        }
    }
}

/// The chevron, turned on the part spring.
private struct MetalCollapsibleChevron: View {
    let isOpen: Bool
    let closed: Double
    let open: Double
    var size: Double = MetalRecipes.collapsible.points("chevron.size")
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        MetalIcon(.chevron, size: size)
            .foregroundColor(colorway.tokens.ink2.color)
            .rotationEffect(.degrees(isOpen ? open : closed))
            .metalAnimation(.part, value: isOpen)
    }
}

/// The reveal: a mask that uncovers from the top edge while the content slides from one nest above and fades in.
private struct MetalCollapsibleReveal: ViewModifier, Animatable {
    var progress: Double
    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }
    func body(content: Content) -> some View {
        // The mask bleeds past the edges, so shadows and focus rings inside aren't cut once it's open.
        let bleed = MetalRecipes.collapsible.points("panel.bleed")
        content
            .offset(y: -MetalRadius.nest * (.one - progress))
            .opacity(progress)
            .mask(alignment: .topLeading) {
                GeometryReader { g in
                    Rectangle()
                        .frame(width: g.size.width + bleed + bleed, height: (g.size.height + bleed + bleed) * progress)
                        .offset(x: -bleed, y: -bleed)
                }
            }
    }
}
