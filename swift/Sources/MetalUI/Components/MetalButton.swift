import SwiftUI

// A pill cap from the generated button recipe; it sinks while held and springs back.

/// Which cap a button wears. `standard` is soft-touch in the colorway,
/// `primary` wears the contrasting finish, `destructive` the one red cap.
public enum MetalButtonCap: Sendable {
    case standard
    case primary
    case destructive
}

/// Press-in pill cap for any `Button`.
public struct MetalButtonStyle: ButtonStyle {
    public var cap: MetalButtonCap
    public var size: MetalButtonSize

    public init(cap: MetalButtonCap = .standard, size: MetalButtonSize = .default) {
        self.cap = cap
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        MetalButtonBody(configuration: configuration, cap: cap, size: size)
    }
}

/// Which size a button is: the regular or compact recipe.
public enum MetalButtonSize: Sendable {
    case `default`
    case compact
}

/// Where a button's action is: `waiting` holds the key down and refuses presses, and after the spinner's
/// show delay its glyph turns into an arc in the key's ink; `done` stays held for the host's result.
/// Set it with `.metalButtonState(_:)`.
public enum MetalButtonState: Sendable { case ready, waiting, done }

private struct MetalButtonStateKey: EnvironmentKey {
    static let defaultValue = MetalButtonState.ready
}

extension EnvironmentValues {
    var metalButtonState: MetalButtonState {
        get { self[MetalButtonStateKey.self] }
        set { self[MetalButtonStateKey.self] = newValue }
    }
}

public extension View {
    /// Holds a MetalButton while its action works (`.waiting`) or shows its result (`.done`).
    func metalButtonState(_ state: MetalButtonState) -> some View { environment(\.metalButtonState, state) }
}

/// The glyph's slot while a button waits: the glyph gives way to a turning arc after the show delay.
private struct MetalButtonWaitSlot<Glyph: View>: View {
    let glyph: Glyph
    let size: Double
    @Environment(\.metalButtonState) private var state
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var showsArc = false
    @State private var turning = false

    var body: some View {
        let spinner = MetalRecipes.spinner
        ZStack {
            glyph.opacity(showsArc ? .zero : .one)
            Circle()
                .trim(from: .zero, to: 0.68)
                .stroke(style: StrokeStyle(lineWidth: size * 1.9 / 24, lineCap: .round))
                .padding(size * 3.5 / 24)
                .rotationEffect(.degrees(turning && !reduceMotion ? 360 : .zero))
                .opacity(showsArc ? (reduceMotion && turning ? 0.45 : .one) : .zero)
                .animation(showsArc ? (reduceMotion
                    ? .easeInOut(duration: 1).repeatForever(autoreverses: true)
                    : .linear(duration: spinner.durationSeconds("self.turn")).repeatForever(autoreverses: false)) : nil, value: turning)
        }
        .frame(width: size, height: size)
        .animation(.easeOut(duration: spinner.durationSeconds("self.fade")), value: showsArc)
        .task(id: state) {
            guard state == .waiting else { showsArc = false; turning = false; return }
            try? await Task.sleep(for: .seconds(spinner.durationSeconds("self.delay")))
            guard !Task.isCancelled else { return }
            showsArc = true
            turning = true
        }
    }
}

private struct MetalButtonBody: View {
    let configuration: ButtonStyleConfiguration
    let cap: MetalButtonCap
    let size: MetalButtonSize
    @Environment(\.metalButtonState) private var state

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false

