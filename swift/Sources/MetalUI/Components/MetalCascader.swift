import SwiftUI

// CASCADER, a value chosen through nested levels (cascader.agent.md), in step with the web:
//   well      the field's well (regular or compact) holding the path: the levels above in ink2, small chevrons
//             in ink3, the last in ink; more than three levels fold the start into "…". The clear key once
//             there is a value, and a chevron that turns while the plate is open. Several values: the
//             combobox's chips, wrapping a line at a time
//   plate     the menu's frosted plate: the search field, then one column per level opened (200 wide, the
//             last takes the rest), parted by the menu's hairline standing upright
//   rows      the menu's rows: the row a column opened holds the option's raised plate; one highlight glides
//             in the column the keys are in (MetalListGlide); the value ends in a check; a branch ends in the
//             chevron, or the spinner's ring while its level loads (the spinner's clock)
//   deeper    a new column arrives one grid step from the right on the settle spring, fading in; drilling
//             back, from the left
//   failed    the column is one row: sync-error, Couldn't load, Try again; an empty level says Empty
//   search    typing turns the columns into one list of matches across the loaded levels, each over its path
//   keys      ↑ ↓ Home End in a column, → opens and goes in, ← goes back, ↩ chooses, Space ticks (macOS)
// Every number is the cascader, menu, field, row, chip or tree recipe's. Reduce Motion: levels fade in without
// travel; the chevron turns at once (MetalMotion resolves every class).

/// Where a branch can be the value: never (it only opens), or like any leaf.
public enum MetalCascaderPick: Sendable { case leaf, any }

/// Columns side by side, or one level at a time with Back for a narrow well.
public enum MetalCascaderLayout: Sendable { case columns, drill }

public struct MetalCascaderWords: Sendable {
    public var search: String
    public var empty: String
    public var failed: String
    public var retry: String
    public var back: String
    public var clear: String
    /// Said before the query when nothing matched ("No matches for").
    public var noMatches: String
    public init(search: String = "Search", empty: String = "Empty", failed: String = "Couldn’t load", retry: String = "Try again",
                back: String = "Back", clear: String = "Clear", noMatches: String = "No matches for") {
        self.search = search
        self.empty = empty
        self.failed = failed
        self.retry = retry
        self.back = back
        self.clear = clear
        self.noMatches = noMatches
    }
}

/// Choose a value through nested levels: columns side by side (or one level at a time), search across them.
public struct MetalCascader: View {
    let label: String
    let items: [MetalTreeItem]
    @Binding var values: [String]
    let multiple: Bool
    let max: Int?
    let prompt: String
    let size: MetalFieldSize
    let pick: MetalCascaderPick
    let layout: MetalCascaderLayout
    let invalid: Bool
    let limit: Int
    let words: MetalCascaderWords
    let loadChildren: ((MetalTreeItem) async throws -> Void)?
    /// Headless captures: the plate drawn open under the well with these levels opened and this row highlighted.
    var specimen: (trail: [String], active: String?, query: String)? = nil

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var open = false
    @State private var trailState: [String] = []
    @State private var colState = 0
    @State private var activeState: String?
    @State private var query = ""
    @State private var loads: [String: MetalWork] = [:]
    @State private var into: String?
    @State private var back = false

    /// One value: the chosen id (the items must be loaded down to it).
    public init(_ label: String, items: [MetalTreeItem], selection: Binding<String?>, prompt: String = "",
                size: MetalFieldSize = .regular, pick: MetalCascaderPick = .leaf, layout: MetalCascaderLayout = .columns,
                invalid: Bool = false, limit: Int = 100, words: MetalCascaderWords = MetalCascaderWords(),
                loadChildren: ((MetalTreeItem) async throws -> Void)? = nil) {
        self.init(label, items: items, values: Binding(get: { selection.wrappedValue.map { [$0] } ?? [] },
                                                       set: { selection.wrappedValue = $0.last }),
                  multiple: false, max: nil, prompt: prompt, size: size, pick: pick, layout: layout, invalid: invalid,
                  limit: limit, words: words, loadChildren: loadChildren)
    }

