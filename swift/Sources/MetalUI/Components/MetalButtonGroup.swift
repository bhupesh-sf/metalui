import SwiftUI

// Related actions as one machined bar (button-group.agent.md): one raised cap in the keys' material,
// the keys cut apart by engraved seams, a pressed key sinking alone; a readout is a sunk window; a
// pair can rock; latched keys stay sunk with their lamp. MetalSplitButton is the main action and a
// chevron behind a seam, the chevron held down while its menu is open. The bar is the button recipe;
// the button-group recipe adds the seams, the hover light, the window and the rocker.

/// One part of a bar: a key, a readout window, or a latching key.
public struct MetalBarPart: Identifiable {
    enum Kind {
        case key(icon: MetalIconName?, showsTitle: Bool, action: () -> Void)
        case readout
        case latch(isOn: Binding<Bool>)
    }

    public let id: String
    let title: String
    let kind: Kind
    let disabled: Bool

    /// A key that runs an action. `showsTitle: false` shows only the glyph; the title still names it.
    public static func key(_ title: String, icon: MetalIconName? = nil, showsTitle: Bool = true, disabled: Bool = false, action: @escaping () -> Void) -> MetalBarPart {
        MetalBarPart(id: "key-" + title, title: title, kind: .key(icon: icon, showsTitle: showsTitle, action: action), disabled: disabled)
    }

    /// A value between steppers ("100 %"): a sunk window in the bar, tabular, never a key.
    public static func readout(_ value: String) -> MetalBarPart {
        MetalBarPart(id: "readout", title: value, kind: .readout, disabled: false)
    }

    /// A key that latches: it stays sunk with its lamp lit while on.
    public static func latch(_ title: String, isOn: Binding<Bool>, disabled: Bool = false) -> MetalBarPart {
        MetalBarPart(id: "latch-" + title, title: title, kind: .latch(isOn: isOn), disabled: disabled)
    }
}

/// Which end of a bar a part sits at, for its pill corners.
private struct MetalBarEnds: Equatable {
    var leading: Bool
    var trailing: Bool

    func shape(_ radius: CGFloat) -> UnevenRoundedRectangle {
        UnevenRoundedRectangle(topLeadingRadius: leading ? radius : .zero, bottomLeadingRadius: leading ? radius : .zero,
                               bottomTrailingRadius: trailing ? radius : .zero, topTrailingRadius: trailing ? radius : .zero, style: .continuous)
    }
}

/// The button recipe's parts for a bar of `cap` keys at `size`.
private struct MetalBarMaterial {
    let cap: MetalButtonCap
    let size: MetalButtonSize

    var part: String { cap == .standard ? (size == .compact ? "compact" : "self") : cap == .primary ? "primary" : "destructive" }
    var accent: String? { cap == .standard ? nil : "primary" }
    var height: Double { MetalRecipes.button.points(size == .compact ? "compact.height" : "self.height") }
    var pad: Double { MetalRecipes.button.points(size == .compact ? "compact.pad" : "self.pad") }
    var gap: Double { MetalRecipes.button.points(size == .compact ? "compact.gap" : "self.gap") }
    var glyph: Double { MetalRecipes.button.points(size == .compact ? "compact.glyph" : "self.glyph") }
    var font: Font { size == .compact ? MetalRecipes.button.font("compact.font") : .metal(MetalType.ui) }

    func ink(_ colorway: MetalColorway) -> Color {
        switch cap {
        case .standard: return colorway.tokens.ink.color
        case .primary: return (MetalRecipes.button.color("primary.ink", colorway: MetalRecipeColorway(colorway)) ?? MetalCaps.primary.ink).color
        case .destructive: return (MetalRecipes.button.color("destructive.ink") ?? MetalCaps.destructive.ink).color
        }
    }
}

/// A segment of the bar: bare at rest, its light lifted on hover, the button's pressed look when down.
private struct MetalBarKeyStyle: ButtonStyle {
    let material: MetalBarMaterial
    let ends: MetalBarEnds
    /// Held down by its owner (a latch on, a menu open).
    let held: Bool
    /// In a rocker the whole cap tips, so the key doesn't travel on its own.
    let travels: Bool
    /// A fixed width (the chevron key); nil sizes the key by its label and the cap's padding.
    var width: CGFloat? = nil
    let onPress: (Bool) -> Void

    func makeBody(configuration: Configuration) -> some View {
        MetalBarKeyBody(configuration: configuration, style: self)
    }
}

