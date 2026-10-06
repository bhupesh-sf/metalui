import SwiftUI

// COMBOBOX, type to find one of many (combobox.agent.md), in step with the web:
//   well      the field's (MetalField: sizes, rings, the search glyph, mini keys); several values draw the
//             same well around chips that wrap a line at a time
//   plate     the menu's frosted plate under the well, as wide as it; its height settles to the matches
//   rows      the menu's rows under one gliding highlight (MetalListGlide); the typed letters in ink, the
//             rest in ink2; a glyph or an avatar and a second line; the chosen row ends in a check
//   groups    engraved labels pinned to the plate's top while their rows scroll; Recent before typing
//   last      behind hairlines: Create "…" (plus), then commands with their glyphs
//   empties   loading (the spinner's ring in the clear key's place, rows dimmed), failed (sync-error,
//             Couldn't load, Try again), nothing matched (the query said back)
//   button    trigger: .button, a raised cap with the pick and a chevron; the plate opens over the page
//             with the search well at its top
// Every number is the combobox, field, menu, chip or spinner recipe's. Reduce Motion: the height snaps, chips
// come and go at once, the chevron turns at once; fades stay.

/// One thing that can be found.
public struct MetalComboboxItem: Identifiable, Sendable {
    public let value: String
    public let label: String
    /// A second line in ink2, so similar items can be told apart.
    public let description: String?
    /// A glyph before the label; once picked it stands in the well's leading slot.
    public let icon: MetalIconName?
    /// A person: their avatar leads the row.
    public let person: String?
    public let disabled: Bool
    public var id: String { value }

    public init(_ value: String, label: String? = nil, description: String? = nil, icon: MetalIconName? = nil,
                person: String? = nil, disabled: Bool = false) {
        self.value = value
        self.label = label ?? value
        self.description = description
        self.icon = icon
        self.person = person
        self.disabled = disabled
    }
}

/// Items under an engraved label.
public struct MetalComboboxGroup: Sendable {
    public let label: String
    public let items: [MetalComboboxItem]

    public init(_ label: String, items: [MetalComboboxItem]) {
        self.label = label
        self.items = items
    }
}

/// A command row after the items ("Manage labels…"): it runs and closes the plate; it never becomes the value.
public struct MetalComboboxAction: Identifiable {
    public let id: String
    public let label: String
    public let icon: MetalIconName
    public let action: () -> Void

    public init(_ label: String, icon: MetalIconName, id: String? = nil, action: @escaping () -> Void) {
        self.id = id ?? label
        self.label = label
        self.icon = icon
        self.action = action
    }
}

/// Where the combobox is typed into: its own well, or a search inside the plate a button opens.
public enum MetalComboboxTrigger: Sendable { case field, button }

/// Type to find one of many, or several.
public struct MetalCombobox: View {
    let label: String
    @Binding var selections: [String]
    let multiple: Bool
    let groups: [MetalComboboxGroup]
    let prompt: String
    let size: MetalFieldSize
    let invalid: Bool
    let queryBinding: Binding<String>?
    let filter: Bool
    let loading: Bool
    let failed: Bool
    let onRetry: (() -> Void)?
    let recent: [String]
    let onCreate: ((String) -> String?)?
    let actions: [MetalComboboxAction]
    let trigger: MetalComboboxTrigger
    /// Headless captures: the plate drawn open under the well, at this query and highlight.
    var specimen: (query: String, highlighted: Int?)? = nil

    @Environment(\.metalColorway) private var colorway
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var ownQuery = ""
    @State private var open = false
    @State private var highlighted: Int?
    @State private var armed = false
    @State private var wait = MetalWait()
    @State private var listHeight: Double = .zero
    @FocusState private var typing: Bool
    @Namespace private var glide

    /// One value. Pass `items`, `groups` or both (items first, unlabelled).
    public init(_ label: String, selection: Binding<String?>, items: [MetalComboboxItem] = [], groups: [MetalComboboxGroup] = [],
                prompt: String = "", size: MetalFieldSize = .regular, invalid: Bool = false, query: Binding<String>? = nil,
                filter: Bool = true, loading: Bool = false, failed: Bool = false, onRetry: (() -> Void)? = nil,
                recent: [String] = [], onCreate: ((String) -> String?)? = nil, actions: [MetalComboboxAction] = [],
                trigger: MetalComboboxTrigger = .field) {
        self.init(label, selections: Binding(get: { selection.wrappedValue.map { [$0] } ?? [] },
                                             set: { selection.wrappedValue = $0.last }),
                  multiple: false, items: items, groups: groups, prompt: prompt, size: size, invalid: invalid, query: query,
                  filter: filter, loading: loading, failed: failed, onRetry: onRetry, recent: recent, onCreate: onCreate,
                  actions: actions, trigger: trigger)
    }

