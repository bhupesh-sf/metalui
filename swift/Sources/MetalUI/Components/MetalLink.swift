import SwiftUI

// A link on its own line, from the generated link recipe: the engraved hairline under the words, which
// rises and thickens over a faint tint on hover; the words sink and dim while pressed; current, disabled
// and loading; the external, download and standalone glyphs after the words. Visited has no SwiftUI
// twin (there is no history to read). Web is the reference: link.agent.md.

/// How a link sits: in a sentence, quiet until pointed at, or on its own line with a chevron.
public enum MetalLinkKind: Sendable {
    case inline
    case quiet
    case standalone
}

/// A link that opens `destination`. One line; for links inside running text use `Text` with a
/// Markdown link and keep this look for the ones that stand alone.
///
///     MetalLink("the export guide", destination: guide)
///     MetalLink("the WAI notes", destination: wai, external: true)
///     MetalLink("All regions", destination: regions, kind: .standalone)
///     MetalLink("Export", destination: export, reason: "Export is on the Pro plan").disabled(true)
public struct MetalLink: View {
    private let title: String
    private let destination: URL
    private let kind: MetalLinkKind
    private let external: Bool
    private let fileSize: String?
    private let current: Bool
    private let loading: Bool
    private let reason: String?
    @Environment(\.openURL) private var openURL
    @Environment(\.isEnabled) private var isEnabled

    public init(
        _ title: String, destination: URL, kind: MetalLinkKind = .inline, external: Bool = false,
        fileSize: String? = nil, current: Bool = false, loading: Bool = false, reason: String? = nil
    ) {
        self.title = title
        self.destination = destination
        self.kind = kind
        self.external = external
        self.fileSize = fileSize
        self.current = current
        self.loading = loading
        self.reason = reason
    }

    public var body: some View {
        Button { openURL(destination) } label: {
            MetalLinkLabel(title: title, kind: kind, glyph: glyph, fileSize: fileSize, current: current, loading: loading)
        }
        .buttonStyle(MetalLinkStyle(current: current))
        .focusEffectDisabled()
        .help(isEnabled ? "" : reason ?? "")
        .accessibilityAddTraits(.isLink)
        .accessibilityRemoveTraits(.isButton)
        .accessibilityHint(hint)
    }

    private var glyph: MetalIconName? {
        if fileSize != nil { return .download }
        if external { return .external }
        return kind == .standalone && !current ? .chevron : nil
    }

    private var hint: String {
        if !isEnabled { return reason ?? "" }
        if loading { return "Loading" }
        if let fileSize { return "Download, \(fileSize)" }
        return external ? "Opens in your browser" : ""
    }
}

/// The press and focus of a link: the label reads them, the button runs it.
private struct MetalLinkStyle: ButtonStyle {
    let current: Bool

    func makeBody(configuration: Configuration) -> some View {
        MetalLinkPress(configuration: configuration, current: current)
    }
}

private struct MetalLinkPress: View {
    let configuration: ButtonStyleConfiguration
    let current: Bool
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.metalLinkStill) private var still

    var body: some View {
        let recipe = MetalRecipes.link
        let down = (configuration.isPressed || still == .pressed) && isEnabled && !current
        configuration.label
            .environment(\.metalLinkPressed, down)
            .overlay {
                if isFocused && isEnabled {
                    RoundedRectangle(cornerRadius: recipe.points("hover.radius"), style: .continuous)
                        .inset(by: -(MetalRing.focusOffset + MetalRing.focusWidth / 2))
                        .stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
                }
            }
    }
}

/// A state held without a pointer, like the web's data-hovered and data-pressed (a states strip, a capture).
enum MetalLinkStill: Sendable { case hover, pressed }

private struct MetalLinkPressedKey: EnvironmentKey { static let defaultValue = false }
private struct MetalLinkStillKey: EnvironmentKey { static let defaultValue: MetalLinkStill? = nil }
extension EnvironmentValues {
    fileprivate var metalLinkPressed: Bool {
        get { self[MetalLinkPressedKey.self] }
        set { self[MetalLinkPressedKey.self] = newValue }
    }
    var metalLinkStill: MetalLinkStill? {
        get { self[MetalLinkStillKey.self] }
        set { self[MetalLinkStillKey.self] = newValue }
    }
}

