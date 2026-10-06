import SwiftUI

// Verbs over a selection, adapted to it: the generated graphite surface, MetalToolStripMetrics and the button
// recipe's strip part compose the keys; the web's ToolStrip is the reference.
//
//   a click selection    rises 4 on the part spring (instant under Reduce Motion)
//   the verbs change     the settle spring: kept keys glide, the plate settles to its new width, leaving keys
//                        fade out and new ones fade in (at once under Reduce Motion)
//   doesn't fit          the verbs that don't fit the offered width go into a More key before the destructive one
//   placed               .metalToolStrip(over:) centres it 12 above the selection, below when there's no room,
//                        12 inside the canvas's edges; it follows the rect as the canvas pans and zooms
//   disabled             40 %, the tooltip and the accessibility hint say why
//   waiting              the key's glyph gives way to the ring after the show delay
//   hold                 an irreversible destructive verb fills while held and runs only at the end

/// Choices a verb opens instead of acting: Assign to…, Snooze until….
public struct MetalToolStripMenu {
    public let heading: String?
    public let items: [MetalMenuItem]

    public init(heading: String? = nil, items: [MetalMenuItem]) {
        self.heading = heading
        self.items = items
    }
}

/// A verb over a selection.
public struct MetalToolStripItem: Identifiable {
    public var id: String { label }
    public let label: String
    public let icon: MetalIconName?
    public let iconOnly: Bool
    public let menu: MetalToolStripMenu?
    public let destructive: Bool
    public let disabled: Bool
    public let disabledReason: String?
    public let shortcut: String?
    public let state: MetalButtonState
    public let hold: Bool
    public let single: Bool
    public let action: () -> Void

    /// - Parameters:
    ///   - icon: the verb's glyph, before the word (or alone, with `iconOnly` or a glyphs-only strip).
    ///   - menu: choices to open instead of acting.
    ///   - disabledReason: why it's disabled, in its tooltip and accessibility hint.
    ///   - state: `.waiting` while the verb works (the glyph gives way to the ring).
    ///   - hold: an irreversible destructive verb runs only after a hold.
    ///   - single: only for a selection of one (Rename); `MetalToolStrip.verbs(for:in:)` drops it for several.
    public init(_ label: String, icon: MetalIconName? = nil, iconOnly: Bool = false, menu: MetalToolStripMenu? = nil,
                destructive: Bool = false, disabled: Bool = false, disabledReason: String? = nil, shortcut: String? = nil,
                state: MetalButtonState = .ready, hold: Bool = false, single: Bool = false,
                action: @escaping () -> Void = {}) {
        self.label = label
        self.icon = icon
        self.iconOnly = iconOnly
        self.menu = menu
        self.destructive = destructive
        self.disabled = disabled
        self.disabledReason = disabledReason
        self.shortcut = shortcut
        self.state = state
        self.hold = hold
        self.single = single
        self.action = action
    }
}

/// Verbs over a click selection on a graphite strip; the destructive one after an engraved separator.
public struct MetalToolStrip: View {
    let label: String
    let items: [MetalToolStripItem]
    let count: String?
    let glyphsOnly: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var arrived = false

    /// - Parameters:
    ///   - label: what the verbs act on ("3 blocks").
    ///   - count: a lead before a separator ("3 selected"); its figures turn as it changes.
    ///   - glyphsOnly: only glyphs show; the names are in tooltips (a canvas).
    public init(label: String, items: [MetalToolStripItem], count: String? = nil, glyphsOnly: Bool = false) {
        self.label = label
        self.items = items
        self.count = count
        self.glyphsOnly = glyphsOnly
    }

    /// The verbs a selection gets: those every selected kind shares, in the first kind's order (list shared verbs
    /// in the same order in every set), without the `single` ones when more than one is selected.
    public static func verbs<Kind: Hashable>(for selection: [Kind], in sets: [Kind: [MetalToolStripItem]]) -> [MetalToolStripItem] {
        var kinds: [Kind] = []
        for kind in selection where !kinds.contains(kind) { kinds.append(kind) }
        guard let first = kinds.first, let lead = sets[first] else { return [] }
        return lead.filter { verb in
            !(verb.single && selection.count > 1) && kinds.allSatisfy { sets[$0]?.contains { $0.label == verb.label } ?? false }
        }
    }

    // The verbs that may fold into More: the plain ones before the destructive verb.
    private var foldable: [MetalToolStripItem] {
        let cut = items.firstIndex { $0.destructive } ?? items.endIndex
        return items[..<cut].filter { !$0.iconOnly }
    }

    public var body: some View {
        let travel = MetalMotion.resolve(.part, reduceMotion: reduceMotion).allowsTravel
        // The first layout that fits the offered width: all the verbs, then one fewer each time, into More.
        ViewThatFits(in: .horizontal) {
            ForEach((0...foldable.count).reversed(), id: \.self) { fit in row(folding: Array(foldable.dropFirst(fit))) }
        }
        .background {
            MetalSurface(.graphiteStrip, radius: .strip) { Color.clear }
        }
        .metalAnimation(.settle, value: items.map(\.id))
        .opacity(arrived ? .one : .zero)
        .offset(y: arrived || !travel ? 0 : MetalToolStripMetrics.enterRise)
        .onAppear { withMetalAnimation(.part, reduceMotion: reduceMotion) { arrived = true } }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Tools for \(label)")
    }

