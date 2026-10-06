import SwiftUI

// TREE, nested rows that open and close in place (tree.agent.md), in step with the web:
//   rest     one flat stack of the visible rows, each a MetalRow (list): guides, the disclosure, the glyph,
//            the name, a trail
//   focus    the tree is one focus stop; the arrows move the active row, which wears the focus ring; the
//            grooves of the branch it is in light (settle)
//   open     the chevron turns a quarter down (part); children land from one nest above (object) while
//            the rows below glide down (settle)
//   close    the children leave one nest down (release); the rows below close the gap (settle)
//   load     a branch with `hasChildren` and no `children` calls loadChildren: quiet, then the ring in the
//            chevron's slot (the spinner's clock); a failure closes it, shows sync-error and Try again
//   select   none / single / multiple (⌘-click toggles, ⇧-click takes a range), never following focus
//   rename   the row's context menu: MetalQuickEdit in a popover under the row
// Reduce Motion: rows and the chevron change at once (MetalMotion resolves every class).

/// One row of a tree and what it holds.
public struct MetalTreeItem: Identifiable, Sendable {
    public let id: String
    public var label: String
    public var icon: MetalIconName?
    /// Its children; nil with `hasChildren` for a level that loads when opened.
    public var children: [MetalTreeItem]?
    public var hasChildren: Bool
    public var disabled: Bool
    /// Quiet detail at the row's end (a count, a size).
    public var trail: String?

    public init(_ id: String, _ label: String, icon: MetalIconName? = nil, children: [MetalTreeItem]? = nil,
                hasChildren: Bool = false, disabled: Bool = false, trail: String? = nil) {
        self.id = id
        self.label = label
        self.icon = icon
        self.children = children
        self.hasChildren = hasChildren
        self.disabled = disabled
        self.trail = trail
    }

    var isBranch: Bool { children != nil || hasChildren }
}

public enum MetalTreeSize: String, Sendable { case large, regular, compact }
public enum MetalTreeSelectionMode: Sendable { case none, single, multiple }

public struct MetalTreeWords: Sendable {
    public var empty: String
    public var failed: String
    public var retry: String
    public var rename: String
    public init(empty: String = "Empty", failed: String = "Couldn’t load", retry: String = "Try again", rename: String = "Rename") {
        self.empty = empty
        self.failed = failed
        self.retry = retry
        self.rename = rename
    }
}

private struct MetalTreeFlat: Identifiable {
    enum Kind { case item(MetalTreeItem), empty }
    let id: String
    let kind: Kind
    let level: Int
    let parent: String?
    let ancestors: [String]
    let open: Bool
    var item: MetalTreeItem? { if case .item(let i) = kind { return i } else { return nil } }
}

public struct MetalTree: View {
    let label: String
    let items: [MetalTreeItem]
    let size: MetalTreeSize
    let selectionMode: MetalTreeSelectionMode
    @Binding var selection: Set<String>
    @Binding var expanded: Set<String>
    let opened: String?
    let words: MetalTreeWords
    let onAction: ((MetalTreeItem) -> Void)?
    let loadChildren: ((MetalTreeItem) async throws -> Void)?
    let onRename: ((MetalTreeItem, String) async throws -> Void)?
    let validateName: (MetalTreeItem, String) -> String?

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focused: Bool
    @State private var active: String?
    @State private var anchor: String?
    @State private var loads: [String: MetalWork] = [:]
    @State private var typed = ""
    @State private var typedAt = Date.distantPast
    @State private var renaming: String?