    /// Several values: chosen ones are chips in the well.
    public init(_ label: String, selections: Binding<[String]>, items: [MetalComboboxItem] = [], groups: [MetalComboboxGroup] = [],
                prompt: String = "", size: MetalFieldSize = .regular, invalid: Bool = false, query: Binding<String>? = nil,
                filter: Bool = true, loading: Bool = false, failed: Bool = false, onRetry: (() -> Void)? = nil,
                recent: [String] = [], onCreate: ((String) -> String?)? = nil, actions: [MetalComboboxAction] = [],
                trigger: MetalComboboxTrigger = .field) {
        self.init(label, selections: selections, multiple: true, items: items, groups: groups, prompt: prompt, size: size,
                  invalid: invalid, query: query, filter: filter, loading: loading, failed: failed, onRetry: onRetry,
                  recent: recent, onCreate: onCreate, actions: actions, trigger: trigger)
    }

    private init(_ label: String, selections: Binding<[String]>, multiple: Bool, items: [MetalComboboxItem], groups: [MetalComboboxGroup],
                 prompt: String, size: MetalFieldSize, invalid: Bool, query: Binding<String>?, filter: Bool, loading: Bool,
                 failed: Bool, onRetry: (() -> Void)?, recent: [String], onCreate: ((String) -> String?)?,
                 actions: [MetalComboboxAction], trigger: MetalComboboxTrigger) {
        self.label = label
        self._selections = selections
        self.multiple = multiple
        self.groups = (items.isEmpty ? [] : [MetalComboboxGroup("", items: items)]) + groups
        self.prompt = prompt
        self.size = size == .large ? .regular : size
        self.invalid = invalid
        self.queryBinding = query
        self.filter = filter
        self.loading = loading
        self.failed = failed
        self.onRetry = onRetry
        self.recent = recent
        self.onCreate = onCreate
        self.actions = actions
        self.trigger = trigger
    }

    // MARK: what the plate shows

    private enum Kind { case item, create, action, retry }
    private struct Row: Identifiable {
        let kind: Kind
        let id: String
        let label: String
        var description: String?
        var icon: MetalIconName?
        var person: String?
        var disabled = false
        var item: MetalComboboxItem?
    }
    private struct Section: Identifiable {
        let id: String
        var label: String?
        var apart = false
        var more = 0
        var rows: [Row]
    }

    private var query: Binding<String> { queryBinding ?? $ownQuery }
    private var shownQuery: String { specimen?.query ?? query.wrappedValue }
    private var allItems: [MetalComboboxItem] { groups.flatMap(\.items) }
    private func item(_ value: String) -> MetalComboboxItem? { allItems.first { $0.value == value } }
    private func labelOf(_ value: String?) -> String { value.map { item($0)?.label ?? $0 } ?? "" }
    /// How many matches are drawn (the web's `limit`); past it a quiet line says how many more.
    private let limit = 100

    /// The query that filters: a single pick shown in its own well is not a query.
    private var q: String {
        let trimmed = shownQuery.trimmingCharacters(in: .whitespaces)
        if !multiple && trigger == .field, let first = selections.first, trimmed == labelOf(first) { return "" }
        return trimmed
    }

    private func toRow(_ item: MetalComboboxItem) -> Row {
        Row(kind: .item, id: item.value, label: item.label, description: item.description, icon: item.icon, person: item.person,
            disabled: item.disabled, item: item)
    }

