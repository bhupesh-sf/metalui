import SwiftUI

// CARD, a person's thing held on a raised plate (card.agent.md), painted from the generated surface,
// card, well, icon-button and status recipes, the same stacks the web draws.
//
//   rest       the raised plate: optional media (on top, or square at the start), a title, a status LED
//              and a corner action level with its first line, a line, a footer of actions
//   link       `open`: the title is the link and the whole card its hit area; the action and the footer
//              stay their own buttons
//   hover      only a card that goes somewhere lifts one grid step on the settle spring, its lift shadow
//              fading in; pressed, it comes back down
//   focus      the green ring round the card when its title link has focus; selected, the ring 3 out
//   waiting    a lit edge travels round its own border after the show delay (MetalSpinnerEdge)
//   size       regular (pad 16) or compact (pad 12); a frame's size and orientation reach its cards
// MetalCardChoice latches like the tool key: pressed it sinks, chosen it stays down, seated, with the
// 4 pt green LED. MetalCardFrame holds cards: separated (a sunk tray), stacked (one plate, sections
// between engraved hairlines) or ghost. MetalCardEmptySlot is a recess with plus and a verb.
// Reduce Motion: no lift (the shadow still grows); a choice still seats its 1 pt, as the tool key does.

public enum MetalCardSize: Sendable { case regular, compact }
public enum MetalCardOrientation: Sendable { case vertical, horizontal }
public enum MetalCardFrameVariant: Sendable { case separated, stacked, ghost }

/// The state of the thing a card stands for, as an LED: green live, amber waiting, red failed.
public enum MetalCardStatus: Sendable {
    case live, waiting, failed

    var led: MetalLEDKind {
        switch self {
        case .live: return .live
        case .waiting: return .waiting
        case .failed: return .failed
        }
    }

    var word: String {
        switch self {
        case .live: return "Live"
        case .waiting: return "Waiting"
        case .failed: return "Failed"
        }
    }
}

/// The corner action: a ghost icon key (`more` by default) level with the title's first line.
public struct MetalCardAction {
    let label: String
    let icon: MetalIconName
    let perform: () -> Void

    /// `label` says what it does for this card ("More for Trip to Lisbon"); it is the key's name.
    public init(_ label: String, icon: MetalIconName = .more, perform: @escaping () -> Void) {
        self.label = label
        self.icon = icon
        self.perform = perform
    }
}

/// The card recipe's metrics at a size.
struct MetalCardMetrics {
    let pad, gap, footerGap, media, side: Double

    init(_ size: MetalCardSize) {
        let r = MetalRecipes.card
        let part = size == .compact ? "compact" : "self"
        pad = r.points("\(part).pad")
        gap = r.points("\(part).gap")
        footerGap = r.points("\(part).footer-gap")
        media = r.points("\(part).media")
        side = r.points("\(part).side")
    }
}

/// Where a card sits: in no frame, or in one (its variant, size and orientation).
struct MetalCardPlace: Equatable {
    var variant: MetalCardFrameVariant?
    var size: MetalCardSize = .regular
    var orientation: MetalCardOrientation = .vertical

    var section: Bool { variant == .stacked }

    /// The plate's shape: the card radius; a section is square, and the stacked plate clips it round.
    var shape: RoundedRectangle {
        RoundedRectangle(cornerRadius: section ? .zero : MetalRecipes.surface.points("radius.card"), style: .continuous)
    }
}

private struct MetalCardPlaceKey: EnvironmentKey { static let defaultValue: MetalCardPlace? = nil }

extension EnvironmentValues {
    var metalCardPlace: MetalCardPlace? {
        get { self[MetalCardPlaceKey.self] }
        set { self[MetalCardPlaceKey.self] = newValue }
    }
}

// MARK: - The card

/// A person's thing on a raised plate: media, a title (the link, with `open`), a status LED, a corner
/// action, a line and a footer of actions.
public struct MetalCard<Media: View, Footer: View>: View {
    let title: String
    let description: String?
    let selected: Bool
    let waiting: Bool
    let status: MetalCardStatus?
    let statusLabel: String?
    let size: MetalCardSize?
    let orientation: MetalCardOrientation?
    let action: MetalCardAction?
    let open: (() -> Void)?
    let media: Media
    let footer: Footer

