import SwiftUI
#if os(macOS)
import AppKit
#endif

/// Shared open cell for one compact control bar.
public enum MetalFanCell: Hashable, Sendable { case picker, tray }

@MainActor
private final class MetalFanState: ObservableObject {
    @Published var open: MetalFanCell?
    var pickerCount = 0
    var pickerDirection: MetalFanDirection = .up
    init(open: MetalFanCell? = nil) { self.open = open }
    func toggle(_ cell: MetalFanCell) { open = open == cell ? nil : cell }
}

/// Compact bar: label, choice fan, and an expanding options cap.
public struct MetalFan<Content: View>: View {
    private let label: String
    private let content: Content
    @StateObject private var state: MetalFanState
    #if os(macOS)
    @State private var eventMonitor: Any?
    #endif

    public init(_ label: String, initialOpen: MetalFanCell? = nil, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
        _state = StateObject(wrappedValue: MetalFanState(open: initialOpen))
    }

    public var body: some View {
        HStack(alignment: .bottom, spacing: MetalRecipes.toolbar.points("self.gap")) { content }
            .environmentObject(state)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
            .onExitCommand { state.open = nil }
            #if os(macOS)
            .background {
                // ImageRenderer represents NSView bridges as a yellow placeholder.
                if ProcessInfo.processInfo.environment["METALUI_CAPTURES"] == nil {
                    MetalFanWindowProbe { view in
                        guard eventMonitor == nil else { return }
                        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown]) { event in
                            guard state.open != nil, let window = view.window, event.window === window else { return event }
                            var bounds = view.convert(view.bounds, to: nil)
                            if state.open == .picker {
                                let reach = Double(state.pickerCount) * (MetalRecipes.iconButton.points("tool.size") + MetalRecipes.toolbar.points("self.gap"))
                                bounds = bounds.insetBy(dx: 0, dy: -reach)
                            }
                            if !bounds.contains(event.locationInWindow) { state.open = nil }
                            return event
                        }
                    }
                }
            }
            .onDisappear {
                if let eventMonitor { NSEvent.removeMonitor(eventMonitor); self.eventMonitor = nil }
            }
            #endif
    }
}

#if os(macOS)
private struct MetalFanWindowProbe: NSViewRepresentable {
    let ready: (NSView) -> Void
    func makeNSView(context: Context) -> NSView { NSView() }
    func updateNSView(_ view: NSView, context: Context) { DispatchQueue.main.async { ready(view) } }
}
#endif

/// Current context, using the same graphite cap material as the tool cells.
public struct MetalFanLabel: View {
    let title: String
    public init(_ title: String) { self.title = title }
    public var body: some View {
        let r = MetalRecipes.iconButton
        Text(title)
            .font(MetalRecipes.toolbar.font("search.font"))
            .foregroundStyle((r.color("tool.ink") ?? MetalTokens.graphite.ink).color)
            .padding(.horizontal, MetalRecipes.toolbar.points("self.pad"))
            .frame(height: r.points("tool.size"))
            .metalObjectRecipe(r, part: "tool", in: RoundedRectangle(cornerRadius: r.points("tool.radius"), style: .continuous))
            .fixedSize()
    }
}

public struct MetalFanOption<Value: Hashable>: Identifiable {
    public let value: Value
    public let label: String
    public let icon: MetalIconName
    public let shortcut: String?
    public var id: Value { value }
    public init(_ value: Value, _ label: String, icon: MetalIconName, shortcut: String? = nil) {
        self.value = value; self.label = label; self.icon = icon; self.shortcut = shortcut
    }
}

public enum MetalFanDirection: Sendable { case up, both }

/// Current choice stays in the bar; its siblings fan from behind it.
public struct MetalFanPicker<Value: Hashable>: View {
    private let label: String
    @Binding private var value: Value
    private let options: [MetalFanOption<Value>]
    private let direction: MetalFanDirection
    @EnvironmentObject private var state: MetalFanState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focusedOption: Int?
    @FocusState private var capFocused: Bool