    /// Several values, as a covering set: a branch chosen whole is its own id.
    public init(_ label: String, items: [MetalTreeItem], values: Binding<[String]>, max: Int? = nil, prompt: String = "",
                size: MetalFieldSize = .regular, layout: MetalCascaderLayout = .columns, invalid: Bool = false,
                limit: Int = 100, words: MetalCascaderWords = MetalCascaderWords(),
                loadChildren: ((MetalTreeItem) async throws -> Void)? = nil) {
        self.init(label, items: items, values: values, multiple: true, max: max, prompt: prompt, size: size, pick: .leaf,
                  layout: layout, invalid: invalid, limit: limit, words: words, loadChildren: loadChildren)
    }

    private init(_ label: String, items: [MetalTreeItem], values: Binding<[String]>, multiple: Bool, max: Int?, prompt: String,
                 size: MetalFieldSize, pick: MetalCascaderPick, layout: MetalCascaderLayout, invalid: Bool, limit: Int,
                 words: MetalCascaderWords, loadChildren: ((MetalTreeItem) async throws -> Void)?) {
        self.label = label
        self.items = items
        self._values = values
        self.multiple = multiple
        self.max = max
        self.prompt = prompt
        self.size = size == .large ? .regular : size
        self.pick = pick
        self.layout = layout
        self.invalid = invalid
        self.limit = limit
        self.words = words
        self.loadChildren = loadChildren
    }

    // MARK: the hierarchy

    private struct Node { let item: MetalTreeItem; let parent: String?; let path: [MetalTreeItem] }

    private var index: [String: Node] {
        var out: [String: Node] = [:]
        func walk(_ list: [MetalTreeItem], parent: String?, path: [MetalTreeItem]) {
            for item in list {
                let here = path + [item]
                out[item.id] = Node(item: item, parent: parent, path: here)
                if let children = item.children { walk(children, parent: item.id, path: here) }
            }
        }
        walk(items, parent: nil, path: [])
        return out
    }

    private struct Column: Identifiable {
        let id: String
        let parent: MetalTreeItem?
        let items: [MetalTreeItem]
        var failed = false
    }

    private var trail: [String] { specimen?.trail ?? trailState }
    private var active: String? { specimen.map { $0.active } ?? activeState }
    private var shownQuery: String { specimen?.query ?? query }

    private func columns(_ index: [String: Node]) -> [Column] {
        var out = [Column(id: "", parent: nil, items: items)]
        for id in trail {
            guard let node = index[id] else { break }
            if let children = node.item.children { out.append(Column(id: id, parent: node.item, items: children)) }
            else if loads[id] == .failed { out.append(Column(id: id, parent: node.item, items: [], failed: true)) }
            else { break }
        }
        return out
    }

    private func here(_ columns: [Column]) -> Int { Swift.min(specimen.map { _ in columns.count - 1 } ?? colState, columns.count - 1) }

    private static let retry = "\u{0}retry:"

    private func enabled(_ column: Column) -> [String] {
        column.failed ? [Self.retry + column.id] : column.items.filter { !$0.disabled }.map(\.id)
    }

    private var q: String { shownQuery.trimmingCharacters(in: .whitespaces) }

    private func matches(_ index: [String: Node]) -> [Node] {
        guard !q.isEmpty else { return [] }
        return index.values
            .filter { $0.item.label.localizedCaseInsensitiveContains(q) && (multiple || pick == .any || !$0.item.isBranch) }
            .sorted { $0.path.map(\.label).joined(separator: "\u{1}") < $1.path.map(\.label).joined(separator: "\u{1}") }
    }

    // MARK: the value

    private func isOn(_ id: String, _ index: [String: Node]) -> Bool { index[id]?.path.contains { values.contains($0.id) } ?? false }
    private func isMixed(_ id: String, _ index: [String: Node]) -> Bool {
        !isOn(id, index) && values.contains { v in index[v]?.path.dropLast().contains { $0.id == id } ?? false }
    }