    var body: some View {
        // Waiting or done, the key stays down at its travel in the pressed look.
        let isDown = isEnabled && (configuration.isPressed || state != .ready)
        let shape = Capsule(style: .continuous)
        let recipe = MetalRecipes.button
        let compact = size == .compact
        let part = compact && cap == .standard ? "compact" : cap == .standard ? "self" : cap == .primary ? "primary" : "destructive"

        configuration.label
            // The button is its icons' trigger: a MetalIcon inside plays its hover pose and press.
            .metalIconInteraction(MetalIconInteraction(isHovered: hovering && isEnabled, isPressed: isDown))
            .font(compact ? recipe.font("compact.font") : .metal(MetalType.ui))
            .tracking(compact ? recipe.tracking("compact.tracking", size: recipe.fontSize("compact.font")) : MetalType.ui.trackingPoints)
            .lineLimit(1)
            // A button is as wide as its label: it never truncates it.
            .fixedSize(horizontal: true, vertical: false)
            .foregroundStyle(foreground(colorway.tokens))
            .padding(.horizontal, recipe.points(compact ? "compact.pad" : "self.pad"))
            .frame(height: recipe.points(compact ? "compact.height" : "self.height"))
            .contentShape(shape)
            .onHover { hovering = $0 }
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(recipe, part: part, in: shape).opacity(isDown ? Double.zero : .one)
                    Color.clear.metalObjectRecipe(recipe, part: part, state: "pressed", in: shape).opacity(isDown ? Double.one : .zero)
                }
                // A color change, not motion: it stays under Reduce Motion, like the CSS .18s.
                .animation(.easeInOut(duration: Measurement(value: MetalButtonMetrics.fadeMs, unit: UnitDuration.milliseconds).converted(to: .seconds).value), value: isDown)
            }
            .overlay {
                if isFocused && isEnabled {
                    shape
                        .inset(by: -(recipe.points("self.focus-offset") + recipe.points("self.focus-width") / 2))
                        .stroke(MetalShared.focus.color, lineWidth: recipe.points("self.focus-width"))
                }
            }
            .offset(y: isDown ? recipe.points("self.travel") : 0)
            // The press rides release, which Reduce Motion keeps unchanged (MetalMotion).
            .metalAnimation(.release, value: isDown)
            .opacity(isEnabled ? Double.one : recipe.scalar("self.disabled"))
    }

    private func foreground(_ tokens: MetalColorwayTokens) -> Color {
        switch cap {
        case .standard: return (size == .compact && !hovering ? tokens.ink2 : tokens.ink).color
        case .primary: return (MetalRecipes.button.color("primary.ink", colorway: MetalRecipeColorway(colorway)) ?? MetalCaps.primary.ink).color
        case .destructive: return (MetalRecipes.button.color("destructive.ink") ?? MetalCaps.destructive.ink).color
        }
    }
}

/// A pill text button with a press-in cap.
///
///     MetalButton("New Canvas", cap: .primary) { create() }
///     MetalButton("seed a sample day", size: .compact) { seed() }
public struct MetalButton<Icon: View>: View {
    private let title: String
    private let cap: MetalButtonCap
    private let size: MetalButtonSize
    private let icon: Icon?
    private let action: () -> Void
    @Environment(\.metalButtonState) private var state

    public init(_ title: String, cap: MetalButtonCap = .standard, size: MetalButtonSize = .default, action: @escaping () -> Void) where Icon == EmptyView {
        self.title = title
        self.cap = cap
        self.size = size
        self.icon = nil
        self.action = action
    }

    /// A button with a leading icon (16 pt; 14 compact), such as a MetalUI glyph or an SF Symbol.
    public init(_ title: String, cap: MetalButtonCap = .standard, size: MetalButtonSize = .default, action: @escaping () -> Void, @ViewBuilder icon: () -> Icon) {
        self.title = title
        self.cap = cap
        self.size = size
        self.icon = icon()
        self.action = action
    }

    public var body: some View {
        let compact = size == .compact
        let recipe = MetalRecipes.button
        let glyph = recipe.points(compact ? "compact.glyph" : "self.glyph")
        // A held key refuses presses but keeps its focus (aria-disabled, not disabled).
        Button(action: { if state == .ready { action() } }) {
            HStack(spacing: recipe.points(compact ? "compact.gap" : "self.gap")) {
                if let icon { MetalButtonWaitSlot(glyph: icon, size: glyph) }
                Text(title)
            }
        }
        .buttonStyle(MetalButtonStyle(cap: cap, size: size))
        .focusEffectDisabled()
        .accessibilityLabel(title)
        .accessibilityValue(state == .waiting ? "In progress" : "")
    }
}

extension MetalButton where Icon == MetalIcon {
    /// An action that names itself with a glyph and a verb: the MetalUI glyph leads the label,
    /// sized by the cap (16 pt; 14 compact), and plays its act when the button is hovered or pressed.
    ///
    ///     MetalButton("Share", icon: .share) { share() }
    public init(_ title: String, icon: MetalIconName, cap: MetalButtonCap = .standard, size: MetalButtonSize = .default, action: @escaping () -> Void) {
        let glyph = MetalRecipes.button.points(size == .compact ? "compact.glyph" : "self.glyph")
        self.init(title, cap: cap, size: size, action: action) { MetalIcon(icon, size: glyph) }
    }
}