private struct MetalLinkLabel: View {
    let title: String
    let kind: MetalLinkKind
    let glyph: MetalIconName?
    let fileSize: String?
    let current: Bool
    let loading: Bool
    @Environment(\.metalLinkPressed) private var pressed
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.metalColorway) private var colorway
    @Environment(\.metalLinkStill) private var still
    @State private var hovering = false

    var body: some View {
        let recipe = MetalRecipes.link
        let tokens = colorway.tokens
        let role = MetalType.body
        let hover = (hovering || still == .hover) && isEnabled && !current && !loading
        let ink = !isEnabled ? tokens.ink3.color : tokens.ink.color
        let lined = isEnabled && !current && (kind != .quiet || hover)
        let pad = recipe.points("hover.pad")
        HStack(alignment: .firstTextBaseline, spacing: role.size * em(recipe.text("glyph.gap"))) {
            Text(title)
                .lineLimit(1)
                // a link says where it goes in full: it never truncates its words
                .fixedSize(horizontal: true, vertical: false)
                .padding(.horizontal, pad)
                .background {
                    RoundedRectangle(cornerRadius: recipe.points("hover.radius"), style: .continuous)
                        .fill(ink.opacity(hover ? percent(recipe.text("hover.tint")) : .zero))
                }
                .padding(.horizontal, -pad)
                .overlay(alignment: .bottom) {
                    MetalLinkLine(hover: hover, loading: loading, ink: ink, rest: (recipe.color("underline.ink", colorway: MetalRecipeColorway(colorway)) ?? tokens.ink3).color)
                        .opacity(lined ? .one : .zero)
                }
            if let glyph {
                MetalIcon(glyph, size: role.size * em(recipe.text("glyph.size")))
                    .rotationEffect(.degrees(glyph == .chevron ? -90 : .zero))
                    .alignmentGuide(.firstTextBaseline) { $0[.bottom] + role.size * em(recipe.text("glyph.drop")) }
            }
            if let fileSize {
                Text("· \(fileSize)").monospacedDigit().foregroundStyle(ink.opacity(percent(recipe.text("file.quiet"))))
            }
        }
        .font(.metal(role))
        .tracking(role.trackingPoints)
        .foregroundStyle(ink)
        .metalIconInteraction(MetalIconInteraction(isHovered: hover, isPressed: pressed))
        .contentShape(Rectangle())
        .onHover { hovering = $0 }
        // the words sink one step and dim while held, at once (the button's press rides release)
        .offset(y: pressed ? recipe.points("self.travel") : .zero)
        .opacity(pressed ? recipe.scalar("self.pressed") : .one)
        .metalAnimation(.release, value: pressed)
    }
}

/// The hairline under the words: rest ink at rest; hovered it rises and thickens in full ink on the
/// settle spring; loading, a run of ink travels along it (Reduce Motion: it breathes).
private struct MetalLinkLine: View {
    let hover: Bool
    let loading: Bool
    let ink: Color
    let rest: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var running = false

    var body: some View {
        let recipe = MetalRecipes.link
        let thickness = recipe.points(hover ? "hover.thickness" : "underline.thickness")
        let rise = hover ? recipe.points("hover.rise") : .zero
        let line = Rectangle().frame(height: thickness)
        line
            .foregroundStyle(hover ? ink : rest)
            .overlay {
                if loading {
                    GeometryReader { geo in
                        let run = geo.size.width * percent(recipe.text("loading.run"))
                        if reduceMotion {
                            line.foregroundStyle(ink).opacity(running ? .one : .zero)
                        } else {
                            line.foregroundStyle(LinearGradient(colors: [ink.opacity(.zero), ink, ink.opacity(.zero)], startPoint: .leading, endPoint: .trailing))
                                .frame(width: run)
                                .offset(x: running ? geo.size.width : -run)
                        }
                    }
                    .clipped()
                    .onAppear { running = true }
                    .onDisappear { running = false }
                    .animation(reduceMotion
                        ? .easeInOut(duration: recipe.durationSeconds("loading.breathe")).repeatForever(autoreverses: true)
                        : .linear(duration: recipe.durationSeconds("loading.sweep")).repeatForever(autoreverses: false), value: running)
                }
            }
            .offset(y: recipe.points("underline.offset") + thickness - rise)
            .metalAnimation(.settle, value: hover)
    }
}

/// "0.24em" → 0.24; a recipe size in ems of the text.
private func em(_ raw: String?) -> Double { Double((raw ?? "").replacingOccurrences(of: "em", with: "")) ?? .zero }
/// "7%" → 0.07.
private func percent(_ raw: String?) -> Double { (Double((raw ?? "").replacingOccurrences(of: "%", with: "")) ?? .zero) / 100 }