    public init(_ label: String, items: [MetalTreeItem], size: MetalTreeSize = .regular,
                selectionMode: MetalTreeSelectionMode = .single, selection: Binding<Set<String>> = .constant([]),
                expanded: Binding<Set<String>>, opened: String? = nil, words: MetalTreeWords = MetalTreeWords(),
                onAction: ((MetalTreeItem) -> Void)? = nil,
                loadChildren: ((MetalTreeItem) async throws -> Void)? = nil,
                onRename: ((MetalTreeItem, String) async throws -> Void)? = nil,
                validateName: @escaping (MetalTreeItem, String) -> String? = { _, _ in nil }) {
        self.label = label
        self.items = items
        self.size = size
        self.selectionMode = selectionMode
        _selection = selection
        _expanded = expanded
        self.opened = opened
        self.words = words
        self.onAction = onAction
        self.loadChildren = loadChildren
        self.onRename = onRename
        self.validateName = validateName
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.tree }
    private var height: Double { recipe.points("\(size.rawValue).height") }
    private var indent: Double { recipe.points("\(size.rawValue).indent") }
    private var glyph: Double { recipe.points("\(size.rawValue).glyph") }

    private var rows: [MetalTreeFlat] {
        var out: [MetalTreeFlat] = []
        func walk(_ list: [MetalTreeItem], parent: String?, ancestors: [String]) {
            for item in list {
                let open = item.isBranch && expanded.contains(item.id)
                out.append(MetalTreeFlat(id: item.id, kind: .item(item), level: ancestors.count + 1, parent: parent, ancestors: ancestors, open: open))
                guard open, let children = item.children else { continue }
                let inside = ancestors + [item.id]
                if children.isEmpty {
                    out.append(MetalTreeFlat(id: item.id + "\u{0}empty", kind: .empty, level: inside.count + 1, parent: item.id, ancestors: inside, open: false))
                } else {
                    walk(children, parent: item.id, ancestors: inside)
                }
            }
        }
        walk(items, parent: nil, ancestors: [])
        return out
    }

    private func parentMap() -> [String: String] {
        var out: [String: String] = [:]
        func walk(_ list: [MetalTreeItem], parent: String?) {
            for item in list {
                if let parent { out[item.id] = parent }
                if let children = item.children { walk(children, parent: item.id) }
            }
        }
        walk(items, parent: nil)
        return out
    }

    /// The active row if it shows, else its nearest showing ancestor, else the first selected, else the first.
    private func current(_ nav: [MetalTreeFlat]) -> String? {
        let shown = Set(nav.map(\.id))
        let up = parentMap()
        var id = active
        while let at = id, !shown.contains(at) { id = up[at] }
        return id ?? nav.first(where: { selection.contains($0.id) })?.id ?? nav.first?.id
    }