    /// Ticks or unticks `id` in a covering set (the web's `toggled`).
    private func toggled(_ id: String, _ index: [String: Node]) -> [String] {
        guard let node = index[id] else { return values }
        let ids = node.path.map(\.id)
        if let top = ids.first(where: values.contains) {
            if top == id { return values.filter { $0 != id } }
            var next = values.filter { $0 != top }
            let from = ids.firstIndex(of: top) ?? .zero
            for i in from..<(ids.count - 1) {
                for child in index[ids[i]]?.item.children ?? [] where child.id != ids[i + 1] { next.append(child.id) }
            }
            return next
        }
        var next = values.filter { v in !(index[v]?.path.contains { $0.id == id } ?? false) } + [id]
        var parent = node.parent
        while let p = parent, let kids = index[p]?.item.children, !kids.isEmpty, kids.allSatisfy({ next.contains($0.id) }) {
            next = next.filter { v in !kids.contains { $0.id == v } } + [p]
            parent = index[p]?.parent
        }
        return next
    }

    private func blocked(_ id: String, _ index: [String: Node]) -> Bool {
        guard let max else { return false }
        return !isOn(id, index) && toggled(id, index).count > max
    }

    private func tick(_ id: String, _ index: [String: Node]) {
        guard !blocked(id, index), index[id]?.item.disabled == false else { return }
        let next = toggled(id, index)
        withMetalAnimation(.object, reduceMotion: reduceMotion) { values = next }
    }

    // MARK: opening, loading, choosing

    private func opened(_ isOpen: Bool) {
        if isOpen {
            let path = !multiple ? values.first.flatMap { index[$0]?.path } ?? [] : []
            trailState = path.filter { $0.children != nil }.map(\.id)
            colState = path.isEmpty ? .zero : path.count - 1
            activeState = path.last?.id ?? items.first { !$0.disabled }?.id
            back = false
        } else {
            query = ""
            into = nil
        }
    }

    private func load(_ item: MetalTreeItem) {
        guard let loadChildren, loads[item.id] != .working else { return }
        loads[item.id] = .working
        Task { @MainActor in
            do {
                try await loadChildren(item)
                loads[item.id] = .idle
            } catch {
                loads[item.id] = .failed
            }
            arrive()
        }
    }

    private func openBranch(_ item: MetalTreeItem, at k: Int, go: Bool) {
        guard item.isBranch, !item.disabled else { return }
        back = false
        withMetalAnimation(.settle, reduceMotion: reduceMotion) { trailState = Array(trailState.prefix(k)) + [item.id] }
        if item.children == nil { load(item) } else if loads[item.id] == .failed { loads[item.id] = .idle }
        if go { into = item.id; arrive() }
    }

    /// The keys go into a level once its children (or its failure) are there.
    private func arrive() {
        guard let id = into, let k = trailState.firstIndex(of: id), let node = index[id] else { return }
        if let children = node.item.children {
            into = nil
            withMetalAnimation(.settle, reduceMotion: reduceMotion) {
                colState = k + 1
                activeState = children.first { !$0.disabled }?.id
            }
        } else if loads[id] == .failed {
            into = nil
            colState = k + 1
            activeState = Self.retry + id
        }
    }

    private func goBack(_ here: Int) {
        guard here > .zero else { return }
        back = true
        withMetalAnimation(.settle, reduceMotion: reduceMotion) {
            activeState = trailState[here - 1]
            colState = here - 1
            trailState = Array(trailState.prefix(here))
        }
    }

    private func chooseOne(_ id: String) {
        values = [id]
        open = false
    }

    /// ↩ or a click on a row of column `k`.
    private func press(_ id: String, at k: Int, enter: Bool) {
        let index = self.index
        if id.hasPrefix(Self.retry) {
            if let item = index[String(id.dropFirst(Self.retry.count))]?.item { load(item) }
            return
        }
        guard let item = index[id]?.item, !item.disabled else { return }
        activeState = id
        colState = k
        if multiple {
            if item.isBranch { openBranch(item, at: k, go: enter) } else { tick(id, index) }
            return
        }
        guard item.isBranch else { return chooseOne(id) }
        if pick == .any && enter { return chooseOne(id) }
        if pick == .any { values = [id] }
        openBranch(item, at: k, go: enter || layout == .drill)
    }

