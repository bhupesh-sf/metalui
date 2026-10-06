import SwiftUI
#if os(macOS)
import AppKit
#endif

/// Shared open cell for one compact control bar.
public enum MetalFanCell: Hashable, Sendable { case picker, tray }

private struct MetalFanReduceMotionKey: EnvironmentKey { static let defaultValue: Bool? = nil }
private extension EnvironmentValues {
    var metalFanReduceMotionOverride: Bool? {
        get { self[MetalFanReduceMotionKey.self] }
        set { self[MetalFanReduceMotionKey.self] = newValue }
    }
}

@MainActor
private final class MetalFanState: ObservableObject {
    @Published var open: MetalFanCell?
    /// The open grid's reach past the cap, in cap steps (left, right, up, down), for a press outside.
    var pickerReach = (left: 0, right: 0, up: 0, down: 0)
    init(open: MetalFanCell? = nil) { self.open = open }
    func toggle(_ cell: MetalFanCell) { open = open == cell ? nil : cell }
}

/// Compact bar: label, choice fan, and an expanding options cap.
public struct MetalFan<Content: View>: View {
    private let label: String
    private let content: Content
    private let reduceMotionOverride: Bool?
    private let openBinding: Binding<MetalFanCell?>?
    @StateObject private var state: MetalFanState
    #if os(macOS)
    @State private var eventMonitor: Any?
    #else
    @State private var outsideTap: MetalFanOutsideTap?
    #endif

    /// `open`: the host's view of which cell is open, so it can fold the Fan from its own key
    /// handling (Escape) or know it is open. Omit it and the Fan keeps the state itself.
    public init(_ label: String, initialOpen: MetalFanCell? = nil, open: Binding<MetalFanCell?>? = nil,
                reduceMotion: Bool? = nil, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
        self.reduceMotionOverride = reduceMotion
        self.openBinding = open
        _state = StateObject(wrappedValue: MetalFanState(open: open?.wrappedValue ?? initialOpen))
    }

