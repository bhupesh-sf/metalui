import SwiftUI

// Alert: a message about this place, painted from the alert recipe (layout, window) and the status
// recipe (plates, strong inks, keyline). Mirrors components/alert (alert.agent.md).

/// What an alert says. Each kind is a glyph, words and a lamp gesture; colour is never the only cue.
public enum MetalAlertKind: Sendable {
    case note, done, waiting, urgent, failed

    var glyph: MetalIconName {
        switch self {
        case .note: return .info
        case .done: return .check
        case .waiting: return .clock
        case .urgent: return .warning
        case .failed: return .syncError
        }
    }

    /// The lamp in the window's corner; a note has none.
    var lamp: (kind: MetalLEDKind, gesture: MetalLampGesture)? {
        switch self {
        case .note: return nil
        case .done: return (.live, .steady)
        case .waiting: return (.waiting, .breathe)
        case .urgent: return (.waiting, .steady)
        case .failed: return (.failed, .blink2)
        }
    }

    /// Read out at once (failed, urgent) rather than politely.
    var assertive: Bool { self == .failed || self == .urgent }
}

/// plate (the status badge's raised plate), quiet (no plate: inside a card or panel), strong (tinted in the kind's ink).
public enum MetalAlertTone: Sendable { case plate, quiet, strong }

/// An inline message about this place: the kind's glyph in a sunk window with its LED in the corner, a
/// title, a description that wraps, actions beside the words (under them when narrow), and a close key
/// when `onDismiss` is given. It arrives rising one nest on the settle spring, and leaves one nest down on
/// the release spring before `onDismiss` runs; it never leaves by itself.
public struct MetalAlert<Actions: View>: View {
    let kind: MetalAlertKind
    let tone: MetalAlertTone
    let banner: Bool
    let solid: Bool
    let title: String?
    let description: String?
    let onDismiss: (() -> Void)?
    let actions: Actions
    @State private var arrived = false
    @State private var leaving = false
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    public init(kind: MetalAlertKind = .note, tone: MetalAlertTone = .plate, banner: Bool = false, solid: Bool = false,
                title: String? = nil, description: String? = nil, onDismiss: (() -> Void)? = nil,
                @ViewBuilder actions: () -> Actions = { EmptyView() }) {
        self.kind = kind
        self.tone = tone
        self.banner = banner
        self.solid = solid
        self.title = title
        self.description = description
        self.onDismiss = onDismiss
        self.actions = actions()
    }

    public var body: some View {
        let recipe = MetalRecipes.alert
        let status = MetalRecipes.status
        let cw = MetalRecipeColorway(colorway)
        let t = colorway.tokens
        let state = kind.lamp?.kind.recipeState
        let strong = tone == .strong && state != nil
        let deep = strong ? state.flatMap { status.color("strong.ink-\($0)", colorway: cw)?.color } : nil
        let keyline = solid || reduceTransparency
        let plated = tone != .quiet || keyline
        let shape = RoundedRectangle(cornerRadius: banner ? .zero : recipe.points("self.radius"), style: .continuous)
        let travel = MetalMotion.resolve(.settle, reduceMotion: reduceMotion).allowsTravel
        let pad = recipe.points("self.pad")
        let side = !plated ? .zero : banner ? recipe.points("banner.pad") : pad

        HStack(alignment: .top, spacing: recipe.points("self.gap")) {
            window(deep ?? t.ink2.color)
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .top, spacing: recipe.points("self.gap")) {
                    words(title: deep ?? t.ink.color, description: strong ? t.ink.color : t.ink2.color)
                        .padding(.top, recipe.points("self.text-top"))
                    Spacer(minLength: .zero)
                    actionRow
                }
                VStack(alignment: .leading, spacing: recipe.points("self.actions-top")) {
                    words(title: deep ?? t.ink.color, description: strong ? t.ink.color : t.ink2.color)
                        .padding(.top, recipe.points("self.text-top"))
                    actionRow
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if onDismiss != nil {
                MetalIconButton("Dismiss", icon: .close) { dismiss() }
            }
        }
        .padding(.vertical, pad)
        .padding(.horizontal, side)
        .metalObjectRecipe(status, part: plated ? "badge" : "none", state: strong ? "strong-\(state ?? "")" : nil, in: shape)
        .overlay {
            if keyline, plated, let line = status.color("badge.keyline", colorway: cw) {
                shape.strokeBorder(line.color, lineWidth: 1)
            }
        }
        .opacity(arrived && !leaving ? .one : .zero)
        .offset(y: travel && (!arrived || leaving) ? MetalRadius.nest : .zero)
        .onAppear {
            withMetalAnimation(.settle, reduceMotion: reduceMotion) { arrived = true }
            announce()
        }
        .onChange(of: kind) { announce() }
        #if os(macOS)
        .onExitCommand { dismiss() }
        #endif
        .accessibilityElement(children: .contain)
    }

    private func window(_ ink: Color) -> some View {
        let recipe = MetalRecipes.alert
        let size = recipe.points("window.size")
        let inset = recipe.points("window.lamp-inset")
        let shape = RoundedRectangle(cornerRadius: recipe.points("window.radius"), style: .continuous)
        return ZStack {
            MetalIcon(kind.glyph, size: recipe.points("window.glyph"))
                .foregroundStyle(ink)
                .id(kind.glyph)
                .transition(.opacity)
        }
        .frame(width: size, height: size)
        .metalObjectRecipe(MetalRecipes.well, part: "self", state: "field", in: shape)
        .overlay(alignment: .topTrailing) {
            if let lamp = kind.lamp {
                MetalLED(lamp.kind, gesture: lamp.gesture).offset(x: inset, y: -inset)
            }
        }
        .animation(MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation, value: kind.glyph)
        .accessibilityHidden(true)
    }

    private func words(title titleInk: Color, description descriptionInk: Color) -> some View {
        VStack(alignment: .leading, spacing: MetalRecipes.alert.points("self.text-gap")) {
            if let title {
                Text(title).font(.metal(MetalType.title)).foregroundStyle(titleInk)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
            }
            if let description {
                Text(description).font(.metal(MetalType.body)).foregroundStyle(descriptionInk)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private var actionRow: some View {
        HStack(spacing: MetalRecipes.alert.points("self.actions-gap")) { actions }
    }

    /// failed and urgent are read out at once, as the web's role alert; the others wait their turn.
    private func announce() {
        guard let words = title ?? description else { return }
        var message = AttributedString(words)
        message.accessibilitySpeechAnnouncementPriority = kind.assertive ? .high : .default
        AccessibilityNotification.Announcement(message).post()
    }

    private func dismiss() {
        guard let onDismiss, !leaving else { return }
        withAnimation(MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation) {
            leaving = true
        } completion: {
            onDismiss()
        }
    }
}