    private func key(_ press: KeyPress) -> KeyPress.Result {
        let index = self.index
        if !q.isEmpty {
            let list = matches(index).prefix(limit).filter { !$0.item.disabled }.map(\.item.id)
            let current = active.flatMap { list.contains($0) ? $0 : nil } ?? list.first
            let i = current.flatMap { list.firstIndex(of: $0) } ?? -1
            switch press.key {
            case .downArrow: activeState = list.isEmpty ? nil : list[Swift.min(i + 1, list.count - 1)]
            case .upArrow: activeState = list.isEmpty ? nil : list[Swift.max(i - 1, .zero)]
            case .return:
                guard let current else { return .handled }
                if multiple { tick(current, index) } else { chooseOne(current) }
            default: return .ignored
            }
            return .handled
        }
        let all = columns(index)
        let at = here(all)
        let list = enabled(all[at])
        let i = active.flatMap { list.firstIndex(of: $0) } ?? -1
        let item = active.flatMap { index[$0]?.item }
        func go(_ to: Int) { if !list.isEmpty { activeState = list[Swift.max(.zero, Swift.min(list.count - 1, to))] } }
        switch press.key {
        case .downArrow: go(i + 1)
        case .upArrow: go(i < .zero ? list.count - 1 : i - 1)
        case .home: go(.zero)
        case .end: go(list.count - 1)
        case .rightArrow:
            guard let item, item.isBranch else { return .ignored }
            openBranch(item, at: at, go: true)
        case .leftArrow:
            guard at > .zero else { return .ignored }
            goBack(at)
        case .return:
            if let active { self.press(active, at: at, enter: true) }
        case .space:
            guard multiple, query.isEmpty, let item else { return .ignored }
            tick(item.id, index)
        default: return .ignored
        }
        return .handled
    }

    // MARK: body

    public var body: some View {
        Group {
            if specimen != nil {
                VStack(alignment: .leading, spacing: MetalMenuMetrics.offset) { well; plate.fixedSize() }
            } else {
                well
                    .popover(isPresented: $open, arrowEdge: .bottom) {
                        plate.onKeyPress(phases: .down) { key($0) }
                    }
                    .onChange(of: open) { _, new in opened(new) }
                    .onChange(of: items.count) { _, _ in arrive() }
                    .onChange(of: index.count) { _, _ in arrive() }
            }
        }
    }

    // MARK: the well

    private var part: String { size == .compact ? "compact" : "regular" }

    private var well: some View {
        let field = MetalRecipes.field
        let height = field.points("\(part).height")
        let line = MetalRecipes.chip.points("suggestion.height")
        let inset = (height - line) / 2 // the chip line centred in the well's single-line height
        let shape = RoundedRectangle(cornerRadius: field.points("\(part).radius"), style: .continuous)
        let index = self.index
        let said = multiple ? values.map { index[$0]?.item.label ?? $0 }.joined(separator: ", ")
            : (values.first.flatMap { index[$0]?.path.map(\.label).joined(separator: " › ") } ?? values.first ?? "")
        return HStack(alignment: multiple ? .top : .center, spacing: field.points("\(part).gap")) {
            if multiple {
                MetalComboboxFlow(spacing: MetalRecipes.combobox.points("chips.gap")) {
                    ForEach(values, id: \.self) { chip($0, index) }
                    Text(values.isEmpty ? prompt : "").foregroundColor(hint).frame(height: line)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                path(index).frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(spacing: field.points("key.gap")) {
                MetalFieldKey(words.clear, icon: .close) {
                    withMetalAnimation(.release, reduceMotion: reduceMotion) { values = [] }
                }
                .metalPresence(!values.isEmpty && isEnabled, pop: field.scalar("key.pop"))
                MetalIcon(.chevron, size: field.points("key.glyph"))
                    .foregroundStyle(colorway.tokens.ink2.color)
                    .rotationEffect(.degrees(open || specimen != nil ? 180 : .zero))
                    .metalAnimation(.settle, value: open)
                    .accessibilityHidden(true)
            }
            .frame(height: multiple ? line : nil)
        }
        .font(.metal(MetalType.ui))
        .padding(.leading, field.points("\(part).pad-left"))
        .padding(.trailing, field.points("\(part).pad-right"))
        .padding(.vertical, multiple ? inset : .zero)
        .frame(minWidth: MetalRecipes.cascader.points("self.min-width"), minHeight: height)
        .background { MetalWell(.field, radius: field.points("\(part).radius")) { Color.clear } }
        .overlay {
            if invalid { shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth).allowsHitTesting(false) }
            if (open || specimen != nil) && isEnabled {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth).allowsHitTesting(false)
            }
        }
        .contentShape(shape)
        .onTapGesture { if isEnabled { open = true } }
        .focusable(isEnabled)
        .onKeyPress(keys: [.downArrow, .return, .space]) { _ in
            open = true
            return .handled
        }
        .opacity(isEnabled ? .one : field.scalar("state.disabled"))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
        .accessibilityValue(said)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { open = true }
    }