    @Environment(\.metalColorway) private var colorway
    @Environment(\.metalCardPlace) private var place
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hovering = false
    @State private var pressed = false
    @FocusState private var linkFocused: Bool

    /// `open` makes the card go somewhere: its title is the link and the whole card the hit area.
    /// `waiting`: its work is under way; after the show delay a lit edge travels round its border. Its
    /// words (the description) say what is happening. `status` lights an LED named by `statusLabel`
    /// (or Live, Waiting, Failed). `size` and `orientation` default to the frame's.
    public init(_ title: String, description: String? = nil, selected: Bool = false, waiting: Bool = false,
                status: MetalCardStatus? = nil, statusLabel: String? = nil, size: MetalCardSize? = nil,
                orientation: MetalCardOrientation? = nil, action: MetalCardAction? = nil, open: (() -> Void)? = nil,
                @ViewBuilder media: () -> Media, @ViewBuilder footer: () -> Footer) {
        self.title = title
        self.description = description
        self.selected = selected
        self.waiting = waiting
        self.status = status
        self.statusLabel = statusLabel
        self.size = size
        self.orientation = orientation
        self.action = action
        self.open = open
        self.media = media()
        self.footer = footer()
    }

    public var body: some View {
        let own = place ?? MetalCardPlace()
        let m = MetalCardMetrics(size ?? own.size)
        let horizontal = (orientation ?? own.orientation) == .horizontal
        let hasMedia = Media.self != EmptyView.self
        let shape = own.shape
        let lifts = open != nil && !own.section
        let lifted = lifts && hovering && !pressed
        let travel = MetalMotion.resolve(.settle, reduceMotion: reduceMotion).allowsTravel
        let cw = MetalRecipeColorway(colorway)

        Group {
            if horizontal {
                HStack(alignment: .top, spacing: m.pad) {
                    if hasMedia {
                        media
                            .frame(width: m.side, height: m.side)
                            .clipShape(RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card") - m.pad, style: .continuous))
                    }
                    content(m)
                }
                .padding(m.pad)
            } else {
                VStack(alignment: .leading, spacing: .zero) {
                    if hasMedia {
                        media
                            .frame(maxWidth: .infinity)
                            .frame(height: m.media)
                            .clipped()
                    }
                    content(m)
                        .padding(.horizontal, m.pad)
                        .padding(.top, hasMedia ? m.footerGap : m.pad)
                        .padding(.bottom, m.pad)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .clipShape(shape)
        .background {
            if own.section {
                shape.fill(MetalRecipes.card.color("section.hover", colorway: cw)?.color ?? .clear)
                    .opacity(lifts && hovering ? .one : .zero)
                    .animation(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: hovering)
            } else {
                MetalOuterShadows(layers: MetalRecipes.card.shadows("lift", colorway: cw), shape: shape, excludesInterior: true)
                    .opacity(lifted ? .one : .zero)
                    .animation(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: lifted)
            }
        }
        .modifier(MetalCardPlate(section: own.section, shape: shape))
        .overlay {
            if waiting { MetalSpinnerEdge(shape: shape, waiting: waiting) }
        }
        .overlay {
            if selected || linkFocused {
                let ring = MetalRecipes.card.points("self.select-width")
                let out = own.section ? -ring : MetalRecipes.card.points("self.select-offset")
                shape.inset(by: -(out + ring / 2)).stroke(MetalShared.focus.color, lineWidth: ring)
            }
        }
        .contentShape(shape)
        .gesture(DragGesture(minimumDistance: .zero)
            .onChanged { _ in if open != nil { pressed = true } }
            .onEnded { _ in pressed = false; open?() })
        .onHover { hovering = $0 }
        .offset(y: lifted && travel ? -MetalSpace.s4 : .zero)
        .animation(pressed ? .linear(duration: MetalRecipes.button.durationSeconds("self.press")) : MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: lifted)
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(selected ? [.isSelected] : [])
        .accessibilityValue(waiting ? "In progress" : "")
    }

    private func content(_ m: MetalCardMetrics) -> some View {
        let t = colorway.tokens
        let box = MetalRecipes.card.points("status.box")
        let inset = MetalRecipes.card.points("action.inset")
        return VStack(alignment: .leading, spacing: m.gap) {
            HStack(alignment: .top, spacing: m.gap) {
                titleView
                    .font(.metal(MetalType.title))
                    .foregroundStyle(t.ink.color)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if let status {
                    let word = statusLabel ?? status.word
                    MetalLED(status.led, gesture: MetalStatusBadge.gesture(for: status.led))
                        .frame(width: box, height: box)
                        .help(word)
                        .accessibilityElement()
                        .accessibilityLabel(word)
                        .accessibilityAddTraits(.isImage)
                }
                if let action {
                    MetalIconButton(action.label, icon: action.icon, action: action.perform)
                        .padding(.vertical, -inset)
                        .padding(.trailing, -inset)
                }
            }
            if let description {
                Text(description)
                    .font(.metal(MetalType.body))
                    .foregroundStyle(t.ink2.color)
            }
            if Footer.self != EmptyView.self {
                HStack(spacing: m.footerGap) { footer }
                    .padding(.top, m.footerGap - m.gap)
            }
        }
    }

    @ViewBuilder private var titleView: some View {
        if let open {
            Button(action: open) { Text(title) }
                .buttonStyle(.plain)
                .focusEffectDisabled()
                .focused($linkFocused)
                .accessibilityAddTraits(.isLink)
        } else {
            Text(title).accessibilityAddTraits(.isHeader)
        }
    }
}

// A footer without media passes `media: { EmptyView() }`: one trailing closure is always the media.
extension MetalCard where Footer == EmptyView {
    public init(_ title: String, description: String? = nil, selected: Bool = false, waiting: Bool = false,
                status: MetalCardStatus? = nil, statusLabel: String? = nil, size: MetalCardSize? = nil,
                orientation: MetalCardOrientation? = nil, action: MetalCardAction? = nil, open: (() -> Void)? = nil,
                @ViewBuilder media: () -> Media) {
        self.init(title, description: description, selected: selected, waiting: waiting, status: status, statusLabel: statusLabel,
                  size: size, orientation: orientation, action: action, open: open, media: media, footer: { EmptyView() })
    }
}

extension MetalCard where Media == EmptyView, Footer == EmptyView {
    public init(_ title: String, description: String? = nil, selected: Bool = false, waiting: Bool = false,
                status: MetalCardStatus? = nil, statusLabel: String? = nil, size: MetalCardSize? = nil,
                orientation: MetalCardOrientation? = nil, action: MetalCardAction? = nil, open: (() -> Void)? = nil) {
        self.init(title, description: description, selected: selected, waiting: waiting, status: status, statusLabel: statusLabel,
                  size: size, orientation: orientation, action: action, open: open, media: { EmptyView() }, footer: { EmptyView() })
    }
}

/// The raised plate behind a card; a stacked section has none (the frame is its plate).
private struct MetalCardPlate<S: InsettableShape>: ViewModifier {
    let section: Bool
    let shape: S

    func body(content: Content) -> some View {
        if section { content } else { content.metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: shape) }
    }
}

/// The engraved hairline above a stacked section: the rule's groove with its lip below, inset by the padding.
private struct MetalCardHairline: View {
    let inset: Double
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let cw = MetalRecipeColorway(colorway)
        let thickness = MetalRecipes.rule.points("self.thickness")
        let groove: Color = {
            if case .solid(let paint)? = MetalRecipes.rule.fills("self", colorway: cw).first { return paint.resolved(self: nil).color }
            return .clear
        }()
        VStack(spacing: .zero) {
            groove.frame(height: thickness)
            (MetalRecipes.card.color("rule.lip", colorway: cw)?.color ?? .clear).frame(height: thickness)
        }
        .padding(.horizontal, inset)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

// MARK: - The frame

/// Holds cards: a sunk tray of raised peers (separated), one raised plate whose sections sit between
/// engraved hairlines (stacked), or the cards alone (ghost). Its size and orientation reach its cards;
/// horizontal makes one column of side cards (a result list).
public struct MetalCardFrame<Content: View>: View {
    let variant: MetalCardFrameVariant
    let size: MetalCardSize
    let orientation: MetalCardOrientation
    let content: Content

    public init(_ variant: MetalCardFrameVariant = .separated, size: MetalCardSize = .regular,
                orientation: MetalCardOrientation = .vertical, @ViewBuilder content: () -> Content) {
        self.variant = variant
        self.size = size
        self.orientation = orientation
        self.content = content()
    }

    public var body: some View {
        let r = MetalRecipes.card
        let compact = size == .compact
        let pad = r.points(compact ? "frame.compact-pad" : "frame.pad")
        let gap = r.points(compact ? "frame.compact-gap" : "frame.gap")
        let card = MetalRecipes.surface.points("radius.card")
        let place = MetalCardPlace(variant: variant, size: size, orientation: orientation)
        switch variant {
        case .stacked:
            let plate = RoundedRectangle(cornerRadius: card, style: .continuous)
            _VariadicView.Tree(MetalCardSections(pad: MetalCardMetrics(size).pad)) { content }
                .environment(\.metalCardPlace, place)
                .clipShape(plate)
                .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: plate)
        case .separated:
            grid(gap: gap, place: place)
                .padding(pad)
                .metalObjectRecipe(MetalRecipes.well, part: "self", state: "field", in: RoundedRectangle(cornerRadius: card + pad, style: .continuous))
        case .ghost:
            grid(gap: gap, place: place)
        }
    }

    private func grid(gap: Double, place: MetalCardPlace) -> some View {
        let column = orientation == .horizontal ? GridItem(.flexible(), spacing: gap, alignment: .top) : GridItem(.adaptive(minimum: MetalRecipes.card.points("frame.column")), spacing: gap, alignment: .top)
        return LazyVGrid(columns: [column], alignment: .leading, spacing: gap) { content }
            .environment(\.metalCardPlace, place)
    }
}

/// A stacked frame's sections, an engraved hairline between each and the next.
private struct MetalCardSections: _VariadicView_UnaryViewRoot {
    let pad: Double

    func body(children: _VariadicView.Children) -> some View {
        VStack(spacing: .zero) {
            ForEach(Array(children.enumerated()), id: \.element.id) { index, child in
                if index != children.startIndex { MetalCardHairline(inset: pad) }
                child
            }
        }
    }
}

// MARK: - Choice cards

/// The set a choice card belongs to: one value (a radio) or several (checkboxes).
struct MetalCardChoiceSet {
    let multiple: Bool
    let isOn: (String) -> Bool
    let toggle: (String) -> Void
}

private struct MetalCardChoiceSetKey: EnvironmentKey { static let defaultValue: MetalCardChoiceSet? = nil }

extension EnvironmentValues {
    var metalCardChoiceSet: MetalCardChoiceSet? {
        get { self[MetalCardChoiceSetKey.self] }
        set { self[MetalCardChoiceSetKey.self] = newValue }
    }
}

/// A set of choice cards: one of them (`selection`) or several (`selections`). Put the frame inside it.
public struct MetalCardChoices<Content: View>: View {
    let set: MetalCardChoiceSet
    let content: Content

    public init(selection: Binding<String>, @ViewBuilder content: () -> Content) {
        set = MetalCardChoiceSet(multiple: false, isOn: { selection.wrappedValue == $0 }, toggle: { selection.wrappedValue = $0 })
        self.content = content()
    }

    public init(selections: Binding<Set<String>>, @ViewBuilder content: () -> Content) {
        set = MetalCardChoiceSet(multiple: true, isOn: { selections.wrappedValue.contains($0) }, toggle: { v in
            if selections.wrappedValue.contains(v) { selections.wrappedValue.remove(v) } else { selections.wrappedValue.insert(v) }
        })
        self.content = content()
    }

    public var body: some View {
        content
            .environment(\.metalCardChoiceSet, set)
            .accessibilityElement(children: .contain)
    }
}

/// A card you choose: pressed it sinks, chosen it stays down, seated flush, with the latch's green LED.
public struct MetalCardChoice: View {
    let title: String
    let description: String?
    let value: String
    let waiting: Bool
    let size: MetalCardSize?
    @Environment(\.metalCardChoiceSet) private var set
    @Environment(\.metalCardPlace) private var place
    @Environment(\.metalColorway) private var colorway

    public init(_ title: String, description: String? = nil, value: String, waiting: Bool = false, size: MetalCardSize? = nil) {
        self.title = title
        self.description = description
        self.value = value
        self.waiting = waiting
        self.size = size
    }

    public var body: some View {
        let on = set?.isOn(value) ?? false
        let m = MetalCardMetrics(size ?? place?.size ?? .regular)
        let t = colorway.tokens
        Button { set?.toggle(value) } label: {
            VStack(alignment: .leading, spacing: m.gap) {
                Text(title).font(.metal(MetalType.title)).foregroundStyle(t.ink.color)
                if let description { Text(description).font(.metal(MetalType.body)).foregroundStyle(t.ink2.color) }
            }
            .padding(m.pad)
            .frame(maxWidth: .infinity, alignment: .topLeading)
        }
        .buttonStyle(MetalCardChoiceStyle(on: on, waiting: waiting))
        .focusEffectDisabled()
        .accessibilityAddTraits(on ? [.isSelected] : [])
        .accessibilityValue(waiting ? "In progress" : (set?.multiple ?? false) ? (on ? "On" : "Off") : "")
    }
}

private struct MetalCardChoiceStyle: ButtonStyle {
    let on: Bool
    let waiting: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card"), style: .continuous)
        let down = on || (configuration.isPressed && isEnabled)
        let release = MetalMotion.resolve(.release, reduceMotion: false).animation
        let led = MetalRecipes.iconButton.points("led.size")
        configuration.label
            .contentShape(shape)
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: shape).opacity(down ? .zero : .one)
                    Color.clear.metalObjectRecipe(MetalRecipes.card, part: "self", state: "chosen", in: shape).opacity(down ? .one : .zero)
                }
            }
            .overlay(alignment: .topTrailing) {
                Color.clear
                    .frame(width: led, height: led)
                    .metalObjectRecipe(MetalRecipes.iconButton, part: "led", in: Circle())
                    .padding(MetalRecipes.card.points("latch.inset"))
                    .opacity(on ? .one : .zero)
            }
            .overlay { if waiting { MetalSpinnerEdge(shape: shape, waiting: waiting) } }
            .overlay {
                if isFocused && isEnabled {
                    shape.inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2)).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                }
            }
            // The seat is a key's depth, so it stays under Reduce Motion, as the tool key's press does.
            .offset(y: down ? MetalRecipes.iconButton.points("tool.press") : .zero)
            .animation(configuration.isPressed ? .linear(duration: MetalRecipes.button.durationSeconds("self.press")) : release, value: down)
            .animation(release, value: on)
            .opacity(isEnabled ? .one : MetalRecipes.button.scalar("self.disabled"))
    }
}