    public var body: some View {
        let all = rows
        let nav = all.filter { $0.item != nil }
        let here = current(nav)
        let at = nav.first(where: { $0.id == here })
        let lit = focused && (at?.level ?? 1) > 1 ? (level: at!.level - 1, branch: at!.parent) : nil
        VStack(spacing: .zero) {
            ForEach(all) { row in
                rowView(row, isActive: row.id == here, lit: lit.flatMap { row.ancestors.count >= $0.level && row.ancestors[$0.level - 1] == $0.branch ? $0.level : nil })
                    .transition(.asymmetric(
                        insertion: .offset(y: -MetalRadius.nest).combined(with: .opacity).animation(MetalMotion.resolve(.object, reduceMotion: reduceMotion).animation),
                        removal: .offset(y: MetalRadius.nest).combined(with: .opacity).animation(MetalMotion.resolve(.release, reduceMotion: reduceMotion).animation)))
            }
        }
        .focusable()
        .focused($focused)
        .focusEffectDisabled()
        .onKeyPress(phases: .down) { key($0, nav: nav, here: here) }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    // MARK: Rows

    @ViewBuilder
    private func rowView(_ row: MetalTreeFlat, isActive: Bool, lit: Int?) -> some View {
        let lead = Double(row.level - 1) * indent
        Group {
            if let item = row.item {
                MetalTreeRow(item: item, row: row, size: size, height: height, indent: indent, glyph: glyph,
                             selected: selectionMode != .none && selection.contains(item.id), opened: opened == item.id,
                             active: isActive && focused, work: loads[item.id] ?? .idle, words: words,
                             onDisclosure: { active = item.id; toggle(row) })
                    .contentShape(Rectangle())
                    .onTapGesture(count: 2) { if selectionMode != .none { act(row) } }
                    // ⌘-click and ⇧-click: a pointer with modifier keys, macOS only (iOS picks with the keyboard paths).
                    #if os(macOS)
                    .simultaneousGesture(TapGesture().modifiers(.command).onEnded { active = item.id; choose(row, toggle: true, range: false) })
                    .simultaneousGesture(TapGesture().modifiers(.shift).onEnded { active = item.id; choose(row, toggle: false, range: true) })
                    #endif
                    .onTapGesture { click(row) }
                    .contextMenu {
                        if onRename != nil && !item.disabled { Button(words.rename) { renaming = item.id } }
                    }
                    .popover(isPresented: Binding(get: { renaming == item.id }, set: { if !$0 { renaming = nil } }), arrowEdge: .bottom) {
                        if let onRename {
                            MetalQuickEdit(words.rename, value: item.label, validate: { validateName(item, $0) },
                                           onCommit: { try await onRename(item, $0) }, onClose: { renaming = nil })
                                .padding(MetalRecipes.popover.points("self.pad"))
                        }
                    }
            } else {
                HStack(spacing: MetalRecipes.row.points("list.gap")) {
                    Color.clear.frame(width: lead + indent)
                    Text(words.empty).foregroundColor(colorway.tokens.ink3.color)
                    Spacer(minLength: .zero)
                }
                .font(MetalRecipes.row.font("list.font"))
                .padding(.horizontal, MetalRecipes.row.points("list.pad-x"))
                .frame(height: height)
                .accessibilityHidden(true)
            }
        }
        .overlay(alignment: .leading) { guides(level: row.level, lit: lit) }
    }

    /// One engraved groove per ancestor, at the centre of its chevron, the full height of the row.
    private func guides(level: Int, lit: Int?) -> some View {
        MetalTreeGuides(level: level, lit: lit, indent: indent)
            .padding(.leading, MetalRecipes.row.points("list.pad-x"))
    }

    // MARK: Acting

    private func expand(_ row: MetalTreeFlat) {
        guard let item = row.item, item.isBranch, !row.open else { return }
        if item.children == nil, let loadChildren {
            guard loads[item.id] != .working else { return }
            loads[item.id] = .working
            withMetalAnimation(.settle, reduceMotion: reduceMotion) { _ = expanded.insert(item.id) }
            Task { @MainActor in
                do {
                    try await loadChildren(item)
                    withMetalAnimation(.settle, reduceMotion: reduceMotion) { loads[item.id] = .idle }
                } catch {
                    loads[item.id] = .failed
                    withMetalAnimation(.settle, reduceMotion: reduceMotion) { _ = expanded.remove(item.id) }
                }
            }
            return
        }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { _ = expanded.insert(item.id) }
    }

    private func collapse(_ row: MetalTreeFlat) {
        guard row.open else { return }
        if let a = active, rows.contains(where: { $0.id == a && $0.ancestors.contains(row.id) }) { active = row.id }
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { _ = expanded.remove(row.id) }
    }

    private func toggle(_ row: MetalTreeFlat) { if row.open { collapse(row) } else { expand(row) } }

    private func act(_ row: MetalTreeFlat) {
        guard let item = row.item, !item.disabled else { return }
        if let onAction { onAction(item) } else if item.isBranch { toggle(row) }
    }

    private func click(_ row: MetalTreeFlat) {
        active = row.id
        focused = true
        if selectionMode == .none { act(row) } else { choose(row, toggle: false, range: false) }
    }

    private func choose(_ row: MetalTreeFlat, toggle: Bool, range: Bool) {
        guard selectionMode != .none, let item = row.item, !item.disabled else { return }
        if selectionMode == .single || (!toggle && !range) {
            anchor = item.id
            selection = [item.id]
        } else if toggle {
            anchor = item.id
            if selection.contains(item.id) { selection.remove(item.id) } else { selection.insert(item.id) }
        } else {
            let nav = rows.filter { $0.item != nil }
            guard let a = nav.firstIndex(where: { $0.id == (anchor ?? item.id) }), let b = nav.firstIndex(where: { $0.id == item.id }) else { return }
            selection = Set(nav[min(a, b)...max(a, b)].filter { $0.item?.disabled == false }.map(\.id))
        }
    }

    // MARK: Keys

    private func key(_ press: KeyPress, nav: [MetalTreeFlat], here: String?) -> KeyPress.Result {
        guard let i = nav.firstIndex(where: { $0.id == here }) else { return .ignored }
        let row = nav[i]
        let multiple = selectionMode == .multiple
        func move(_ to: Int) {
            let next = nav[max(.zero, min(nav.count - 1, to))]
            active = next.id
            if press.modifiers.contains(.shift) && multiple { choose(next, toggle: false, range: true) }
        }
        switch press.key {
        case .downArrow: move(i + 1)
        case .upArrow: move(i - 1)
        case .home: move(.zero)
        case .end: move(nav.count - 1)
        case .rightArrow:
            guard row.item?.isBranch == true else { return .handled }
            if !row.open { expand(row) } else if i + 1 < nav.count, nav[i + 1].parent == row.id { active = nav[i + 1].id }
        case .leftArrow:
            if row.open { collapse(row) } else if let parent = row.parent { active = parent }
        case .return: act(row)
        case .space:
            if Date().timeIntervalSince(typedAt) < recipe.durationSeconds("self.typeahead") && !typed.isEmpty { return typeAhead(" ", nav: nav, from: i) }
            if multiple && press.modifiers.contains(.shift) { choose(row, toggle: false, range: true) } else { choose(row, toggle: multiple, range: false) }
        default:
            let chars = press.characters
            if chars == "*" {
                for r in nav where r.parent == row.parent && r.item?.isBranch == true { expand(r) }
                return .handled
            }
            if multiple && press.modifiers.contains(.command) && chars.lowercased() == "a" {
                selection = Set(nav.filter { $0.item?.disabled == false }.map(\.id))
                return .handled
            }
            guard chars.count == 1, !press.modifiers.contains(.command), !press.modifiers.contains(.control) else { return .ignored }
            return typeAhead(chars, nav: nav, from: i)
        }
        return .handled
    }

    /// Letters within the type-ahead window go to the next row whose name starts with them.
    private func typeAhead(_ char: String, nav: [MetalTreeFlat], from i: Int) -> KeyPress.Result {
        let now = Date()
        typed = (now.timeIntervalSince(typedAt) < recipe.durationSeconds("self.typeahead") ? typed : "") + char.lowercased()
        typedAt = now
        let same = Set(typed).count == 1
        let start = same ? i + 1 : i
        let order = Array(nav[min(start, nav.count)...]) + Array(nav[..<min(start, nav.count)])
        let starts = { (r: MetalTreeFlat, s: String) in r.item?.label.lowercased().hasPrefix(s) == true }
        if let hit = order.first(where: { starts($0, typed) }) ?? (same ? order.first(where: { starts($0, String(typed.prefix(1))) }) : nil) {
            active = hit.id
        }
        return .handled
    }
}

/// One row: its own wait clock, so each loading level keeps its own time.
private struct MetalTreeRow: View {
    let item: MetalTreeItem
    let row: MetalTreeFlat
    let size: MetalTreeSize
    let height: Double
    let indent: Double
    let glyph: Double
    let selected: Bool
    let opened: Bool
    let active: Bool
    let work: MetalWork
    let words: MetalTreeWords
    let onDisclosure: () -> Void

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var wait = MetalWait()