    private var sections: [Section] {
        var out: [Section] = []
        if failed {
            out.append(Section(id: "failed", rows: [Row(kind: .retry, id: "\u{0}retry", label: "Couldn\u{2019}t load", icon: .syncError)]))
        } else {
            let recentRows = q.isEmpty ? recent.compactMap(item) : []
            if !recentRows.isEmpty { out.append(Section(id: "recent", label: "Recent", rows: recentRows.map(toRow))) }
            let skip = Set(recentRows.map(\.value))
            var shown = 0
            var more = 0
            for group in groups {
                let matches = group.items.filter { !skip.contains($0.value) && (q.isEmpty || !filter || $0.label.localizedCaseInsensitiveContains(q)) }
                let take = Array(matches.prefix(max(.zero, limit - shown)))
                more += matches.count - take.count
                shown += take.count
                if !take.isEmpty { out.append(Section(id: "group:\(group.label)", label: group.label.isEmpty ? nil : group.label, rows: take.map(toRow))) }
            }
            if more > .zero, let last = out.indices.last { out[last].more = more }
            let exact = allItems.contains { $0.label.localizedCaseInsensitiveCompare(q) == .orderedSame }
            if onCreate != nil && !q.isEmpty && !exact {
                out.append(Section(id: "create", apart: !out.isEmpty, rows: [Row(kind: .create, id: "\u{0}create", label: "Create \u{201C}\(q)\u{201D}", icon: .plus)]))
            }
        }
        if !actions.isEmpty {
            out.append(Section(id: "actions", apart: !out.isEmpty, rows: actions.map { Row(kind: .action, id: "\u{0}action:\($0.id)", label: $0.label, icon: $0.icon) }))
        }
        return out
    }

    private var flat: [Row] { sections.flatMap(\.rows) }
    private var matched: Bool { flat.contains { $0.kind == .item } }
    private var quiet: String? {
        if failed || matched { return nil }
        if wait.busy { return wait.showing ? "Searching\u{2026}" : nil }
        return q.isEmpty ? nil : "No matches for \u{201C}\(q)\u{201D}"
    }

    // MARK: acting

    private func choose(_ row: Row) {
        switch row.kind {
        case .retry:
            onRetry?()
        case .action:
            actions.first { "\u{0}action:\($0.id)" == row.id }?.action()
            close()
        case .create:
            guard let made = onCreate?(q) else { return close() }
            if multiple { add(made); query.wrappedValue = "" } else { selections = [made]; query.wrappedValue = labelOf(made); close() }
        case .item:
            guard !row.disabled else { return }
            if multiple {
                if selections.contains(row.id) { remove(row.id) } else { add(row.id) }
            } else {
                selections = [row.id]
                if trigger == .field { query.wrappedValue = row.label }
                close()
            }
        }
    }

    private func add(_ value: String) {
        withMetalAnimation(.object, reduceMotion: reduceMotion) { selections.append(value) }
    }

    private func remove(_ value: String) {
        armed = false
        withMetalAnimation(.release, reduceMotion: reduceMotion) { selections.removeAll { $0 == value } }
    }

    private func close() {
        open = false
        highlighted = nil
    }

    private func move(_ step: Int) -> KeyPress.Result {
        let rows = flat
        let live = rows.indices.filter { !rows[$0].disabled }
        guard !live.isEmpty else { return .handled }
        if !open { open = true }
        guard let at = highlighted, let index = live.firstIndex(of: at) else {
            highlighted = step > .zero ? live.first : live.last
            return .handled
        }
        highlighted = live[min(max(index + step, .zero), live.count - 1)]
        return .handled
    }

    private func enter() -> KeyPress.Result {
        guard open, let at = highlighted, flat.indices.contains(at) else { return .ignored }
        choose(flat[at])
        return .handled
    }

    /// Several values: Backspace on an empty query takes the last chip; a second Backspace removes it.
    private func backspace() -> KeyPress.Result {
        guard multiple, query.wrappedValue.isEmpty, let last = selections.last else { return .ignored }
        if armed { remove(last) } else { armed = true }
        return .handled
    }

    // MARK: body

    public var body: some View {
        Group {
            if specimen != nil { specimenView } else if trigger == .button { cap } else { fieldForm }
        }
        .metalWait(loading ? .working : .idle, into: $wait)
        .metalWaitSaid(wait.phase, label: "Searching")
    }