// MARK: - The empty slot

/// An empty place in a frame, sunk, with plus and a verb ("New canvas"): where a new card will go.
public struct MetalCardEmptySlot: View {
    let verb: String
    let action: () -> Void

    public init(_ verb: String, action: @escaping () -> Void) {
        self.verb = verb
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            VStack(spacing: MetalRecipes.card.points("slot.gap")) {
                MetalIcon(.plus, size: MetalRecipes.card.points("slot.glyph"))
                Text(verb).font(.metal(MetalType.ui))
            }
            .frame(maxWidth: .infinity, minHeight: MetalRecipes.card.points("slot.height"))
        }
        .buttonStyle(MetalCardSlotStyle())
        .focusEffectDisabled()
        .accessibilityLabel(verb)
    }
}

private struct MetalCardSlotStyle: ButtonStyle {
    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @State private var hovering = false

    func makeBody(configuration: Configuration) -> some View {
        let shape = RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card"), style: .continuous)
        let t = colorway.tokens
        configuration.label
            .foregroundStyle(hovering && isEnabled ? t.ink.color : t.ink2.color)
            .metalIconInteraction(MetalIconInteraction(isHovered: hovering && isEnabled, isPressed: configuration.isPressed))
            .contentShape(shape)
            .metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: shape)
            .overlay {
                if isFocused && isEnabled {
                    shape.inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2)).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                }
            }
            .animation(.easeInOut(duration: MetalRecipes.iconButton.durationSeconds("self.fade")), value: hovering)
            .onHover { hovering = $0 }
            .opacity(isEnabled ? .one : MetalRecipes.button.scalar("self.disabled"))
    }
}