    private var hint: Color {
        MetalRecipes.field.color("field.hint", colorway: MetalRecipeColorway(colorway))?.color ?? colorway.tokens.ink3.color
    }

    /// The path in the breadcrumbs' look; more than three levels keep the last two.
    @ViewBuilder private func path(_ index: [String: Node]) -> some View {
        let full = values.first.flatMap { index[$0]?.path.map(\.label) } ?? values.first.map { [$0] } ?? []
        let shown = full.count > 3 ? ["…"] + full.suffix(2) : full
        if shown.isEmpty {
            Text(prompt).foregroundColor(hint).lineLimit(1)
        } else {
            HStack(spacing: MetalRecipes.cascader.points("path.gap")) {
                ForEach(Array(shown.enumerated()), id: \.offset) { i, name in
                    let last = i == shown.count - 1
                    Text(name).lineLimit(1).truncationMode(.tail)
                        .foregroundColor((last ? colorway.tokens.ink : colorway.tokens.ink2).color)
                        .layoutPriority(last ? 1 : .zero)
                    if !last {
                        MetalIcon(.chevron, size: MetalRecipes.breadcrumbs.points("sep.size"))
                            .rotationEffect(.degrees(-90))
                            .foregroundStyle(colorway.tokens.ink3.color)
                    }
                }
            }
            .accessibilityHidden(true)
        }
    }