    private func row(folding folded: [MetalToolStripItem]) -> some View {
        let shown = items.filter { verb in !folded.contains { $0.id == verb.id } }
        let more = folded.isEmpty ? nil : (shown.firstIndex { $0.destructive } ?? shown.endIndex)
        return HStack(spacing: MetalToolStripMetrics.gap) {
            if let count {
                Text(count)
                    .font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                    .monospacedDigit()
                    .contentTransition(reduceMotion ? .opacity : .numericText())
                    .foregroundColor(MetalToolStripMetrics.inkHover.color)
                    .padding(.horizontal, MetalToolStripMetrics.pad)
                MetalToolStripSeparator()
            }
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, verb in
                if index == more { MetalToolStripMore(folded: folded) }
                if verb.destructive && !(index > 0 && shown[index - 1].destructive) { MetalToolStripSeparator() }
                MetalToolStripKey(item: verb, glyphsOnly: glyphsOnly)
                    .transition(.opacity)
            }
            if more == shown.endIndex { MetalToolStripMore(folded: folded) }
        }
        .padding(MetalToolStripMetrics.pad)
        .fixedSize()
    }
}

/// The engraved rule before the destructive verb (and after a count).
private struct MetalToolStripSeparator: View {
    var body: some View {
        Rectangle().fill(MetalToolStripMetrics.sep.color)
            .frame(width: MetalToolStripMetrics.sepWidth, height: MetalToolStripMetrics.sepHeight)
            .overlay(alignment: .trailing) {
                Rectangle().fill(MetalToolStripMetrics.sepLip.color)
                    .frame(width: MetalToolStripMetrics.sepWidth)
                    .offset(x: MetalToolStripMetrics.sepWidth)
            }
            .padding(.horizontal, MetalToolStripMetrics.sepPad)
            .accessibilityHidden(true)
    }
}

/// The More key: the verbs that didn't fit, as a menu (a verb with choices lists them under its heading).
private struct MetalToolStripMore: View {
    let folded: [MetalToolStripItem]
    @State private var open = false

    var body: some View {
        let rows = folded.flatMap { verb -> [MetalMenuItem] in
            if let menu = verb.menu {
                return menu.items.map { MetalMenuItem("\(menu.heading ?? verb.label) \($0.label)", icon: verb.icon, action: $0.action ?? {}) }
            }
            return [MetalMenuItem(verb.label, icon: verb.icon, shortcut: verb.shortcut, disabled: verb.disabled || verb.state == .waiting, action: verb.action)]
        }
        MetalToolStripKey(item: MetalToolStripItem("More", icon: .more, iconOnly: true) { open = true }, glyphsOnly: true)
            .metalMenu(isPresented: $open, heading: "More", items: rows)
    }
}

/// One key on the strip cap: its glyph (or its wait), its word, its tooltip, a menu or a hold.
private struct MetalToolStripKey: View {
    let item: MetalToolStripItem
    let glyphsOnly: Bool
    @State private var hovering = false
    @State private var choosing = false
    @State private var holding = false
    @State private var fill = Double.zero
    @State private var ringShown = false
    @FocusState private var focused: Bool
    @Environment(\.metalWaitFrozen) private var frozen
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var holds: Bool { item.hold && item.destructive }

    var body: some View {
        let recipe = MetalRecipes.button
        let glyph = recipe.points("strip.glyph")
        let named = item.iconOnly || glyphsOnly
        let reason = item.disabled ? item.disabledReason : nil
        let note = reason ?? (holds ? "hold to confirm" : nil)
        Button(action: run) {
            HStack(spacing: recipe.points("self.gap")) {
                if let icon = item.icon {
                    if item.state == .waiting {
                        MetalSpinner(size: .small, label: item.label, phase: ringShown || frozen ? .shown : .quiet) { MetalIcon(icon, size: glyph) }
                            .frame(width: glyph, height: glyph)
                    } else {
                        MetalIcon(icon, size: glyph)
                    }
                }
                if !named || item.icon == nil { Text(item.label) }
            }
        }
        .buttonStyle(MetalToolStripButtonStyle(destructive: item.destructive, hovering: hovering && !item.disabled, held: item.state != .ready || holding, fill: fill))
        .disabled(item.disabled)
        .opacity(item.disabled ? recipe.scalar("self.disabled") : .one)
        .focusEffectDisabled()
        .focused($focused)
        .overlay {
            if focused {
                RoundedRectangle(cornerRadius: MetalRadius.row, style: .continuous)
                    .stroke(MetalShared.focus.color, lineWidth: recipe.points("self.focus-width"))
            }
        }
        .onHover { hovering = $0 }
        .task(id: item.state) {
            // The ring stands in for the glyph only after the show delay: a quick verb never shows it.
            ringShown = false
            guard item.state == .waiting else { return }
            try? await Task.sleep(for: .seconds(MetalRecipes.spinner.durationSeconds("self.delay")))
            if !Task.isCancelled { ringShown = true }
        }
        .modifier(MetalToolStripHold(enabled: holds && !item.disabled, holding: $holding, fill: $fill, action: item.action))
        .metalTooltip(note.map { "\(item.label) · \($0)" } ?? item.label, shortcut: item.shortcut)
        .metalMenu(isPresented: $choosing, heading: item.menu?.heading, items: item.menu?.items ?? [])
        .accessibilityLabel(item.label)
        .accessibilityHint(reason ?? (holds ? "Hold to confirm" : ""))
        .accessibilityValue(item.state == .waiting ? "In progress" : "")
    }