    var body: some View {
        let recipe = MetalRecipes.tree
        let failed = work == .failed
        let lead = Double(row.level - 1) * indent
        MetalRow(.list, selected: selected, opened: opened, waiting: wait.busy) {
            HStack(spacing: MetalRecipes.row.points("list.gap")) {
                HStack(spacing: .zero) {
                    Color.clear.frame(width: lead)
                    MetalTreeDisclosure(branch: item.isBranch, open: row.open, wait: wait, failed: failed, label: "Loading \(item.label)")
                        .frame(width: indent)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onDisclosure)
                }
                if let icon = item.icon { MetalIcon(icon, size: glyph).foregroundStyle(colorway.tokens.ink2.color) }
            }
            .foregroundStyle(colorway.tokens.ink2.color)
        } text: {
            Text(item.label).lineLimit(1).truncationMode(.tail).foregroundColor(colorway.tokens.ink.color)
        } trail: {
            if failed {
                Text("\(words.failed) · \(words.retry)").foregroundColor(colorway.tokens.ink2.color)
            } else if let trail = item.trail {
                Text(trail).foregroundColor(colorway.tokens.ink2.color)
            }
        }
        .frame(height: height)
        .opacity(item.disabled ? recipe.scalar("disabled.opacity") : .one)
        .overlay {
            if active {
                RoundedRectangle(cornerRadius: MetalRecipes.row.points("list.radius"), style: .continuous)
                    .strokeBorder(MetalShared.focus.color, lineWidth: MetalRing.focusWidth)
            }
        }
        .metalWait(work == .working ? .working : .idle, into: $wait)
        .metalWaitSaid(wait.phase, label: "Loading \(item.label)")
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.label)
        .accessibilityValue(failed ? words.failed : item.isBranch ? (row.open ? "expanded" : "collapsed") : "")
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// THE TREE'S OWN PIECES, for any row that sits at a level (Tree, Table's hierarchy rows), as the web's
// Tree.Guides and Tree.Disclosure.

/// The indent's guides: one engraved groove per ancestor, at the centre of its chevron, the full height of
/// what it overlays (so the grooves join down a list); `lit` lights one level's groove (settle).
struct MetalTreeGuides: View {
    let level: Int
    let lit: Int?
    let indent: Double
    @Environment(\.metalColorway) private var colorway

