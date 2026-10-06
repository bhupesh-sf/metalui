import SwiftUI

// MetalKanban: a board of the person's cards in columns (kanban.agent.md). Each column is a sunk tray
// (the well's field) with its header: Sortable's grip when the columns reorder, the name, the count on
// the drum, the limit in words and, over it, the amber LED with "Over by 1"; the fold key when
// collapsible. A card dragged by hand rises as a copy on a layer above the board (the raised plate,
// lift.scale) and follows the hand; its slot is the well's track, live in the column nearest the hand;
// the others glide on settle; it lands on the object spring. Keys (macOS): Space or Return lifts and
// drops, arrows move (left and right between columns), Escape cancels. VoiceOver: Move up, Move down
// and Move to <column>. A rejected onCommit glides back to the previous board. The drag is one gesture
// on the board, not on each card: a card that changes column is a new view, and its own gesture would end.

/// A column of the board: its name, its limit and its cards.
public struct MetalKanbanColumn<Card: Identifiable & Equatable>: Identifiable, Equatable {
    public let id: String
    public var title: String
    /// Work-in-progress limit: over it the header says so. Soft: cards still land.
    public var limit: Int?
    /// Nothing lifts from it and nothing lands in it.
    public var disabled: Bool
    public var cards: [Card]

    public init(id: String, title: String, limit: Int? = nil, disabled: Bool = false, cards: [Card]) {
        self.id = id
        self.title = title
        self.limit = limit
        self.disabled = disabled
        self.cards = cards
    }
}

private enum MetalKanbanSpace { static let name = "metal-kanban" }

private struct MetalKanbanCardFrames<ID: Hashable>: PreferenceKey {
    static var defaultValue: [ID: CGRect] { [:] }
    static func reduce(value: inout [ID: CGRect], nextValue: () -> [ID: CGRect]) { value.merge(nextValue()) { $1 } }
}

private struct MetalKanbanLaneFrames: PreferenceKey {
    static var defaultValue: [String: CGRect] { [:] }
    static func reduce(value: inout [String: CGRect], nextValue: () -> [String: CGRect]) { value.merge(nextValue()) { $1 } }
}

public struct MetalKanban<Card: Identifiable & Equatable, Content: View>: View {
    public typealias Column = MetalKanbanColumn<Card>

    @Binding private var columns: [Column]
    private let reorderColumns: Bool
    private let collapsible: Bool
    private let disabled: Bool
    private let empty: String
    private let pinned: (Card) -> Bool
    private let label: (Card) -> String
    private let onCommit: (([Column], [Column]) async throws -> Void)?
    private let content: (Card) -> Content