    private func run() {
        guard !item.disabled, item.state == .ready, !holds else { return }
        if item.menu != nil { choosing = true } else { item.action() }
    }
}

/// Hold to confirm on the strip's danger key (the web's Button `hold`, same fill and timing): pressing runs the fill
/// across the key over the hold time; letting go early drains it on the release spring; the end runs the verb.
/// VoiceOver's activate runs it at once (it can't hold). Reduce Motion: the fill still runs (it is time).
private struct MetalToolStripHold: ViewModifier {
    let enabled: Bool
    @Binding var holding: Bool
    @Binding var fill: Double
    let action: () -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        if enabled {
            content
                .onLongPressGesture(minimumDuration: MetalRecipes.button.durationSeconds("hold.time"), perform: {
                    holding = false
                    fill = .zero
                    action()
                }, onPressingChanged: { pressing in
                    holding = pressing
                    if pressing {
                        withAnimation(.linear(duration: MetalRecipes.button.durationSeconds("hold.time"))) { fill = .one }
                    } else {
                        withMetalAnimation(.release, reduceMotion: reduceMotion) { fill = .zero }
                    }
                })
                .accessibilityAction { action() }
        } else {
            content
        }
    }
}

private struct MetalToolStripButtonStyle: ButtonStyle {
    let destructive: Bool
    let hovering: Bool
    let held: Bool
    let fill: Double

    func makeBody(configuration: Configuration) -> some View {
        let down = configuration.isPressed || held
        let ink = destructive ? (fill > .zero ? MetalToolStripMetrics.inkHover : MetalToolStripMetrics.danger) : hovering ? MetalToolStripMetrics.inkHover : MetalToolStripMetrics.ink
        let shape = RoundedRectangle(cornerRadius: MetalRadius.row, style: .continuous)
        configuration.label
            .font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
            .foregroundColor(ink.color)
            .padding(.horizontal, MetalToolStripMetrics.buttonPad)
            .frame(height: MetalToolStripMetrics.buttonHeight)
            .background {
                ZStack(alignment: .leading) {
                    shape.fill(down ? MetalToolStripMetrics.active.color : hovering ? MetalToolStripMetrics.hover.color : .clear)
                    if fill > .zero {
                        GeometryReader { box in
                            Color.clear.metalObjectRecipe(MetalRecipes.button, part: "hold", in: shape)
                                .offset(x: -(Double.one - fill) * box.size.width)
                        }
                        .clipShape(shape)
                    }
                }
            }
            .offset(y: down ? MetalRecipes.button.points("self.travel") : .zero)
            .contentShape(shape)
            .metalAnimation(.release, value: down)
    }
}

/// Places a tool strip over a selection in this view (the canvas): centred `gapAbove` above `rect`, below it when
/// there's no room above, kept inside the edges; offered the canvas's width, so verbs that don't fit go into More.
private struct MetalToolStripPlacement: Layout {
    let anchor: CGRect

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        proposal.replacingUnspecifiedDimensions()
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        guard let strip = subviews.first else { return }
        let margin = MetalToolStripMetrics.gapAbove
        let size = strip.sizeThatFits(ProposedViewSize(width: max(bounds.width - margin - margin, .zero), height: nil))
        let x = min(max(anchor.midX - size.width / 2, margin), bounds.width - size.width - margin)
        let above = anchor.minY - margin - size.height
        let below = anchor.maxY + margin
        let y = above >= margin || below + size.height > bounds.height - margin ? max(above, margin) : below
        strip.place(at: CGPoint(x: bounds.minX + x, y: bounds.minY + y), anchor: .topLeading, proposal: ProposedViewSize(size))
    }
}

extension View {
    /// Shows a tool strip over the selection's bounds `rect` (in this view's space, after pan and zoom), or
    /// nothing when `rect` is nil. The strip follows the rect as it moves.
    ///
    ///     canvas.metalToolStrip(over: selectionBounds) {
    ///         MetalToolStrip(label: what, items: MetalToolStrip.verbs(for: kinds, in: sets), glyphsOnly: true)
    ///     }
    public func metalToolStrip<Strip: View>(over rect: CGRect?, @ViewBuilder strip: () -> Strip) -> some View {
        overlay {
            if let rect {
                MetalToolStripPlacement(anchor: rect) { strip() }
            }
        }
    }
}