    private var fieldForm: some View {
        well
            .onKeyPress(.downArrow) { move(1) }
            .onKeyPress(.upArrow) { move(-1) }
            .onKeyPress(.return) { enter() }
            .onKeyPress(.escape) {
                guard open else { return .ignored }
                close()
                return .handled
            }
            .onKeyPress(.delete) { backspace() }
            .onChange(of: query.wrappedValue) { _, new in
                armed = false
                highlighted = nil
                if !new.isEmpty && new != labelOf(selections.first) { open = true }
            }
            .overlay(alignment: .bottomLeading) {
                if open && specimen == nil {
                    plate
                        .fixedSize(horizontal: false, vertical: true)
                        .alignmentGuide(.bottom) { $0[.top] - MetalMenuMetrics.offset }
                        .transition(.opacity)
                }
            }
            .metalAnimation(.settle, value: open)
            .zIndex(open ? .one : .zero)
    }

    /// For captures: the well with the plate drawn under it.
    private var specimenView: some View {
        VStack(alignment: .leading, spacing: MetalMenuMetrics.offset) {
            if trigger == .button { cap } else { well }
            if specimen != nil { plate }
        }
    }

    @ViewBuilder private var well: some View {
        if multiple { chipsWell } else { singleWell }
    }

    private var fieldPart: String { size == .compact ? "compact" : "regular" }
    private var pickIcon: MetalIconName? { multiple ? nil : selections.first.flatMap { item($0)?.icon } }
    private var clearable: Bool { !selections.isEmpty || !shownQuery.isEmpty }

    private var singleWell: some View {
        let text = specimen.map { .constant($0.query) } ?? query
        let field = MetalField(label, text: text, prompt: prompt, size: size, icon: pickIcon ?? .search, invalid: invalid) { keys }
        return Group {
            if let specimen { field.snapshot(focused: specimen.query.isEmpty == false) } else { field }
        }
        .frame(minWidth: MetalRecipes.combobox.points("self.min-width"))
        .accessibilityAddTraits(.isSearchField)
        .accessibilityValue(labelOf(selections.first))
    }

    /// The trail: the clear key (the ring stands in its place while a search runs) and the chevron.
    private var keys: some View {
        HStack(spacing: MetalRecipes.field.points("key.gap")) {
            ZStack {
                MetalFieldKey("Clear", icon: .close) {
                    withMetalAnimation(.release, reduceMotion: reduceMotion) { selections = [] }
                    query.wrappedValue = ""
                    armed = false
                }
                .metalPresence(clearable && !wait.showing, pop: MetalRecipes.field.scalar("key.pop"))
                if wait.showing {
                    MetalSpinner(label: "Searching", phase: wait.phase) { EmptyView() }
                        .foregroundStyle(colorway.tokens.ink2.color)
                }
            }
            MetalFieldKey(open ? "Hide list" : "Show all", icon: .chevron) { open ? close() : (open = true) }
                .rotationEffect(.degrees(open ? 180 : .zero))
                .metalAnimation(.settle, value: open)
        }
    }

    private var chipsWell: some View {
        let field = MetalRecipes.field
        let combobox = MetalRecipes.combobox
        let line = MetalRecipes.chip.points("suggestion.height")
        let height = field.points("\(fieldPart).height")
        let inset = (height - line) / 2 // the chip line centred in the well's single-line height
        let shape = RoundedRectangle(cornerRadius: field.points("\(fieldPart).radius"), style: .continuous)
        let hint = field.color("field.hint", colorway: MetalRecipeColorway(colorway))?.color ?? colorway.tokens.ink3.color
        return HStack(alignment: .top, spacing: field.points("\(fieldPart).gap")) {
            MetalIcon(.search, size: field.points("\(fieldPart).glyph"))
                .foregroundStyle(hint)
                .frame(height: line)
            MetalComboboxFlow(spacing: combobox.points("chips.gap")) {
                ForEach(Array(selections.enumerated()), id: \.element) { index, value in
                    chip(value, armed: armed && index == selections.count - 1)
                }
                chipsInput(hint: hint)
                    .frame(minWidth: combobox.points("chips.input-min"), maxWidth: .infinity, alignment: .leading)
                    .frame(height: line)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            keys.frame(height: line)
        }
        .padding(.leading, field.points("\(fieldPart).pad-left"))
        .padding(.trailing, field.points("\(fieldPart).pad-right"))
        .padding(.vertical, inset)
        .frame(minWidth: combobox.points("self.min-width"), minHeight: height)
        .contentShape(shape)
        .onTapGesture { typing = true }
        .background { MetalWell(.field, radius: field.points("\(fieldPart).radius")) { Color.clear } }
        .overlay {
            if invalid { shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth).allowsHitTesting(false) }
            if (typing || specimen != nil) && isEnabled {
                shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth).allowsHitTesting(false)
            }
        }
        .opacity(isEnabled ? .one : field.scalar("state.disabled"))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    @ViewBuilder private func chipsInput(hint: Color) -> some View {
        let ink = MetalRecipes.field.color("field.ink", colorway: MetalRecipeColorway(colorway))?.color ?? colorway.tokens.ink.color
        if let specimen {
            Text(specimen.query.isEmpty && selections.isEmpty ? prompt : specimen.query)
                .foregroundColor(specimen.query.isEmpty ? hint : ink)
                .font(.metal(MetalType.ui))
                .lineLimit(1)
        } else {
            TextField("", text: query, prompt: Text(selections.isEmpty ? prompt : "").foregroundColor(hint))
                .textFieldStyle(.plain)
                .font(.metal(MetalType.ui))
                .foregroundColor(ink)
                .tint(MetalRecipes.field.color("field.caret")?.color ?? MetalShared.greenDeep.color)
                .focused($typing)
                .accessibilityLabel(label)
        }
    }