    private func chip(_ value: String, _ index: [String: Node]) -> some View {
        let recipe = MetalRecipes.chip
        let name = index[value]?.item.label ?? value
        let shape = Capsule(style: .continuous)
        return HStack(spacing: recipe.points("suggestion.gap")) {
            Text(name).lineLimit(1)
            MetalIconButton("Remove \(name)", variant: .mini, action: {
                withMetalAnimation(.release, reduceMotion: reduceMotion) { values.removeAll { $0 == value } }
            }) {
                MetalIcon(.close, size: MetalRecipes.attachment.points("remove.glyph"))
            }
        }
        .font(recipe.font("suggestion.font"))
        .tracking(recipe.tracking("suggestion.tracking", size: recipe.fontSize("suggestion.font")))
        .foregroundColor(recipe.color("suggestion.ink", colorway: MetalRecipeColorway(colorway))?.color ?? .clear)
        .padding(.leading, recipe.points("suggestion.pad-left"))
        .padding(.trailing, recipe.points("suggestion.pad-right"))
        .frame(height: recipe.points("suggestion.height"))
        .metalObjectRecipe(MetalRecipes.combobox, part: "chip", in: shape)
        .fixedSize()
        .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: -MetalRadius.nest)),
                                removal: .opacity.combined(with: .offset(y: MetalRadius.nest))))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(name)
    }

    // MARK: the plate

    private var plate: some View {
        let menu = MetalRecipes.menu
        let cascader = MetalRecipes.cascader
        let shape = RoundedRectangle(cornerRadius: menu.points("self.radius"), style: .continuous)
        let index = self.index
        let all = columns(index)
        let at = here(all)
        let width = cascader.points("column.width")
        return VStack(alignment: .leading, spacing: .zero) {
            searchField.padding(.bottom, menu.points("self.pad"))
            if !q.isEmpty {
                results(index)
            } else if layout == .drill {
                VStack(alignment: .leading, spacing: .zero) {
                    if at > .zero {
                        HStack(spacing: menu.points("row.gap")) {
                            MetalIconButton(words.back, variant: .mini, action: { goBack(at) }) {
                                MetalIcon(.chevron, size: MetalRecipes.tree.points("chevron.size")).rotationEffect(.degrees(90))
                            }
                            MetalLabel(all[at].parent?.label ?? "", style: .engraved)
                        }
                        .padding(.leading, menu.points("heading.pad-x"))
                        .frame(height: menu.points("row.height"))
                    }
                    column(all[at], at: at, here: at, index: index)
                        .id(all[at].id)
                        .transition(.asymmetric(insertion: .offset(x: back ? -MetalSpace.s4 : MetalSpace.s4).combined(with: .opacity), removal: .identity))
                }
                .frame(width: width)
            } else {
                HStack(alignment: .top, spacing: .zero) {
                    ForEach(Array(all.enumerated()), id: \.element.id) { k, c in
                        let last = c.id == all.last?.id
                        if k > .zero { divider }
                        column(c, at: k, here: at, index: index)
                            .frame(width: last ? nil : width)
                            .frame(minWidth: width)
                            .transition(.asymmetric(insertion: .offset(x: MetalSpace.s4).combined(with: .opacity), removal: .opacity))
                    }
                }
                .fixedSize()
            }
            if let max {
                quiet("\(values.count) of \(max)")
            }
        }
        .padding(menu.points("self.pad"))
        .frame(minWidth: menu.points("self.min-width"), alignment: .leading)
        .metalObjectRecipe(menu, part: "self", in: shape)
        .background {
            if reduceTransparency { shape.fill(colorway.tokens.frostOpaque.color) } else {
                MetalBackdropView(backdrop: MetalBackdrop(
                    blur: menu.filterNumber("self.blur", function: "blur") ?? .zero,
                    saturation: menu.filterNumber("self.blur", function: "saturate") ?? .one,
                    dark: colorway == .graphite)).clipShape(shape)
            }
        }
        .metalAnimation(.settle, value: active)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    @ViewBuilder private var searchField: some View {
        let field = MetalField("\(words.search) \(label)", text: specimen.map { .constant($0.query) } ?? $query, prompt: words.search,
                               size: .regular, icon: .search) { EmptyView() }
        // Headless captures can't draw a text field: the field draws its text and caret itself.
        if let specimen { field.snapshot(focused: true).id(specimen.query) } else { field }
    }

    /// A column's rows scroll past the recipe's rows; a headless capture draws them flat (it can't draw a scroll view).
    @ViewBuilder private func scrolling<Content: View>(height: Double, @ViewBuilder _ content: () -> Content) -> some View {
        if specimen != nil {
            VStack(alignment: .leading, spacing: .zero) { content() }.frame(height: height, alignment: .top).clipped()
        } else {
            ScrollView { LazyVStack(alignment: .leading, spacing: .zero) { content() } }
                .scrollIndicators(.never)
                .frame(height: height)
        }
    }

    private var divider: some View {
        let menu = MetalRecipes.menu
        return Color.clear.frame(width: menu.points("sep.thickness"))
            .metalObjectRecipe(menu, part: "sep", in: Rectangle())
            .padding(.horizontal, menu.points("sep.inset-y"))
            .frame(maxHeight: .infinity)
    }

    private func quiet(_ text: String) -> some View {
        let menu = MetalRecipes.menu
        return Text(text)
            .font(.metal(MetalType.ui))
            .foregroundColor(colorway.tokens.ink3.color)
            .padding(.horizontal, menu.points("row.pad"))
            .padding(.vertical, menu.points("heading.pad-bottom"))
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func column(_ c: Column, at k: Int, here: Int, index: [String: Node]) -> some View {
        let menu = MetalRecipes.menu
        let rows = c.failed ? 1 : Swift.max(c.items.count, 1)
        let tallest = MetalRecipes.cascader.scalar("self.max-rows") * menu.points("row.height")
        return scrolling(height: Swift.min(Double(rows) * menu.points("row.height"), tallest)) {
                if c.failed {
                    retryRow(c, at: k, on: active == Self.retry + c.id)
                } else if c.items.isEmpty {
                    quiet(words.empty)
                } else {
                    ForEach(c.items) { item in
                        MetalCascaderRow(
                            item: item, where: nil, query: "", work: loads[item.id] ?? .idle,
                            highlighted: active == item.id && k == here,
                            on: k < trail.count && trail[k] == item.id && columns(index).count > k + 1,
                            chosen: !multiple && values.contains(item.id),
                            box: multiple ? (isOn(item.id, index), isMixed(item.id, index), blocked(item.id, index)) : nil)
                            .onTapGesture { press(item.id, at: k, enter: false) }
                            .onHover { if $0 && !item.disabled { activeState = item.id; colState = k } }
                            .accessibilityAction { press(item.id, at: k, enter: false) }
                    }
                }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(c.parent?.label ?? label)
    }

    private func retryRow(_ c: Column, at k: Int, on: Bool) -> some View {
        let menu = MetalRecipes.menu
        return HStack(spacing: menu.points("row.gap")) {
            MetalIcon(.syncError, size: menu.points("row.glyph")).foregroundStyle(colorway.tokens.ink2.color)
            Text(words.failed).foregroundColor(colorway.tokens.ink.color)
            Spacer(minLength: .zero)
            Text(words.retry).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
        }
        .font(menu.font("row.font"))
        .padding(.horizontal, menu.points("row.pad"))
        .frame(height: menu.points("row.height"))
        .background { if on { MetalListGlide() } }
        .contentShape(Rectangle())
        .onTapGesture { press(Self.retry + c.id, at: k, enter: false) }
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }

    @ViewBuilder private func results(_ index: [String: Node]) -> some View {
        let menu = MetalRecipes.menu
        let all = matches(index)
        let shown = Array(all.prefix(limit))
        let live = shown.filter { !$0.item.disabled }.map(\.item.id)
        let current = active.flatMap { live.contains($0) ? $0 : nil } ?? live.first
        let tallest = MetalRecipes.cascader.scalar("self.max-rows") * menu.points("row.height")
        if shown.isEmpty {
            quiet("\(words.noMatches) \u{201C}\(q)\u{201D}")
        } else {
            let rowHeight = menu.points("row.height") + MetalRecipes.combobox.points("detail.pad-y") * 2
            scrolling(height: Swift.min(Double(shown.count + (all.count > shown.count ? 1 : 0)) * rowHeight, tallest)) {
                    ForEach(shown, id: \.item.id) { node in
                        MetalCascaderRow(
                            item: node.item, where: node.path.dropLast().map(\.label).joined(separator: " › "), query: q,
                            work: .idle, highlighted: current == node.item.id, on: false,
                            chosen: !multiple && values.contains(node.item.id),
                            box: multiple ? (isOn(node.item.id, index), isMixed(node.item.id, index), blocked(node.item.id, index)) : nil)
                            .onTapGesture { if multiple { tick(node.item.id, index) } else { chooseOne(node.item.id) } }
                            .onHover { if $0 && !node.item.disabled { activeState = node.item.id } }
                    }
                    if all.count > shown.count { quiet("\(all.count - shown.count) more") }
            }
        }
    }

    /// For headless captures: the plate drawn open under the well with `trail` opened and `active` highlighted.
    func specimen(trail: [String], active: String?, query: String = "") -> Self {
        var copy = self
        copy.specimen = (trail, active, query)
        return copy
    }
}

/// One row: its own wait clock, so each loading level keeps its own time.
private struct MetalCascaderRow: View {
    let item: MetalTreeItem
    /// A search match's path, in a second line.
    let `where`: String?
    let query: String
    let work: MetalWork
    let highlighted: Bool
    /// The row its column opened: the option's raised plate.
    let on: Bool
    let chosen: Bool
    let box: (on: Bool, mixed: Bool, blocked: Bool)?

    @Environment(\.metalColorway) private var colorway
    @State private var wait = MetalWait()

    var body: some View {
        let menu = MetalRecipes.menu
        let row = MetalRecipes.row
        let shape = RoundedRectangle(cornerRadius: menu.points("row.radius"), style: .continuous)
        let detail = `where` != nil
        HStack(spacing: menu.points("row.gap")) {
            if let box {
                MetalDimple(isOn: .constant(box.on), mixed: box.mixed, size: .row, label: item.label)
                    .disabled(item.disabled || (box.blocked && !box.on))
                    .allowsHitTesting(false)
            }
            if let icon = item.icon { MetalIcon(icon, size: menu.points("row.glyph")).foregroundStyle(colorway.tokens.ink2.color) }
            VStack(alignment: .leading, spacing: MetalRecipes.combobox.points("detail.gap")) {
                matched.font(menu.font("row.font")).lineLimit(1)
                if let place = `where` {
                    Text(place).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if let trail = item.trail { Text(trail).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color) }
            if chosen { MetalIcon(.check, size: menu.points("row.glyph")).foregroundStyle(colorway.tokens.ink2.color) }
            if item.isBranch && !detail {
                ZStack {
                    if work == .failed && !wait.showing {
                        MetalIcon(.syncError, size: MetalRecipes.tree.points("chevron.size"))
                    } else {
                        MetalIcon(.chevron, size: MetalRecipes.tree.points("chevron.size"))
                            .rotationEffect(.degrees(-90))
                            .opacity(wait.showing ? .zero : .one)
                    }
                    if wait.phase != .idle && wait.phase != .failed {
                        MetalSpinner(size: .small, label: "Loading \(item.label)", phase: wait.phase) { EmptyView() }
                    }
                }
                .foregroundStyle(colorway.tokens.ink2.color)
                .frame(width: MetalRecipes.tree.points("regular.indent"))
            }
        }
        .padding(.horizontal, menu.points("row.pad"))
        .padding(.vertical, detail ? MetalRecipes.combobox.points("detail.pad-y") : .zero)
        .frame(minHeight: menu.points("row.height"))
        .background {
            if on { Color.clear.metalObjectRecipe(row, part: "option", state: "on", in: shape) }
            if highlighted { MetalListGlide() }
        }
        .contentShape(Rectangle())
        .opacity(item.disabled ? menu.scalar("row.disabled") : .one)
        .metalWait(work == .working ? .working : .idle, into: $wait)
        .metalWaitSaid(wait.phase, label: "Loading \(item.label)")
        .accessibilityElement(children: .combine)
        .accessibilityLabel(item.label)
        .accessibilityValue(work == .failed ? "Couldn’t load" : box.map { $0.on ? "on" : $0.mixed ? "mixed" : "off" } ?? "")
        .accessibilityAddTraits((box?.on ?? chosen) ? [.isButton, .isSelected] : [.isButton])
    }

    /// The label with the typed letters in ink and the rest in ink2.
    private var matched: Text {
        let ink = colorway.tokens.ink.color
        guard !query.isEmpty, let range = item.label.range(of: query, options: [.caseInsensitive, .diacriticInsensitive]) else {
            return Text(item.label).foregroundColor(ink)
        }
        let rest = colorway.tokens.ink2.color
        return Text(item.label[..<range.lowerBound]).foregroundColor(rest)
            + Text(item.label[range]).foregroundColor(ink)
            + Text(item.label[range.upperBound...]).foregroundColor(rest)
    }
}
