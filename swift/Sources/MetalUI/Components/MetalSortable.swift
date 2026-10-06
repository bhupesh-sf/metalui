import SwiftUI

// MetalSortable: the drag that puts things in order, hosted by a stack of the host's own views
// (sortable.agent.md). Lifted, an item grows to the recipe's lift scale on the surface spring with the
// raised plate behind it and follows the hand; the others reorder live and glide on settle; the slot it
// will land in is the well's track; dropped, it lands on the object spring. A rejected onCommit glides
// back to the previous order. Keys (macOS, or iPad with a keyboard): Space or Return lifts and drops,
// arrows move, Escape cancels. VoiceOver: Move up / Move down actions. Not List.onMove: List imposes its
// own rows and can't take the recipe.

public enum MetalSortableOrientation: Equatable, Sendable {
    case vertical
    case horizontal
    case grid(columns: Int)
}

/// The grip of six engraved dimples. Place the one the content closure gets when `handle` is on.
public struct MetalSortableGrip: View {
    let label: String
    let pinned: Bool
    let active: Bool
    let onChanged: (DragGesture.Value) -> Void
    let onEnded: () -> Void
    let onKey: (KeyPress) -> KeyPress.Result

    @Environment(\.metalColorway) private var colorway
    @State private var hovering = false

    public var body: some View {
        let recipe = MetalRecipes.sortable
        let dot = recipe.points("grip.dot")
        let pitch = recipe.points("grip.pitch")
        let lip = recipe.color("grip.lip", colorway: MetalRecipeColorway(colorway))?.color ?? .clear
        VStack(spacing: pitch - dot) {
            ForEach(0..<3, id: \.self) { _ in
                HStack(spacing: pitch - dot) {
                    ForEach(0..<2, id: \.self) { _ in
                        Circle().fill(colorway.tokens.ink3.color).frame(width: dot, height: dot)
                            .background { Circle().fill(lip).offset(y: 0.5) }
                    }
                }
            }
        }
        .opacity(hovering || active ? .one : recipe.scalar("grip.rest"))
        .metalAnimation(.settle, value: hovering)
        .frame(width: recipe.points("grip.width"), height: recipe.points("grip.height"))
        .contentShape(RoundedRectangle(cornerRadius: recipe.points("grip.radius"), style: .continuous))
        .opacity(pinned ? MetalRecipes.button.scalar("self.disabled") : .one)
        .onHover { hovering = $0 }
        .focusable(!pinned)
        .onKeyPress(phases: .down, action: onKey)
        .gesture(DragGesture(minimumDistance: recipe.points("self.threshold"), coordinateSpace: .named(MetalSortableSpace.name))
            .onChanged(onChanged)
            .onEnded { _ in onEnded() })
        .accessibilityLabel("Move \(label)")
        .accessibilityAddTraits(.isButton)
    }
}

enum MetalSortableSpace { static let name = "metal-sortable" }

private struct MetalSortableFrames<ID: Hashable>: PreferenceKey {
    static var defaultValue: [ID: CGRect] { [:] }
    static func reduce(value: inout [ID: CGRect], nextValue: () -> [ID: CGRect]) {
        value.merge(nextValue()) { $1 }
    }
}

public struct MetalSortable<Item: Identifiable & Equatable, Content: View>: View {
    @Binding private var items: [Item]
    private let orientation: MetalSortableOrientation
    private let handle: Bool
    private let disabled: Bool
    private let pinned: (Item) -> Bool
    private let label: (Item) -> String
    private let onCommit: (([Item], [Item]) async throws -> Void)?
    private let content: (Item, MetalSortableGrip) -> Content