    private func chip(_ value: String, armed: Bool) -> some View {
        let recipe = MetalRecipes.chip
        let name = labelOf(value)
        let shape = Capsule(style: .continuous)
        return HStack(spacing: recipe.points("suggestion.gap")) {
            Text(name).lineLimit(1)
            MetalIconButton("Remove \(name)", variant: .mini, action: { remove(value) }) {
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
        .overlay { if armed { shape.inset(by: -MetalRing.focusWidth / 2).stroke(MetalShared.focus.color, lineWidth: MetalRing.focusWidth) } }
        .fixedSize()
        .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: -MetalRadius.nest)),
                                removal: .opacity.combined(with: .offset(y: MetalRadius.nest))))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(name)
    }

    // MARK: from a button

    private var cap: some View {
        let select = MetalRecipes.select
        let button = MetalRecipes.button
        let combobox = MetalRecipes.combobox
        let key = size == .compact ? "compact" : "regular"
        let part = size == .compact ? "compact" : "self"
        let shape = Capsule(style: .continuous)
        let said = selections.map(labelOf).joined(separator: ", ")
        let lead = multiple ? nil : selections.first.flatMap(item)
        return Button { open = true } label: {
            HStack(spacing: select.points("\(key).gap")) {
                if let lead { rowLead(icon: lead.icon, person: lead.person) }
                Text(said.isEmpty ? prompt : said)
                    .foregroundColor((said.isEmpty ? colorway.tokens.ink3 : colorway.tokens.ink).color)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: .leading)
                MetalIcon(.chevron, size: select.points("chevron.size"))
                    .foregroundColor(colorway.tokens.ink2.color)
                    .rotationEffect(.degrees(open ? 180 : .zero))
                    .accessibilityHidden(true)
            }
            .font(select.font("\(key).font"))
            .padding(.leading, select.points("\(key).pad-left"))
            .padding(.trailing, select.points("\(key).pad-right"))
            .frame(minWidth: combobox.points("button.min-width"), maxWidth: combobox.points("button.max-width"))
            .frame(height: select.points("\(key).height"))
            .fixedSize()
            .contentShape(shape)
        }
        .buttonStyle(.plain)
        .background {
            ZStack {
                Color.clear.metalObjectRecipe(button, part: part, in: shape).opacity(open ? .zero : .one)
                Color.clear.metalObjectRecipe(button, part: part, state: "pressed", in: shape).opacity(open ? .one : .zero)
            }
        }
        .overlay { if invalid { shape.strokeBorder(colorway.tokens.invalid.color, lineWidth: MetalRing.invalidWidth) } }
        .offset(y: open ? button.points("self.travel") : .zero)
        .metalAnimation(.release, value: open)
        .opacity(isEnabled ? .one : button.scalar("self.disabled"))
        .accessibilityLabel(label)
        .accessibilityValue(said)
        .popover(isPresented: $open, arrowEdge: .bottom) {
            plate
                .onAppear { query.wrappedValue = "" }
                .onKeyPress(.downArrow) { move(1) }
                .onKeyPress(.upArrow) { move(-1) }
                .onKeyPress(.return) { enter() }
        }
    }

    // MARK: the plate

    var plate: some View {
        let menu = MetalRecipes.menu
        let combobox = MetalRecipes.combobox
        let shape = RoundedRectangle(cornerRadius: menu.points("self.radius"), style: .continuous)
        let tallest = combobox.scalar("self.max-rows") * menu.points("row.height")
        return VStack(alignment: .leading, spacing: .zero) {
            if trigger == .button {
                MetalField("Search \(label)", text: query, prompt: "Search", size: .regular, icon: .search) {
                    if wait.showing { MetalSpinner(label: "Searching", phase: wait.phase) { EmptyView() } }
                }
                .padding(.bottom, menu.points("self.pad"))
            }
            Group {
                if specimen != nil {
                    list(pinned: false)
                } else {
                    ScrollViewReader { proxy in
                        ScrollView { list(pinned: true).background { measure } }
                            .frame(height: min(listHeight, tallest))
                            .onChange(of: highlighted) { _, new in
                                guard let new, flat.indices.contains(new) else { return }
                                proxy.scrollTo(flat[new].id)
                            }
                    }
                }
            }
            .metalWaitDim(wait.showing && matched)
        }
        .padding(menu.points("self.pad"))
        .frame(minWidth: trigger == .button ? combobox.points("button.plate") : menu.points("self.min-width"),
               maxWidth: trigger == .button ? nil : .infinity, alignment: .leading)
        .metalObjectRecipe(menu, part: "self", in: shape)
        .background {
            if reduceTransparency { shape.fill(colorway.tokens.frostOpaque.color) } else {
                MetalBackdropView(backdrop: MetalBackdrop(
                    blur: menu.filterNumber("self.blur", function: "blur") ?? .zero,
                    saturation: menu.filterNumber("self.blur", function: "saturate") ?? .one,
                    dark: colorway == .graphite)).clipShape(shape)
            }
        }
        .metalAnimation(.settle, value: highlighted)
        .metalAnimation(.settle, value: listHeight)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    /// The list's own height, so the plate settles to it (up to max-rows).
    private var measure: some View {
        GeometryReader { geo in
            Color.clear
                .onAppear { listHeight = geo.size.height }
                .onChange(of: geo.size.height) { _, new in listHeight = new }
        }
    }

    private func list(pinned: Bool) -> some View {
        let rows = flat
        let index = Dictionary(uniqueKeysWithValues: rows.enumerated().map { ($1.id, $0) })
        let at = specimen?.highlighted ?? highlighted
        return LazyVStack(alignment: .leading, spacing: .zero, pinnedViews: pinned ? [.sectionHeaders] : []) {
            if let quiet { quietLine(quiet) }
            ForEach(sections) { section in
                if section.apart { separator }
                SwiftUI.Section {
                    ForEach(section.rows) { row in
                        rowView(row, on: index[row.id] == at).id(row.id)
                            .onHover { if $0 && !row.disabled { highlighted = index[row.id] } }
                            .onTapGesture { choose(row) }
                    }
                    if section.more > .zero { quietLine("\(section.more) more \(section.more == 1 ? "match" : "matches"); type to narrow") }
                } header: {
                    if let label = section.label { groupLabel(label) }
                }
            }
        }
    }

    private func groupLabel(_ text: String) -> some View {
        let menu = MetalRecipes.menu
        return MetalLabel(text, style: .engraved)
            .padding(.top, menu.points("heading.pad-top"))
            .padding(.horizontal, menu.points("heading.pad-x"))
            .padding(.bottom, menu.points("heading.pad-bottom"))
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(colorway.tokens.frostOpaque.color)
            .accessibilityAddTraits(.isHeader)
    }

    private var separator: some View {
        let menu = MetalRecipes.menu
        return Color.clear.frame(height: menu.points("sep.thickness"))
            .metalObjectRecipe(menu, part: "sep", in: Rectangle())
            .padding(.vertical, menu.points("sep.inset-y"))
            .padding(.horizontal, menu.points("sep.inset-x"))
    }

    private func quietLine(_ text: String) -> some View {
        let menu = MetalRecipes.menu
        return Text(text)
            .font(.metal(MetalType.ui))
            .foregroundColor(colorway.tokens.ink3.color)
            .padding(.horizontal, menu.points("row.pad"))
            .padding(.vertical, menu.points("heading.pad-bottom"))
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    @ViewBuilder private func rowLead(icon: MetalIconName?, person: String?) -> some View {
        let menu = MetalRecipes.menu
        if let person {
            let avatar = MetalRecipes.avatar
            MetalAvatar(name: person)
                .scaleEffect(avatar.points("size.small") / avatar.points("size.regular"))
                .frame(width: avatar.points("size.small"), height: avatar.points("size.small"))
        } else if let icon {
            MetalIcon(icon, size: menu.points("row.glyph")).foregroundColor(colorway.tokens.ink2.color)
        }
    }

    /// The label with the typed letters in ink and the rest in ink2.
    private func matchedText(_ label: String) -> Text {
        let ink = colorway.tokens.ink.color
        guard !q.isEmpty, let range = label.range(of: q, options: [.caseInsensitive, .diacriticInsensitive]) else {
            return Text(label).foregroundColor(ink)
        }
        let rest = colorway.tokens.ink2.color
        return Text(label[..<range.lowerBound]).foregroundColor(rest)
            + Text(label[range]).foregroundColor(ink)
            + Text(label[range.upperBound...]).foregroundColor(rest)
    }

    private func rowView(_ row: Row, on: Bool) -> some View {
        let menu = MetalRecipes.menu
        let combobox = MetalRecipes.combobox
        let detail = row.description != nil
        return HStack(spacing: menu.points("row.gap")) {
            rowLead(icon: row.icon, person: row.person)
            VStack(alignment: .leading, spacing: combobox.points("detail.gap")) {
                (row.kind == .item ? matchedText(row.label) : Text(row.label).foregroundColor(colorway.tokens.ink.color))
                    .font(menu.font("row.font"))
                    .lineLimit(1)
                if let description = row.description {
                    Text(description).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if row.kind == .retry {
                Text("Try again").font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
            }
            if row.kind == .item && selections.contains(row.id) {
                MetalIcon(.check, size: menu.points("row.glyph")).foregroundColor(colorway.tokens.ink2.color)
            }
        }
        .padding(.horizontal, menu.points("row.pad"))
        .padding(.vertical, detail ? combobox.points("detail.pad-y") : .zero)
        .frame(minHeight: menu.points("row.height"))
        .background {
            if on { MetalListGlide().matchedGeometryEffect(id: "highlight", in: glide) }
        }
        .contentShape(Rectangle())
        .opacity(row.disabled ? menu.scalar("row.disabled") : .one)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(selections.contains(row.id) ? [.isButton, .isSelected] : [.isButton])
        .accessibilityAction { choose(row) }
    }

    /// For headless captures: the plate drawn open under the well at `query`, with row `highlighted` lit.
    func specimen(query: String, highlighted: Int? = nil) -> Self {
        var copy = self
        copy.specimen = (query, highlighted)
        return copy
    }
}

/// Chips and the query, wrapping a line at a time (the Cascader's chips use it too).
struct MetalComboboxFlow: Layout {
    let spacing: Double

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        let lines = arrange(subviews, width: width)
        let height = lines.map(\.height).reduce(.zero, +) + spacing * Double(max(.zero, lines.count - 1))
        return CGSize(width: proposal.width ?? lines.map(\.width).max() ?? .zero, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var y = bounds.minY
        for line in arrange(subviews, width: bounds.width) {
            var x = bounds.minX
            for (index, size) in line.items {
                // The last item on a line (the query) takes the rest of it.
                let last = index == subviews.count - 1
                let width = last ? max(size.width, bounds.maxX - x) : size.width
                subviews[index].place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(width: width, height: size.height))
                x += width + spacing
            }
            y += line.height + spacing
        }
    }

    private struct Line { var items: [(Int, CGSize)] = []; var width: Double = .zero; var height: Double = .zero }

    private func arrange(_ subviews: Subviews, width: Double) -> [Line] {
        var lines = [Line()]
        for (index, subview) in subviews.enumerated() {
            let size = subview.sizeThatFits(.unspecified)
            let needed = lines[lines.count - 1].items.isEmpty ? size.width : lines[lines.count - 1].width + spacing + size.width
            if needed > width && !lines[lines.count - 1].items.isEmpty { lines.append(Line()) }
            var line = lines.removeLast()
            line.width = line.items.isEmpty ? size.width : line.width + spacing + size.width
            line.height = max(line.height, size.height)
            line.items.append((index, size))
            lines.append(line)
        }
        return lines
    }
}