    @State private var held: Card.ID?
    @State private var byKeys = false
    @State private var start: [Column] = []
    @State private var grab: CGPoint = .zero
    @State private var pointer: CGPoint = .zero
    @State private var skip: Card.ID?
    @State private var frames: [Card.ID: CGRect] = [:]
    @State private var lanes: [String: CGRect] = [:]
    @State private var busy = false
    @State private var refusals: [Card.ID: Int] = [:]
    @State private var folded: Set<String> = []
    @State private var heldLane: String?
    @State private var laneShift: CGFloat = .zero
    @FocusState private var focus: Card.ID?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalColorway) private var colorway

    public init(_ columns: Binding<[Column]>, reorderColumns: Bool = false, collapsible: Bool = false, disabled: Bool = false,
                empty: String = "No cards", pinned: @escaping (Card) -> Bool = { _ in false },
                label: @escaping (Card) -> String = { "\($0.id)" },
                onCommit: (([Column], [Column]) async throws -> Void)? = nil,
                @ViewBuilder content: @escaping (Card) -> Content) {
        self._columns = columns
        self.reorderColumns = reorderColumns
        self.collapsible = collapsible
        self.disabled = disabled
        self.empty = empty
        self.pinned = pinned
        self.label = label
        self.onCommit = onCommit
        self.content = content
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.kanban }
    private var cardShape: RoundedRectangle { RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card"), style: .continuous) }

    public var body: some View {
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: recipe.points("self.gap")) {
                ForEach(columns) { lane($0) }
            }
            .padding(recipe.points("self.pad"))
            .coordinateSpace(name: MetalSortableSpace.name)
            .gesture(DragGesture(minimumDistance: MetalRecipes.sortable.points("self.threshold"), coordinateSpace: .named(MetalKanbanSpace.name))
                .onChanged(dragged)
                .onEnded { _ in drop() })
        }
        .coordinateSpace(name: MetalKanbanSpace.name)
        .overlay(alignment: .topLeading) { copy }
        .onPreferenceChange(MetalKanbanCardFrames<Card.ID>.self) { frames = $0 }
        .onPreferenceChange(MetalKanbanLaneFrames.self) { lanes = $0 }
        .accessibilityElement(children: .contain)
    }

    // MARK: columns

    private func lane(_ column: Column) -> some View {
        let pad = recipe.points("column.pad")
        let tray = RoundedRectangle(cornerRadius: MetalRecipes.surface.points("radius.card") + pad, style: .continuous)
        let open = !folded.contains(column.id)
        let lifted = heldLane == column.id
        return VStack(alignment: .leading, spacing: .zero) {
            header(column, open: open)
            if open {
                MetalCollapsiblePanel(isOpen: open) { cards(of: column) }
            }
        }
        .frame(width: recipe.points("column.width"))
        .metalObjectRecipe(MetalRecipes.well, part: "self", state: "field", in: tray)
        .background {
            Color.clear
                .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: tray)
                .opacity(lifted ? .one : .zero)
                .metalAnimation(lifted ? .surface : .release, value: lifted)
        }
        .scaleEffect(lifted && !reduceMotion ? MetalRecipes.sortable.scalar("lift.scale") : .one)
        .offset(x: lifted ? laneShift : .zero)
        .zIndex(lifted ? .one : .zero)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(column.title)
    }

    private func header(_ column: Column, open: Bool) -> some View {
        let t = colorway.tokens
        let n = column.cards.count
        let words = "\(n) \(n == 1 ? "card" : "cards")"
        return HStack(spacing: recipe.points("header.gap")) {
            if reorderColumns {
                MetalSortableGrip(label: column.title, pinned: disabled, active: heldLane == column.id,
                                  onChanged: { moveLane(column.id, $0) }, onEnded: dropLane, onKey: { keyLane(column.id, $0) })
            }
            Text(column.title.uppercased())
                .font(.metal(MetalType.label))
                .tracking(MetalType.label.trackingPoints)
                .foregroundColor(t.ink2.color)
                .lineLimit(1)
                .accessibilityAddTraits(.isHeader)
            Spacer(minLength: .zero)
            MetalBadge(count: n, label: column.limit.map { "\(words), max \($0)" } ?? words, size: .compact)
            if let limit = column.limit {
                if n > limit {
                    MetalBadge("Over by \(n - limit)", led: .waiting, size: .compact)
                } else {
                    Text("max \(limit)")
                        .font(.metal(MetalType.meta))
                        .monospacedDigit()
                        .foregroundColor(t.ink3.color)
                        .accessibilityHidden(true)
                }
            }
            if collapsible {
                MetalCollapsibleKey(open ? "Hide \(column.title)" : "Show \(column.title)", isOpen: Binding(
                    get: { !folded.contains(column.id) },
                    set: { isOpen in if isOpen { folded.remove(column.id) } else { folded.insert(column.id) } }))
            }
        }
        .frame(minHeight: recipe.points("header.height"))
        .padding([.top, .trailing], recipe.points("column.pad"))
        .padding(.leading, recipe.points(reorderColumns ? "column.pad" : "header.inset"))
    }

    private func cards(of column: Column) -> some View {
        let pad = recipe.points("column.pad")
        return ScrollView(.vertical) {
            VStack(spacing: recipe.points("column.gap")) {
                ForEach(column.cards) { cell($0, in: column) }
            }
            .padding(pad)
            .frame(maxWidth: .infinity, minHeight: recipe.points("column.empty"), alignment: .top)
            .overlay {
                if column.cards.isEmpty {
                    Text(empty)
                        .font(.metal(MetalType.meta))
                        .foregroundColor(colorway.tokens.ink3.color)
                        .accessibilityHidden(true)
                }
            }
        }
        .background {
            GeometryReader { proxy in
                Color.clear.preference(key: MetalKanbanLaneFrames.self, value: [column.id: proxy.frame(in: .named(MetalKanbanSpace.name))])
            }
        }
    }

    private func cell(_ card: Card, in column: Column) -> some View {
        let lifted = held == card.id
        let recess = lifted && !byKeys
        let raised = lifted && byKeys
        let frozen = pinned(card) || column.disabled || disabled
        return content(card)
            .opacity(recess ? .zero : .one)
            .background {
                if recess {
                    Color.clear.metalObjectRecipe(MetalRecipes.well, part: "self", state: "track", in: cardShape)
                }
            }
            .background {
                Color.clear
                    .metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: cardShape)
                    .opacity(raised ? .one : .zero)
                    .metalAnimation(raised ? .surface : .release, value: raised)
            }
            .scaleEffect(raised && !reduceMotion ? MetalRecipes.sortable.scalar("lift.scale") : .one)
            .metalAnimation(raised ? .surface : .object, value: raised)
            .zIndex(raised ? .one : .zero)
            .background {
                GeometryReader { proxy in
                    Color.clear.preference(key: MetalKanbanCardFrames<Card.ID>.self, value: [card.id: proxy.frame(in: .named(MetalKanbanSpace.name))])
                }
            }
            .keyframeAnimator(initialValue: Double.zero, trigger: refusals[card.id, default: .zero]) { view, nudge in
                view.offset(x: nudge)
            } keyframes: { _ in
                KeyframeTrack {
                    LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                    SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                                   spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
                }
            }
            .contentShape(cardShape)
            .focusable(!disabled)
            .focused($focus, equals: card.id)
            .onKeyPress(phases: .down) { key(card, frozen: frozen, $0) }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label(card))
            .accessibilityValue(position(of: card.id, in: columns))
            .accessibilityAction(named: "Move up") { if !frozen { _ = step(card.id, by: -1); commit(from: columns) } }
            .accessibilityAction(named: "Move down") { if !frozen { _ = step(card.id, by: 1); commit(from: columns) } }
            .accessibilityActions {
                ForEach(columns.filter { $0.id != column.id && !$0.disabled }) { other in
                    Button("Move to \(other.title)") {
                        guard !frozen else { return }
                        let previous = columns
                        move(card.id, to: other.id, at: other.cards.count)
                        commit(from: previous)
                    }
                }
            }
    }

    /// The copy that follows the hand, above the board.
    @ViewBuilder private var copy: some View {
        if let held, !byKeys, let f = frames[held], let card = columns.lazy.flatMap(\.cards).first(where: { $0.id == held }) {
            content(card)
                .frame(width: f.width, height: f.height)
                .background { Color.clear.metalObjectRecipe(MetalRecipes.surface, part: "self", state: "raise", in: cardShape) }
                .scaleEffect(reduceMotion ? .one : MetalRecipes.sortable.scalar("lift.scale"))
                .offset(x: pointer.x - grab.x, y: pointer.y - grab.y)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
                .transition(.opacity)
        }
    }

    // MARK: where things are

    private func place(of id: Card.ID, in board: [Column]) -> (column: Int, index: Int)? {
        for (c, column) in board.enumerated() {
            if let i = column.cards.firstIndex(where: { $0.id == id }) { return (c, i) }
        }
        return nil
    }

    private func position(of id: Card.ID, in board: [Column]) -> String {
        guard let p = place(of: id, in: board) else { return "" }
        return "\(board[p.column].title), position \(p.index + 1) of \(board[p.column].cards.count)"
    }

    private func say(_ text: String) {
        #if os(macOS)
        NSAccessibility.post(element: NSApp.mainWindow as Any, notification: .announcementRequested,
                             userInfo: [.announcement: text, .priority: NSAccessibilityPriorityLevel.high.rawValue])
        #else
        UIAccessibility.post(notification: .announcement, argument: text)
        #endif
    }

    /// Columns that take cards now: not disabled, not folded.
    private func takes(_ column: Column) -> Bool { !column.disabled && !folded.contains(column.id) }

    private func move(_ id: Card.ID, to columnID: String, at index: Int) {
        guard let from = place(of: id, in: columns), let to = columns.firstIndex(where: { $0.id == columnID }) else { return }
        var next = columns
        let card = next[from.column].cards.remove(at: from.index)
        next[to].cards.insert(card, at: min(max(index, .zero), next[to].cards.count))
        guard next != columns else { return }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { columns = next }
    }

    /// Up or down in its column; true when it moved.
    private func step(_ id: Card.ID, by delta: Int) -> Bool {
        guard let p = place(of: id, in: columns) else { return false }
        let j = min(max(p.index + delta, .zero), columns[p.column].cards.count - 1)
        guard j != p.index else { return false }
        move(id, to: columns[p.column].id, at: j)
        return true
    }

    /// To the next column that takes cards, left or right, at the same place or its end.
    private func across(_ id: Card.ID, by delta: Int) -> Bool {
        guard let p = place(of: id, in: columns) else { return false }
        var c = p.column + delta
        while columns.indices.contains(c), !takes(columns[c]) { c += delta }
        guard columns.indices.contains(c) else { return false }
        move(id, to: columns[c].id, at: p.index)
        return true
    }

    // MARK: lifting, moving, landing

    private func lift(_ card: Card, frozen: Bool, keys: Bool) -> Bool {
        guard held == nil, !busy, !disabled else { return false }
        if frozen {
            refusals[card.id, default: .zero] += 1
            say("\(label(card)) can’t be moved.")
            return false
        }
        start = columns
        byKeys = keys
        skip = nil
        withMetalAnimation(.surface, reduceMotion: reduceMotion) { held = card.id }
        say("Lifted \(label(card)). \(position(of: card.id, in: columns)).")
        return true
    }

    private func dragged(_ value: DragGesture.Value) {
        if held == nil {
            guard let (id, f) = frames.first(where: { $0.value.contains(value.startLocation) }),
                  let p = place(of: id, in: columns) else { return }
            let column = columns[p.column]
            let card = column.cards[p.index]
            guard lift(card, frozen: pinned(card) || column.disabled, keys: false) else { return }
            grab = CGPoint(x: value.startLocation.x - f.minX, y: value.startLocation.y - f.minY)
        }
        guard let id = held, !byKeys else { return }
        pointer = value.location
        target(id)
    }

    /// The nearest column that takes cards, then the place under the hand in it.
    private func target(_ id: Card.ID) {
        func distance(_ r: CGRect) -> CGFloat {
            hypot(max(r.minX - pointer.x, .zero, pointer.x - r.maxX), max(r.minY - pointer.y, .zero, pointer.y - r.maxY))
        }
        guard let lane = columns.filter(takes).compactMap({ c in lanes[c.id].map { (c, $0) } }).min(by: { distance($0.1) < distance($1.1) })?.0,
              let from = place(of: id, in: columns) else { return }
        let others = lane.cards.filter { $0.id != id }
        if let s = skip, frames[s].map({ pointer.y >= $0.minY && pointer.y < $0.maxY }) != true { skip = nil }
        let over = others.first { frames[$0.id].map { pointer.y >= $0.minY && pointer.y < $0.maxY } == true }
        if let over, over.id == skip { return }
        let index: Int
        if let over, let f = frames[over.id] {
            let at = others.firstIndex(of: over) ?? .zero
            index = columns[from.column].id == lane.id ? (lane.cards.firstIndex(of: over) ?? at) : at + (pointer.y < f.midY ? .zero : 1)
        } else if let first = others.first.flatMap({ frames[$0.id] }), pointer.y < first.minY {
            index = .zero
        } else if others.isEmpty || others.last.flatMap({ frames[$0.id] }).map({ pointer.y >= $0.maxY }) == true {
            index = others.count
        } else { return }
        skip = over?.id
        move(id, to: lane.id, at: index)
    }

    private func drop() {
        guard let id = held else { return }
        let name = columns.lazy.flatMap(\.cards).first { $0.id == id }.map(label) ?? ""
        withMetalAnimation(.object, reduceMotion: reduceMotion) { held = nil }
        say("Dropped \(name). \(position(of: id, in: columns)).")
        if byKeys { focus = id }
        commit(from: start)
    }

    private func cancel() {
        guard let id = held else { return }
        let name = columns.lazy.flatMap(\.cards).first { $0.id == id }.map(label) ?? ""
        withMetalAnimation(.settle, reduceMotion: reduceMotion) {
            columns = start
            held = nil
        }
        say("Put \(name) back. \(position(of: id, in: start)).")
        if byKeys { focus = id }
    }

    /// Saves a changed board; a failure glides back to `previous`.
    private func commit(from previous: [Column]) {
        let next = columns
        guard next != previous, let onCommit else { return }
        busy = true
        Task { @MainActor in
            do { try await onCommit(next, previous) } catch {
                withMetalAnimation(.settle, reduceMotion: reduceMotion) { columns = previous }
                say("Couldn’t save. It’s back where it was.")
            }
            busy = false
        }
    }

    private func key(_ card: Card, frozen: Bool, _ press: KeyPress) -> KeyPress.Result {
        let lifting = press.key == .space || press.key == .return
        guard held == card.id, byKeys else {
            guard held == nil, lifting else { return .ignored }
            _ = lift(card, frozen: frozen, keys: true)
            return .handled
        }
        var moved = false
        switch press.key {
        case .space, .return: drop(); return .handled
        case .escape: cancel(); return .handled
        case .upArrow: moved = step(card.id, by: -1)
        case .downArrow: moved = step(card.id, by: 1)
        case .leftArrow: moved = across(card.id, by: -1)
        case .rightArrow: moved = across(card.id, by: 1)
        default: return .ignored
        }
        if moved {
            focus = card.id
            say("\(label(card)), \(position(of: card.id, in: columns)).")
        }
        return .handled
    }

    // MARK: columns by their grips

    private func moveLane(_ id: String, _ value: DragGesture.Value) {
        if heldLane == nil {
            guard held == nil, !busy, !disabled else { return }
            start = columns
            withMetalAnimation(.surface, reduceMotion: reduceMotion) { heldLane = id }
            laneShift = .zero
        }
        guard heldLane == id, let i = columns.firstIndex(where: { $0.id == id }) else { return }
        let step = recipe.points("column.width") + recipe.points("self.gap")
        let dx = value.translation.width
        laneShift = dx - CGFloat(i - (start.firstIndex { $0.id == id } ?? i)) * step
        let j = min(max(i + Int((laneShift / step).rounded()), .zero), columns.count - 1)
        guard j != i else { return }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { columns.move(fromOffsets: IndexSet(integer: i), toOffset: j > i ? j + 1 : j) }
        laneShift = dx - CGFloat(j - (start.firstIndex { $0.id == id } ?? j)) * step
    }

    private func dropLane() {
        guard heldLane != nil else { return }
        withMetalAnimation(.object, reduceMotion: reduceMotion) {
            laneShift = .zero
            heldLane = nil
        }
        commit(from: start)
    }

    private func keyLane(_ id: String, _ press: KeyPress) -> KeyPress.Result {
        let lifting = press.key == .space || press.key == .return
        guard heldLane == id else {
            guard heldLane == nil, held == nil, lifting, !busy, !disabled else { return .ignored }
            start = columns
            withMetalAnimation(.surface, reduceMotion: reduceMotion) { heldLane = id }
            return .handled
        }
        guard let i = columns.firstIndex(where: { $0.id == id }) else { return .ignored }
        switch press.key {
        case .space, .return: dropLane()
        case .escape:
            withMetalAnimation(.settle, reduceMotion: reduceMotion) {
                columns = start
                heldLane = nil
            }
        case .leftArrow where i > .zero:
            withMetalAnimation(.settle, reduceMotion: reduceMotion) { columns.move(fromOffsets: IndexSet(integer: i), toOffset: i - 1) }
        case .rightArrow where i < columns.count - 1:
            withMetalAnimation(.settle, reduceMotion: reduceMotion) { columns.move(fromOffsets: IndexSet(integer: i), toOffset: i + 2) }
        case .leftArrow, .rightArrow: break
        default: return .ignored
        }
        return .handled
    }
}

extension MetalKanban {
    /// A board whose cards name themselves with a key path (announcements, VoiceOver).
    public init(_ columns: Binding<[Column]>, reorderColumns: Bool = false, collapsible: Bool = false, disabled: Bool = false,
                empty: String = "No cards", pinned: @escaping (Card) -> Bool = { _ in false },
                label: KeyPath<Card, String>,
                onCommit: (([Column], [Column]) async throws -> Void)? = nil,
                @ViewBuilder content: @escaping (Card) -> Content) {
        self.init(columns, reorderColumns: reorderColumns, collapsible: collapsible, disabled: disabled, empty: empty,
                  pinned: pinned, label: { $0[keyPath: label] }, onCommit: onCommit, content: content)
    }
}