    @State private var held: Item.ID?
    @State private var byKeys = false
    @State private var start: [Item] = []
    @State private var grab: CGPoint = .zero
    @State private var pointer: CGPoint = .zero
    @State private var offset: CGSize = .zero
    @State private var skip: Item.ID?
    @State private var frames: [Item.ID: CGRect] = [:]
    @State private var busy = false
    @State private var refusals: [Item.ID: Int] = [:]
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalColorway) private var colorway

    public init(_ items: Binding<[Item]>, orientation: MetalSortableOrientation = .vertical, handle: Bool = false,
                disabled: Bool = false, pinned: @escaping (Item) -> Bool = { _ in false },
                label: @escaping (Item) -> String = { "\($0.id)" },
                onCommit: (([Item], [Item]) async throws -> Void)? = nil,
                @ViewBuilder content: @escaping (Item, MetalSortableGrip) -> Content) {
        self._items = items
        self.orientation = orientation
        self.handle = handle
        self.disabled = disabled
        self.pinned = pinned
        self.label = label
        self.onCommit = onCommit
        self.content = content
    }

    public var body: some View {
        let gap = MetalRecipes.sortable.points("self.gap")
        Group {
            switch orientation {
            case .vertical: VStack(spacing: gap) { ForEach(items) { cell($0) } }
            case .horizontal: HStack(spacing: gap) { ForEach(items) { cell($0) } }
            case .grid(let columns):
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: gap), count: max(columns, 1)), spacing: gap) {
                    ForEach(items) { cell($0) }
                }
            }
        }
        .background(alignment: .topLeading) { recess }
        .coordinateSpace(name: MetalSortableSpace.name)
        .onPreferenceChange(MetalSortableFrames<Item.ID>.self) { now in
            frames = now
            if held != nil, !byKeys { follow() }
        }
        .accessibilityElement(children: .contain)
    }

    // The slot the held item will land in: the well's track, gliding on settle.
    @ViewBuilder private var recess: some View {
        if let held, let f = frames[held] {
            let shape = RoundedRectangle(cornerRadius: MetalRecipes.row.points("list.radius"), style: .continuous)
            Color.clear
                .metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: shape)
                .frame(width: f.width, height: f.height)
                .offset(x: f.minX, y: f.minY)
                .metalAnimation(.settle, value: f)
                .transition(.opacity)
                .accessibilityHidden(true)
        }
    }

    private func cell(_ item: Item) -> some View {
        let lifted = held == item.id
        let recipe = MetalRecipes.sortable
        let shape = RoundedRectangle(cornerRadius: MetalRecipes.row.points("list.radius"), style: .continuous)
        let grip = MetalSortableGrip(label: label(item), pinned: pinned(item) || disabled, active: lifted,
                                     onChanged: { dragged(item, $0) }, onEnded: { drop() }, onKey: { key(item, $0) })
        return content(item, grip)
            .background {
                GeometryReader { proxy in
                    Color.clear.preference(key: MetalSortableFrames<Item.ID>.self, value: [item.id: proxy.frame(in: .named(MetalSortableSpace.name))])
                }
            }
            .background {
                Color.clear
                    .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: shape)
                    .opacity(lifted ? .one : .zero)
                    .metalAnimation(lifted ? .surface : .release, value: lifted)
            }
            .scaleEffect(lifted && !reduceMotion ? recipe.scalar("lift.scale") : .one)
            .metalAnimation(lifted ? .surface : .object, value: lifted)
            .offset(lifted ? offset : .zero)
            .zIndex(lifted ? .one : .zero)
            .keyframeAnimator(initialValue: Double.zero, trigger: refusals[item.id, default: .zero]) { view, nudge in
                view.offset(x: nudge)
            } keyframes: { _ in
                KeyframeTrack {
                    LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                    SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                                   spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
                }
            }
            .contentShape(shape)
            .gesture(DragGesture(minimumDistance: recipe.points("self.threshold"), coordinateSpace: .named(MetalSortableSpace.name))
                .onChanged { dragged(item, $0) }
                .onEnded { _ in drop() }, including: handle ? .subviews : .all)
            .focusable(!handle && !disabled)
            .onKeyPress(phases: .down) { handle ? .ignored : key(item, $0) }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label(item))
            .accessibilityValue(position(of: item.id, in: items))
            .accessibilityAction(named: back) { if !pinned(item) { _ = step(item, by: -1); commit(from: items) } }
            .accessibilityAction(named: ahead) { if !pinned(item) { _ = step(item, by: 1); commit(from: items) } }
    }

    private var back: String { orientation == .horizontal ? "Move left" : "Move up" }
    private var ahead: String { orientation == .horizontal ? "Move right" : "Move down" }

    private func position(of id: Item.ID, in list: [Item]) -> String {
        "Position \((list.firstIndex { $0.id == id } ?? .zero) + 1) of \(list.count)"
    }

    private func say(_ text: String) {
        #if os(macOS)
        NSAccessibility.post(element: NSApp.mainWindow as Any, notification: .announcementRequested,
                             userInfo: [.announcement: text, .priority: NSAccessibilityPriorityLevel.high.rawValue])
        #else
        UIAccessibility.post(notification: .announcement, argument: text)
        #endif
    }

    // MARK: lifting, moving, landing

    private func lift(_ item: Item, keys: Bool) -> Bool {
        guard held == nil, !busy, !disabled else { return false }
        if pinned(item) {
            refusals[item.id, default: .zero] += 1
            say("\(label(item)) can’t be moved.")
            return false
        }
        start = items
        byKeys = keys
        offset = .zero
        skip = nil
        withMetalAnimation(.surface, reduceMotion: reduceMotion) { held = item.id }
        say("Lifted \(label(item)). \(position(of: item.id, in: items)).")
        return true
    }

    private func dragged(_ item: Item, _ value: DragGesture.Value) {
        if held == nil {
            guard lift(item, keys: false), let slot = frames[item.id] else { return }
            grab = CGPoint(x: value.startLocation.x - slot.minX, y: value.startLocation.y - slot.minY)
        }
        guard held == item.id, !byKeys else { return }
        pointer = value.location
        follow()
        if let s = skip, frames[s]?.contains(pointer) != true { skip = nil }
        guard let target = items.first(where: { $0.id != item.id && $0.id != skip && !pinned($0) && frames[$0.id]?.contains(pointer) == true }) else { return }
        skip = target.id
        move(item.id, to: target.id)
    }

    /// Keeps the held item under the hand, from its current slot.
    private func follow() {
        guard let held, let slot = frames[held] else { return }
        offset = CGSize(width: pointer.x - grab.x - slot.minX, height: pointer.y - grab.y - slot.minY)
    }

    /// Moves `id` to `target`'s place among the items that aren't pinned; pinned ones keep their index.
    private func move(_ id: Item.ID, to target: Item.ID) {
        var free = items.filter { !pinned($0) }
        guard let from = free.firstIndex(where: { $0.id == id }), let to = free.firstIndex(where: { $0.id == target }), from != to else { return }
        let moving = free.remove(at: from)
        free.insert(moving, at: to)
        var next = free.makeIterator()
        let order = items.map { pinned($0) ? $0 : next.next() ?? $0 }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { items = order }
    }

    /// One place back or ahead among the free items; true when it moved.
    private func step(_ item: Item, by delta: Int) -> Bool {
        let free = items.filter { !pinned($0) }
        guard let i = free.firstIndex(where: { $0.id == item.id }) else { return false }
        let j = min(max(i + delta, .zero), free.count - 1)
        guard j != i else { return false }
        move(item.id, to: free[j].id)
        say("\(label(item)), \(position(of: item.id, in: items)).")
        return true
    }

    private func drop() {
        guard let id = held else { return }
        let name = items.first { $0.id == id }.map(label) ?? ""
        withMetalAnimation(.object, reduceMotion: reduceMotion) {
            offset = .zero
            held = nil
        }
        say("Dropped \(name). \(position(of: id, in: items)).")
        commit(from: start)
    }

    private func cancel() {
        guard let id = held else { return }
        let name = items.first { $0.id == id }.map(label) ?? ""
        withMetalAnimation(.settle, reduceMotion: reduceMotion) {
            items = start
            offset = .zero
            held = nil
        }
        say("Put \(name) back. \(position(of: id, in: start)).")
    }

    /// Saves a changed order; a failure glides back to `previous`.
    private func commit(from previous: [Item]) {
        let next = items
        guard next != previous, let onCommit else { return }
        busy = true
        Task { @MainActor in
            do { try await onCommit(next, previous) } catch {
                withMetalAnimation(.settle, reduceMotion: reduceMotion) { items = previous }
                say("Couldn’t save the order. It’s back the way it was.")
            }
            busy = false
        }
    }

    private func key(_ item: Item, _ press: KeyPress) -> KeyPress.Result {
        let lifting = press.key == .space || press.key == .return
        guard held == item.id, byKeys else {
            guard held == nil, lifting else { return .ignored }
            _ = lift(item, keys: true)
            return .handled
        }
        switch press.key {
        case .space, .return: drop()
        case .escape: cancel()
        case .upArrow, .leftArrow: _ = step(item, by: -1)
        case .downArrow, .rightArrow: _ = step(item, by: 1)
        default: return .ignored
        }
        return .handled
    }
}

extension MetalSortable {
    /// A sortable whose items name themselves with a key path (announcements, the grip, VoiceOver).
    public init(_ items: Binding<[Item]>, orientation: MetalSortableOrientation = .vertical, handle: Bool = false,
                disabled: Bool = false, pinned: @escaping (Item) -> Bool = { _ in false },
                label: KeyPath<Item, String>,
                onCommit: (([Item], [Item]) async throws -> Void)? = nil,
                @ViewBuilder content: @escaping (Item, MetalSortableGrip) -> Content) {
        self.init(items, orientation: orientation, handle: handle, disabled: disabled, pinned: pinned,
                  label: { $0[keyPath: label] }, onCommit: onCommit, content: content)
    }
}
