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

/// A hold to confirm in progress: whether it is held, and how full the fill is (0–1).
struct MetalButtonHold: Equatable {
    var holding: Bool
    var progress: Double
}

private struct MetalButtonHoldKey: EnvironmentKey {
    static let defaultValue: MetalButtonHold? = nil
}

extension EnvironmentValues {
    var metalButtonHold: MetalButtonHold? {
        get { self[MetalButtonHoldKey.self] }
        set { self[MetalButtonHoldKey.self] = newValue }
    }
}

/// Hands the fill's animated progress to the cap and its glyph on every frame.
private struct MetalButtonHoldProgress: ViewModifier, Animatable {
    var progress: Double
    let holding: Bool
    let shutAt: Date?

    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }

    func body(content: Content) -> some View {
        content
            .environment(\.metalButtonHold, MetalButtonHold(holding: holding, progress: progress))
            .environment(\.metalIconHold, MetalIconHold(progress: progress, shutAt: shutAt))
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
        let wait = MetalRecipes.button
        let breathe = MetalRecipes.progress
        let unit = size / 24 // the glyph grid
        let across = unit * (wait.points("wait.radius") + wait.points("wait.radius"))
        ZStack {
            glyph.opacity(showsArc ? .zero : .one)
            Circle()
                .trim(from: .zero, to: wait.scalar("wait.arc"))
                .stroke(style: StrokeStyle(lineWidth: unit * wait.points("wait.stroke"), lineCap: .round))
                .frame(width: across, height: across)
                .rotationEffect(.degrees(turning && !reduceMotion ? 360 : .zero))
                .opacity(showsArc ? (reduceMotion && turning ? breathe.scalar("segment.dim") : .one) : .zero)
                .animation(showsArc ? (reduceMotion
                    ? .easeInOut(duration: breathe.durationSeconds("segment.breathe")).repeatForever(autoreverses: true)
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
    @Environment(\.metalButtonHold) private var hold

    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false

    var body: some View {
        // Waiting or done, the key stays down at its travel in the pressed look.
        let isDown = isEnabled && (configuration.isPressed || state != .ready || hold?.holding == true)
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
                    if let hold {
                        // Hold to confirm: the darker fill, a whole cap sliding in from the leading edge.
                        GeometryReader { box in
                            Color.clear.metalObjectRecipe(recipe, part: "hold", in: shape)
                                .offset(x: -(Double.one - hold.progress) * box.size.width)
                        }
                        .clipShape(shape)
                    }
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
    @Environment(\.metalHoldToConfirm) private var holdToConfirm
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @GestureState private var pressing = false
    @State private var keyDown = false
    @State private var holding = false
    @State private var progress = Double.zero
    @State private var completed = false
    @State private var shutAt: Date?
    @State private var settle = Double.one

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
        let button = Button(action: { if holds { tapped() } else if state == .ready { action() } }) {
            HStack(spacing: recipe.points(compact ? "compact.gap" : "self.gap")) {
                if let icon { MetalButtonWaitSlot(glyph: icon, size: glyph) }
                // A changed title turns on the drum when the change is animated (Copy → Copied); in place under Reduce Motion.
                Text(title).contentTransition(reduceMotion ? .opacity : .numericText())
            }
        }
        .buttonStyle(MetalButtonStyle(cap: cap, size: size))
        .focusEffectDisabled()
        .accessibilityLabel(title)
        .accessibilityValue(state == .waiting ? "In progress" : "")
        if let holdToConfirm, holds {
            holdBody(button, hint: holdToConfirm.hint)
        } else {
            button
        }
    }

    private var holds: Bool { holdToConfirm != nil && cap == .destructive }

    // ── Hold to confirm (the web's Button `hold`, same fill and timing) ──
    //   press (pointer, Space, Return)  the key goes down; the fill runs over the hold time, linear
    //   let go early                    it drains on the release spring; nothing runs; the hint
    //   the hold time                   the cap settles once (object spring), the lid drops shut, the action runs
    // A tap only shows the hint; VoiceOver's activate runs the action (it can't hold; the question guards it).
    // Reduce Motion: the fill still runs; no settle, and the glyph stays still.
    fileprivate func begin() {
        guard isEnabled, state == .ready, !holding else { return }
        completed = false
        shutAt = nil
        holding = true
        withAnimation(.linear(duration: MetalRecipes.button.durationSeconds("hold.time"))) { progress = .one }
    }

    fileprivate func letGo() {
        guard holding else { return }
        holding = false
        if !completed { holdToConfirm?.onHint?() }
        withMetalAnimation(.release, reduceMotion: reduceMotion) { progress = .zero }
    }

    fileprivate func complete() {
        guard holding, !completed else { return }
        completed = true
        if !reduceMotion {
            shutAt = Date()
            settle = MetalRecipes.button.scalar("hold.settle")
            withMetalAnimation(.object, reduceMotion: reduceMotion) { settle = .one }
        }
        action()
    }

    fileprivate func tapped() {
        // The click a finished hold makes on release is the hold's own; any other tap is a hint.
        if completed { completed = false } else if !holding { holdToConfirm?.onHint?() }
    }
}

/// Hold to confirm for a destructive `MetalButton`: its action runs only after the button is held for the
/// hold time (a token). Use it for an act that can't be undone; a delete that goes to the past stays a plain press.
public struct MetalHoldToConfirm {
    /// Said after the name (the accessibility hint) and shown by the host when a hold is let go early.
    public var hint: String
    /// Let go before the hold completed: show `hint` under the actions.
    public var onHint: (@MainActor () -> Void)?

    public init(hint: String = "Hold to confirm", onHint: (@MainActor () -> Void)? = nil) {
        self.hint = hint
        self.onHint = onHint
    }
}

private struct MetalHoldToConfirmKey: EnvironmentKey {
    static var defaultValue: MetalHoldToConfirm? { nil }
}

extension EnvironmentValues {
    var metalHoldToConfirm: MetalHoldToConfirm? {
        get { self[MetalHoldToConfirmKey.self] }
        set { self[MetalHoldToConfirmKey.self] = newValue }
    }
}

public extension View {
    /// Makes a destructive MetalButton hold to confirm.
    ///
    ///     MetalButton("Delete regions", icon: .trash, cap: .destructive) { delete() }
    ///         .metalHoldToConfirm(hint: "Hold to delete") { showHint = true }
    func metalHoldToConfirm(hint: String = "Hold to confirm", onHint: (@MainActor () -> Void)? = nil) -> some View {
        environment(\.metalHoldToConfirm, MetalHoldToConfirm(hint: hint, onHint: onHint))
    }
}

extension MetalButton {
    /// The hold's input and look: a press of any length, Space or Return held, the timer, the fill's
    /// progress handed down each frame, and the settle.
    fileprivate func holdBody(_ content: some View, hint: String) -> some View {
        content
            .modifier(MetalButtonHoldProgress(progress: progress, holding: holding, shutAt: shutAt))
            .scaleEffect(settle)
            .simultaneousGesture(
                DragGesture(minimumDistance: .zero)
                    .updating($pressing) { _, isPressing, _ in isPressing = true }
            )
            .onChange(of: pressing) { _, isPressing in if isPressing { begin() } else { letGo() } }
            .onKeyPress(keys: [.space, .return], phases: [.down, .up]) { press in
                if press.phase == .down { if !keyDown { keyDown = true; begin() } } else { keyDown = false; letGo() }
                return .handled
            }
            .task(id: holding) {
                guard holding else { return }
                try? await Task.sleep(for: .seconds(MetalRecipes.button.durationSeconds("hold.time")))
                if !Task.isCancelled { complete() }
            }
            .task(id: shutAt) {
                // The lid's drop plays out, then the glyph is at rest again.
                guard shutAt != nil, let longest = MetalIconAct.held.values.map({ $0.duration - $0.scrub }).max() else { return }
                try? await Task.sleep(for: .seconds(longest))
                if !Task.isCancelled { shutAt = nil }
            }
            .accessibilityHint(hint)
            .accessibilityAction { if state == .ready { action() } }
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