private struct MetalBarKeyBody: View {
    let configuration: ButtonStyleConfiguration
    let style: MetalBarKeyStyle
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.isFocused) private var isFocused
    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false

    var body: some View {
        let button = MetalRecipes.button
        let group = MetalRecipes.buttonGroup
        let down = isEnabled && (configuration.isPressed || style.held)
        let shape = style.ends.shape(style.material.height / 2)
        configuration.label
            .metalIconInteraction(MetalIconInteraction(isHovered: hovering && isEnabled, isPressed: down))
            .font(style.material.font)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .foregroundStyle(style.material.ink(colorway))
            .padding(.horizontal, style.width == nil ? style.material.pad : .zero)
            .frame(width: style.width, alignment: .center)
            .frame(maxHeight: .infinity)
            .contentShape(shape)
            .onHover { hovering = $0 }
            .background {
                ZStack {
                    Color.clear.metalObjectRecipe(group, part: "hover", state: style.material.accent, in: shape)
                        .opacity(hovering && isEnabled && !down ? Double.one : .zero)
                    Color.clear.metalObjectRecipe(button, part: style.material.part, state: "pressed", in: shape)
                        .opacity(down ? Double.one : .zero)
                }
                .animation(.easeInOut(duration: button.durationSeconds("self.fade")), value: down)
                .animation(.easeInOut(duration: button.durationSeconds("self.fade")), value: hovering)
            }
            .overlay {
                if isFocused && isEnabled {
                    shape.inset(by: -group.points("focus.offset") - button.points("self.focus-width") / 2)
                        .stroke(MetalShared.focus.color, lineWidth: button.points("self.focus-width"))
                }
            }
            .offset(y: down && style.travels ? button.points("self.travel") : .zero)
            .metalAnimation(.release, value: down)
            .opacity(isEnabled ? Double.one : button.scalar("self.disabled"))
            .onChange(of: configuration.isPressed) { _, pressed in style.onPress(pressed && isEnabled) }
    }
}

/// The engraved seam between two parts: a dark line and its light edge, drawn by the bar so it stays put.
private struct MetalBarSeam: View {
    let material: MetalBarMaterial
    var body: some View {
        let group = MetalRecipes.buttonGroup
        Color.clear.metalObjectRecipe(group, part: "seam", state: material.accent, in: Rectangle())
            .frame(width: group.points("seam.width"))
    }
}

/// The bar itself: one raised cap with the outer pill radius only, its parts laid side by side with seams.
private struct MetalBar<Content: View>: View {
    let material: MetalBarMaterial
    let tip: Double
    @ViewBuilder let content: Content

    var body: some View {
        let shape = Capsule(style: .continuous)
        HStack(spacing: .zero) { content }
            .frame(height: material.height)
            .background { Color.clear.metalObjectRecipe(MetalRecipes.button, part: material.part, in: shape) }
            .clipShape(shape)
            .rotationEffect(.degrees(tip))
            .metalAnimation(.part, value: tip)
    }
}

/// Related actions as one machined bar.
///
///     MetalButtonGroup("History", parts: [
///         .key("Undo", icon: .undo) { undo() },
///         .key("Redo", icon: .redo) { redo() },
///     ])
///     MetalButtonGroup("Zoom", parts: [
///         .key("Zoom out", icon: .zoomOut, showsTitle: false) { out() },
///         .readout("\(zoom) %"),
///         .key("Zoom in", icon: .zoomIn, showsTitle: false) { zoomIn() },
///     ])
public struct MetalButtonGroup: View {
    private let label: String
    private let material: MetalBarMaterial
    private let rocker: Bool
    private let parts: [MetalBarPart]
    @Environment(\.metalColorway) private var colorway
    @State private var pressedEnd: Int?

    /// `rocker`: a pair as one cap that tips toward the pressed end on the part spring (two keys only).
    public init(_ label: String, cap: MetalButtonCap = .standard, size: MetalButtonSize = .default, rocker: Bool = false, parts: [MetalBarPart]) {
        self.label = label
        self.material = MetalBarMaterial(cap: cap, size: size)
        self.rocker = rocker
        self.parts = parts
    }