    var body: some View {
        let recipe = MetalRecipes.tree
        let width = recipe.points("guide.width")
        let litInk = recipe.color("guide.lit", colorway: MetalRecipeColorway(colorway))?.color ?? .clear
        HStack(spacing: .zero) {
            ForEach(1..<max(level, 1), id: \.self) { col in
                ZStack {
                    MetalRule(.vertical).frame(maxHeight: .infinity)
                    litInk.frame(width: width).opacity(lit == col ? .one : .zero)
                }
                .frame(width: indent)
            }
        }
        .metalAnimation(.settle, value: lit)
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The set's chevron that opens a branch: along when closed, a quarter turn down on the part spring when
/// open; while a level loads the spinner's ring stands in for it (`wait`), and a failed load shows sync-error.
struct MetalTreeDisclosure: View {
    let branch: Bool
    let open: Bool
    let wait: MetalWait
    let failed: Bool
    let label: String

    var body: some View {
        let chevron = MetalRecipes.tree.points("chevron.size")
        ZStack {
            if branch {
                if failed && !wait.showing {
                    MetalIcon(.syncError, size: chevron)
                } else {
                    MetalIcon(.chevron, size: chevron)
                        .rotationEffect(.degrees(open ? .zero : -90))
                        .metalAnimation(.part, value: open)
                        .opacity(wait.showing ? .zero : .one)
                }
                if wait.phase != .idle && wait.phase != .failed {
                    MetalSpinner(size: .small, label: label, phase: wait.phase) { EmptyView() }
                }
            }
        }
    }
}