    public var body: some View {
        HStack(alignment: .bottom, spacing: MetalRecipes.toolbar.points("self.gap")) { content }
            // A graphite toolbar to what it holds: separators, picks and the plain ink read on the dark caps.
            .environment(\.metalToolbarVariant, true)
            .environmentObject(state)
            .environment(\.metalFanReduceMotionOverride, reduceMotionOverride)
            .accessibilityElement(children: .contain)
            .accessibilityLabel(label)
            .metalExitCommand { state.open = nil }
            .onChange(of: state.open) { _, now in
                if let openBinding, openBinding.wrappedValue != now { openBinding.wrappedValue = now }
            }
            // The host's value wins when it changes (without a binding this follows the Fan's own).
            .onChange(of: openBinding.map { $0.wrappedValue } ?? state.open) { _, now in
                if state.open != now { state.open = now }
            }
            #if os(macOS)
            .background {
                // ImageRenderer represents NSView bridges as a yellow placeholder.
                if ProcessInfo.processInfo.environment["METALUI_CAPTURES"] == nil {
                    MetalFanWindowProbe { view in
                        guard eventMonitor == nil else { return }
                        eventMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDown, .rightMouseDown, .keyDown]) { event in
                            guard state.open != nil, let window = view.window, event.window === window else { return event }
                            // Escape folds from anywhere in the window: keyboard focus usually sits
                            // in the host (a canvas), where `onExitCommand` never hears it.
                            if event.type == .keyDown {
                                guard event.keyCode == 53 else { return event }
                                state.open = nil
                                return nil
                            }
                            var bounds = view.convert(view.bounds, to: nil)
                            if state.open == .picker {
                                // AppKit's window space runs up: the grid above the cap is +y.
                                let step = MetalRecipes.iconButton.points("tool.size") + MetalRecipes.toolbar.points("self.gap")
                                let r = state.pickerReach
                                bounds = CGRect(x: bounds.minX - Double(r.left) * step, y: bounds.minY - Double(r.down) * step,
                                                width: bounds.width + Double(r.left + r.right) * step,
                                                height: bounds.height + Double(r.up + r.down) * step)
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
            #else
            .background {
                if ProcessInfo.processInfo.environment["METALUI_CAPTURES"] == nil {
                    MetalFanWindowProbe { view in
                        guard outsideTap == nil, let window = view.window else { return }
                        // A tap anywhere in the window outside the Fan folds it; the tap still reaches what it hit.
                        let tap = MetalFanOutsideTap { recognizer in
                            guard state.open != nil else { return }
                            var bounds = view.convert(view.bounds, to: nil)
                            if state.open == .picker {
                                // UIKit's window space runs down: the grid above the cap is -y.
                                let step = MetalRecipes.iconButton.points("tool.size") + MetalRecipes.toolbar.points("self.gap")
                                let r = state.pickerReach
                                bounds = CGRect(x: bounds.minX - Double(r.left) * step, y: bounds.minY - Double(r.up) * step,
                                                width: bounds.width + Double(r.left + r.right) * step,
                                                height: bounds.height + Double(r.up + r.down) * step)
                            }
                            if !bounds.contains(recognizer.location(in: nil)) { state.open = nil }
                        }
                        window.addGestureRecognizer(tap.recognizer)
                        outsideTap = tap
                    }
                }
            }
            .onDisappear {
                if let outsideTap { outsideTap.recognizer.view?.removeGestureRecognizer(outsideTap.recognizer); self.outsideTap = nil }
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
#else
private struct MetalFanWindowProbe: UIViewRepresentable {
    let ready: (UIView) -> Void
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        view.isUserInteractionEnabled = false
        return view
    }
    func updateUIView(_ view: UIView, context: Context) { DispatchQueue.main.async { ready(view) } }
}

/// A window-wide tap that never claims the touch, so the control under it still gets it.
@MainActor
private final class MetalFanOutsideTap: NSObject, UIGestureRecognizerDelegate {
    let recognizer = UITapGestureRecognizer()
    private let tapped: (UITapGestureRecognizer) -> Void

    init(_ tapped: @escaping (UITapGestureRecognizer) -> Void) {
        self.tapped = tapped
        super.init()
        recognizer.addTarget(self, action: #selector(fire))
        recognizer.cancelsTouchesInView = false
        recognizer.delaysTouchesEnded = false
        recognizer.delegate = self
    }

    @objc private func fire() { tapped(recognizer) }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool { true }
}
#endif

/// What the bar is about: a word, or (with `icon`) a glyph cap the title names (tooltip and
/// accessibility label), on the same graphite cap material as the tool cells.
public struct MetalFanLabel: View {
    let title: String
    let icon: MetalIconName?
    public init(_ title: String, icon: MetalIconName? = nil) { self.title = title; self.icon = icon }
    public var body: some View {
        let r = MetalRecipes.iconButton
        if let icon {
            MetalIcon(icon, size: r.points("tool.glyph"))
                .foregroundStyle((r.color("tool.ink") ?? MetalTokens.graphite.ink).color)
                .frame(width: r.points("tool.size"), height: r.points("tool.size"))
                .metalObjectRecipe(r, part: "tool", in: RoundedRectangle(cornerRadius: r.points("tool.radius"), style: .continuous))
                .metalTooltip(title)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(title)
                .accessibilityAddTraits(.isImage)
        } else {
            word(r)
        }
    }

    private func word(_ r: MetalObjectRecipe) -> some View {
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
    /// Related choices share a group and a row of the grid.
    public let group: String?
    public var id: Value { value }
    public init(_ value: Value, _ label: String, icon: MetalIconName, shortcut: String? = nil, group: String? = nil) {
        self.value = value; self.label = label; self.icon = icon; self.shortcut = shortcut; self.group = group
    }
}

public enum MetalFanDirection: Sendable { case up, both }

/// The fan's own motion constants, the same as the React fan's.
enum MetalFanMotion {
    /// A key's scale while tucked behind the cap; it grows to full size on its way out.
    static let tucked = 0.6
    /// The chevron is drawn pointing down; a quarter turn clockwise points it left, the way the tray folds.
    static let foldTurn = 90.0
}

/// One key's place in the grid: its row and column, and its offset from the cap in cap steps.
struct MetalFanGridCell: Equatable { let row: Int, column: Int, x: Int, y: Int }

/// The grid: one row per group, in order (ungrouped, rows of ⌈√n⌉); the cap's column is the grid's
/// middle (left of middle for an even width); rows sit above the cap (up) or split around it (both).
struct MetalFanGrid {
    let rows: [[Int]]
    let cells: [MetalFanGridCell]
    let above: Int

    init(groups: [String?], direction: MetalFanDirection) {
        var rows: [[Int]] = []
        if groups.contains(where: { $0 != nil }) {
            for k in groups.indices {
                if k > 0, groups[k] == groups[k - 1] { rows[rows.count - 1].append(k) } else { rows.append([k]) }
            }
        } else if !groups.isEmpty {
            let n = max(1, Int(Double(groups.count).squareRoot().rounded(.up)))
            rows = stride(from: 0, to: groups.count, by: n).map { Array($0..<min($0 + n, groups.count)) }
        }
        let columns = rows.map(\.count).max() ?? 1
        let above = direction == .up ? rows.count : (rows.count + 1) / 2
        var cells = Array(repeating: MetalFanGridCell(row: 0, column: 0, x: 0, y: 0), count: groups.count)
        for (r, row) in rows.enumerated() {
            for (c, k) in row.enumerated() {
                cells[k] = MetalFanGridCell(row: r, column: c, x: c - (columns - 1) / 2, y: r < above ? r - above : r - above + 1)
            }
        }
        self.rows = rows; self.cells = cells; self.above = above
    }

    /// Staggered by distance from the cap: one beat per ring of equal distance, nearest first.
    var rings: [Int] {
        let distance = cells.map(Self.distance)
        let levels = Array(Set(distance)).sorted()
        return distance.map { levels.firstIndex(of: $0) ?? 0 }
    }
    private static func distance(_ c: MetalFanGridCell) -> Int { Int((Double(c.x * c.x + c.y * c.y).squareRoot() * 100).rounded()) }
}

/// The current choice stays in the bar; pressing it unfolds every choice into a grid from behind it.
public struct MetalFanPicker<Value: Hashable>: View {
    private let label: String
    @Binding private var value: Value
    private let options: [MetalFanOption<Value>]
    private let direction: MetalFanDirection
    @EnvironmentObject private var state: MetalFanState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalFanReduceMotionOverride) private var reduceMotionOverride
    @FocusState private var focusedOption: Int?
    @FocusState private var capFocused: Bool

    public init(_ label: String, value: Binding<Value>, options: [MetalFanOption<Value>], direction: MetalFanDirection = .up) {
        self.label = label; _value = value; self.options = options; self.direction = direction
    }

    private var currentIndex: Int { options.firstIndex { $0.value == value } ?? 0 }
    private var open: Bool { state.open == .picker }
    private var still: Bool { reduceMotionOverride ?? reduceMotion }

    public var body: some View {
        let step = MetalRecipes.iconButton.points("tool.size") + MetalRecipes.toolbar.points("self.gap")
        let grid = MetalFanGrid(groups: options.map(\.group), direction: direction)
        let rings = grid.rings
        let farthest = rings.max() ?? 0
        ZStack(alignment: .bottom) {
            ForEach(Array(options.enumerated()), id: \.element.id) { index, option in
                let cell = grid.cells[index]
                MetalIconButton(option.shortcut.map { "\(option.label) · \($0)" } ?? option.label,
                                icon: option.icon, variant: .tool, pressed: index == currentIndex) {
                    value = option.value
                    state.open = nil
                    capFocused = true
                }
                .focused($focusedOption, equals: index)
                .metalMoveCommand { move in moveFocus(from: cell, move, grid: grid) }
                // Before the offset: the reported frame moves with the drawn option.
                .metalHitRegion(open)
                // Each key grows out of the cap and travels to its cell on SwiftUI's own snappy
                // motion (the chrome role). Opening staggers by ring; folding goes back together.
                .scaleEffect(open || still ? .one : MetalFanMotion.tucked)
                .offset(x: open ? Double(cell.x) * step : .zero, y: open ? Double(cell.y) * step : .zero)
                .opacity(open ? .one : .zero)
                .animation(still ? MetalSpringClass.crossfade.spring.animation
                                 : MetalSprings.chrome.animation.delay(open ? Double(rings[index]) * MetalMotionTokens.fanStagger : .zero),
                           value: open)
                .allowsHitTesting(open)
                .accessibilityHidden(!open)
                .zIndex(open ? Double(farthest - rings[index]) : 0)
            }
            if options.indices.contains(currentIndex) {
                let current = options[currentIndex]
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
            if new == .picker { focusedOption = options.isEmpty ? nil : currentIndex }
            else if old == .picker && new == nil { capFocused = true }
        }
        .onAppear {
            let xs = grid.cells.map(\.x), ys = grid.cells.map(\.y)
            state.pickerReach = (left: max(0, -(xs.min() ?? 0)), right: max(0, xs.max() ?? 0),
                                 up: max(0, -(ys.min() ?? 0)), down: max(0, ys.max() ?? 0))
        }
    }

    /// Arrows move in two dimensions, as the grid is drawn; down past the row nearest the cap returns to it.
    private func moveFocus(from cell: MetalFanGridCell, _ move: MetalMoveDirection, grid: MetalFanGrid) {
        var r = cell.row, c = cell.column
        switch move {
        case .left: c -= 1
        case .right: c += 1
        case .up: r -= 1
        case .down: r += 1
        }
        if move == .down, r == grid.above, direction == .up { capFocused = true; return }
        let row = grid.rows[min(max(r, 0), grid.rows.count - 1)]
        focusedOption = row[min(max(c, 0), row.count - 1)]
    }
}

/// Options cap expands sideways; its content can be picks or action buttons.
public struct MetalFanTray<Icon: View, Content: View>: View {
    private let label: String
    private let icon: Icon
    private let content: Content
    @EnvironmentObject private var state: MetalFanState
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalFanReduceMotionOverride) private var reduceMotionOverride
    @FocusState private var capFocused: Bool
    @FocusState private var foldFocused: Bool
    private var still: Bool { reduceMotionOverride ?? reduceMotion }

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
                // The set's chevron, turned to point the way the tray folds.
                MetalIconButton("Fold \(label)", variant: .tool) { state.open = nil; capFocused = true } icon: {
                    MetalIcon(.chevron, size: r.points("tool.glyph")).rotationEffect(.degrees(MetalFanMotion.foldTurn))
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
        .metalHitRegion()
        .animation(MetalMotion.resolve(.chrome, reduceMotion: still).animation, value: open)
        .onChange(of: state.open) { old, new in
            if new == .tray { foldFocused = true }
            else if old == .tray && new == nil { capFocused = true }
        }
    }
}