    public init(_ label: String, value: Binding<Value>, options: [MetalFanOption<Value>], direction: MetalFanDirection = .up) {
        self.label = label; _value = value; self.options = options; self.direction = direction
    }

    private var others: [MetalFanOption<Value>] { options.filter { $0.value != value } }
    private var current: MetalFanOption<Value>? { options.first { $0.value == value } ?? options.first }
    private var open: Bool { state.open == .picker }
    private func slot(_ index: Int) -> Int {
        if direction == .up { return -(index + 1) }
        return (index.isMultiple(of: 2) ? -1 : 1) * (index / 2 + 1)
    }

    public var body: some View {
        let step = MetalRecipes.iconButton.points("tool.size") + MetalRecipes.toolbar.points("self.gap")
        ZStack(alignment: .bottom) {
            ForEach(Array(others.enumerated()), id: \.element.id) { index, option in
                MetalIconButton(option.shortcut.map { "\(option.label) · \($0)" } ?? option.label,
                                icon: option.icon, variant: .tool) {
                    value = option.value
                    state.open = nil
                    capFocused = true
                }
                .focused($focusedOption, equals: index)
                .onMoveCommand { move in
                    let next = index + (move == .up ? 1 : move == .down ? -1 : 0)
                    if next < 0 { capFocused = true }
                    else if next < others.count { focusedOption = next }
                }
                .offset(y: open && !reduceMotion ? Double(slot(index)) * step : 0)
                .opacity(open ? .one : .zero)
                .allowsHitTesting(open)
                .accessibilityHidden(!open)
                .zIndex(open ? Double(others.count - index) : 0)
                .animation(MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation?.delay(open && !reduceMotion ? Double(index) * MetalMotionTokens.fanStagger : .zero), value: open)
            }
            if let current {
                MetalIconButton("\(label): \(current.label)", icon: current.icon, variant: .tool) {
                    state.toggle(.picker)
                }
                .focused($capFocused)
                .accessibilityValue(open ? "Expanded" : "Collapsed")
                .zIndex(100)
            }
        }
        .frame(width: MetalRecipes.iconButton.points("tool.size"), height: MetalRecipes.iconButton.points("tool.size"))
        .onChange(of: state.open) { old, new in
            if new == .picker { focusedOption = others.isEmpty ? nil : 0 }
            else if old == .picker && new == nil { capFocused = true }
        }
        .onAppear {
            state.pickerCount = others.count
            state.pickerDirection = direction
        }
    }
}

/// Options cap expands sideways; its content can be picks or action buttons.
public struct MetalFanTray<Icon: View, Content: View>: View {
    private let label: String
    private let icon: Icon
    private let content: Content
    @EnvironmentObject private var state: MetalFanState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var capFocused: Bool
    @FocusState private var foldFocused: Bool

    public init(_ label: String, @ViewBuilder icon: () -> Icon, @ViewBuilder content: () -> Content) {
        self.label = label; self.icon = icon(); self.content = content()
    }

    public var body: some View {
        let r = MetalRecipes.iconButton
        let open = state.open == .tray
        HStack(spacing: MetalRecipes.toolbar.points("self.gap")) {
            if open {
                content
                    .environment(\.metalToolbarVariant, true)
                    .accessibilityLabel(label)
                MetalIconButton("Fold \(label)", variant: .tool) { state.open = nil; capFocused = true } icon: {
                    Text("‹").font(MetalRecipes.toolbar.font("search.font"))
                }
                .focused($foldFocused)
            } else {
                MetalIconButton(label, variant: .tool) { state.toggle(.tray) } icon: { icon }
                    .focused($capFocused)
                    .accessibilityValue("Collapsed")
            }
        }
        .padding(.horizontal, open ? MetalRecipes.toolbar.points("self.pad") : .zero)
        .frame(height: r.points("tool.size"))
        .metalObjectRecipe(r, part: "tool", in: RoundedRectangle(cornerRadius: r.points("tool.radius"), style: .continuous))
        .fixedSize()
        .animation(MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation, value: open)
        .onChange(of: state.open) { old, new in
            if new == .tray { foldFocused = true }
            else if old == .tray && new == nil { capFocused = true }
        }
    }
}