    public var body: some View {
        let tipDegrees = Double(MetalRecipes.buttonGroup.text("rocker.tip")?.replacingOccurrences(of: "deg", with: "") ?? "") ?? .zero
        let tip = !rocker ? .zero : pressedEnd == .zero ? -tipDegrees : pressedEnd == parts.count - 1 ? tipDegrees : .zero
        MetalBar(material: material, tip: tip) {
            ForEach(Array(parts.enumerated()), id: \.element.id) { index, part in
                if index > .zero { MetalBarSeam(material: material) }
                segment(part, ends: MetalBarEnds(leading: index == .zero, trailing: index == parts.count - 1), index: index)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    @ViewBuilder
    private func segment(_ part: MetalBarPart, ends: MetalBarEnds, index: Int) -> some View {
        let onPress: (Bool) -> Void = { down in
            if down { pressedEnd = index } else if pressedEnd == index { pressedEnd = nil }
        }
        switch part.kind {
        case let .key(icon, showsTitle, action):
            Button(action: action) {
                HStack(spacing: material.gap) {
                    if let icon { MetalIcon(icon, size: material.glyph) }
                    if showsTitle || icon == nil { Text(part.title) }
                }
            }
            .buttonStyle(MetalBarKeyStyle(material: material, ends: ends, held: false, travels: !rocker, onPress: onPress))
            .disabled(part.disabled)
            .focusEffectDisabled()
            .accessibilityLabel(part.title)
        case .readout:
            MetalBarReadout(value: part.title, material: material)
        case let .latch(isOn):
            Button { isOn.wrappedValue.toggle() } label: {
                HStack(spacing: material.gap) {
                    MetalLED(isOn.wrappedValue ? .live : .off, size: .small)
                    Text(part.title)
                }
            }
            .buttonStyle(MetalBarKeyStyle(material: material, ends: ends, held: isOn.wrappedValue, travels: true, onPress: onPress))
            .disabled(part.disabled)
            .focusEffectDisabled()
            .accessibilityLabel(part.title)
            .accessibilityAddTraits(isOn.wrappedValue ? .isSelected : [])
        }
    }
}

/// The sunk window: the field well cut into the bar, tabular figures turning when they change.
private struct MetalBarReadout: View {
    let value: String
    let material: MetalBarMaterial
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        let group = MetalRecipes.buttonGroup
        let inset = group.points("window.inset")
        MetalWell(.field, radius: group.points("window.radius")) {
            Text(value)
                .font(material.font)
                .monospacedDigit()
                .contentTransition(reduceMotion ? .opacity : .numericText())
                .metalAnimation(.settle, value: value)
                .padding(.horizontal, group.points("window.pad"))
                .frame(minWidth: group.points("window.min"), maxHeight: .infinity)
        }
        .padding(.vertical, inset)
        .padding(.horizontal, inset)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.updatesFrequently)
    }
}

/// The main action, a seam, and a chevron that opens the other ways to do it, in one material. While
/// the menu is open the chevron key stays down and the chevron turns over.
///
///     MetalSplitButton("Export PDF", icon: .download, cap: .primary, menuLabel: "More export options",
///                      heading: "EXPORT AS", items: [MetalMenuItem("PNG") { export(.png) }]) { export(.pdf) }
public struct MetalSplitButton: View {
    private let title: String
    private let icon: MetalIconName?
    private let material: MetalBarMaterial
    private let menuLabel: String
    private let heading: String?
    private let items: [MetalMenuItem]
    private let action: () -> Void
    @State private var open = false

    public init(_ title: String, icon: MetalIconName? = nil, cap: MetalButtonCap = .primary, size: MetalButtonSize = .default,
                menuLabel: String, heading: String? = nil, items: [MetalMenuItem], action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.material = MetalBarMaterial(cap: cap, size: size)
        self.menuLabel = menuLabel
        self.heading = heading
        self.items = items
        self.action = action
    }

    public var body: some View {
        MetalBar(material: material, tip: .zero) {
            Button(action: action) {
                HStack(spacing: material.gap) {
                    if let icon { MetalIcon(icon, size: material.glyph) }
                    Text(title)
                }
            }
            .buttonStyle(MetalBarKeyStyle(material: material, ends: MetalBarEnds(leading: true, trailing: false), held: false, travels: true) { _ in })
            .focusEffectDisabled()
            .accessibilityLabel(title)
            MetalBarSeam(material: material)
            Button { open.toggle() } label: {
                MetalIcon(.chevron, size: material.glyph)
                    .rotationEffect(.degrees(open ? 180 : .zero))
                    .metalAnimation(.part, value: open)
            }
            .buttonStyle(MetalBarKeyStyle(material: material, ends: MetalBarEnds(leading: false, trailing: true), held: open, travels: true, width: CGFloat(MetalRecipes.buttonGroup.points("chevron.width"))) { _ in })
            .focusEffectDisabled()
            .accessibilityLabel(menuLabel)
        }
        // The menu hangs outside the bar's clip.
        .metalMenu(isPresented: $open, heading: heading, items: items)
    }
}
