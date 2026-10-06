import SwiftUI

// AUTOCOMPLETE, free text with suggestions (autocomplete.agent.md), in step with the web:
//   well        the field's (MetalField: sizes, rings, an optional leading glyph, the clear key); the text is
//               the value, always
//   completion  the rest of the best match after the text, in ink3 and the field's own type; Tab or → takes it.
//               Only while the plate is open, only for a suggestion whose value starts with the text
//   plate       Combobox's: the menu's frosted plate under the well, its height settling to the rows; the
//               rows under one gliding highlight, the typed letters in ink, a glyph or avatar and a second
//               line; engraved group labels pinned at the top. Rows that start with the text come first;
//               at most `limit`. Nothing matched: the plate closes
//   empties     loading (the spinner's ring in the clear key's place, rows dimmed; Searching… with none),
//               failed (sync-error, Couldn't load, Try again)
// Items and groups are Combobox's types (MetalComboboxItem, MetalComboboxGroup): `value` is written, `label`
// shown. Every number is the field, menu, combobox or spinner recipe's. Reduce Motion: the height snaps; fades stay.

/// Free text with suggestions: the text is the value; the list helps finish it.
public struct MetalAutocomplete: View {
    let label: String
    @Binding var text: String
    let groups: [MetalComboboxGroup]
    let prompt: String
    let size: MetalFieldSize
    let icon: MetalIconName?
    let invalid: Bool
    let inline: Bool
    let highlightFirst: Bool
    let filter: Bool
    let loading: Bool
    let failed: Bool
    let onRetry: (() -> Void)?
    let recent: [String]
    let limit: Int
    /// Headless captures: the plate drawn open under the well, at this text and highlight.
    var specimen: (text: String, highlighted: Int?)? = nil

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @State private var open = false
    @State private var highlighted: Int?
    /// The text just written by choosing or taking the completion: it doesn't reopen the plate.
    @State private var written: String?
    @State private var wait = MetalWait()
    @State private var listHeight: Double = .zero
    @Namespace private var glide

    /// - Parameters:
    ///   - items, groups: the suggestions (items first, unlabelled); `value` is what is written into the field.
    ///   - icon: a glyph in the well's leading slot; none by default.
    ///   - inline: the rest of the best match after the text; Tab or → takes it.
    ///   - highlightFirst: the first row is lit as you type, so ↩ takes it. Off: ↩ keeps the text.
    ///   - filter: false when the items are already the suggestions (a search you run yourself).
    ///   - recent: recent searches, shown when the plate opens on an empty field (↓).
    ///   - limit: how many suggestions are drawn; the recipe's (8) by default.
    public init(_ label: String, text: Binding<String>, items: [MetalComboboxItem] = [], groups: [MetalComboboxGroup] = [],
                prompt: String = "", size: MetalFieldSize = .regular, icon: MetalIconName? = nil, invalid: Bool = false,
                inline: Bool = true, highlightFirst: Bool = false, filter: Bool = true, loading: Bool = false,
                failed: Bool = false, onRetry: (() -> Void)? = nil, recent: [String] = [], limit: Int? = nil) {
        self.label = label
        self._text = text
        self.groups = (items.isEmpty ? [] : [MetalComboboxGroup("", items: items)]) + groups
        self.prompt = prompt
        self.size = size
        self.icon = icon
        self.invalid = invalid
        self.inline = inline
        self.highlightFirst = highlightFirst
        self.filter = filter
        self.loading = loading
        self.failed = failed
        self.onRetry = onRetry
        self.recent = recent
        self.limit = limit ?? Int(MetalRecipes.autocomplete.scalar("self.limit"))
    }

    // MARK: what the plate shows

    private struct Section: Identifiable {
        let id: String
        var label: String?
        var rows: [MetalComboboxItem]
    }

    private static let retry = MetalComboboxItem("\u{0}retry", label: "Couldn\u{2019}t load", icon: .syncError)

    private var shownText: String { specimen?.text ?? text }
    private var q: String { shownText.trimmingCharacters(in: .whitespaces) }

    private func starts(_ item: MetalComboboxItem) -> Bool {
        item.value.lowercased().hasPrefix(q.lowercased()) || item.label.lowercased().hasPrefix(q.lowercased())
    }

    private var sections: [Section] {
        if failed { return [Section(id: "failed", rows: [Self.retry])] }
        if q.isEmpty {
            guard !recent.isEmpty else { return [] }
            let known = groups.flatMap(\.items)
            return [Section(id: "recent", label: "Recent", rows: recent.map { r in known.first { $0.value == r } ?? MetalComboboxItem(r) })]
        }
        var out: [Section] = []
        var shown = 0
        for group in groups {
            let rows = group.items.filter { !filter || $0.label.localizedCaseInsensitiveContains(q) || $0.value.localizedCaseInsensitiveContains(q) }
            // An autocomplete finishes what you started: rows that start with the text come first.
            let ranked = Array((rows.filter(starts) + rows.filter { !starts($0) }).prefix(max(.zero, limit - shown)))
            shown += ranked.count
            if !ranked.isEmpty { out.append(Section(id: "group:\(group.label)", label: group.label.isEmpty ? nil : group.label, rows: ranked)) }
        }
        return out
    }

    private var flat: [MetalComboboxItem] { sections.flatMap(\.rows) }
    private var quiet: String? { !failed && flat.isEmpty && wait.showing ? "Searching\u{2026}" : nil }
    /// Nothing to suggest is not news: the plate closes and the text stays.
    private var shown: Bool { (open || specimen != nil) && (!flat.isEmpty || quiet != nil) }

    private func completes(_ item: MetalComboboxItem) -> Bool {
        !failed && !item.disabled && item.value.count > shownText.count && item.value.lowercased().hasPrefix(shownText.lowercased())
    }

    /// The highlighted row if it completes the text, else the first row that does.
    private var completion: MetalComboboxItem? {
        guard inline, shown, !shownText.isEmpty else { return nil }
        let rows = flat
        let at = specimen?.highlighted ?? highlighted
        if let at, rows.indices.contains(at), completes(rows[at]) { return rows[at] }
        return rows.first(where: completes)
    }

    // MARK: acting

    private func write(_ value: String) {
        written = value
        text = value
    }

    private func choose(_ item: MetalComboboxItem) {
        if item.value == Self.retry.value { onRetry?(); return }
        guard !item.disabled else { return }
        write(item.value)
        close()
    }

    private func take() -> KeyPress.Result {
        guard let completion else { return .ignored }
        write(completion.value)
        highlighted = nil
        return .handled
    }

    private func close() {
        open = false
        highlighted = nil
    }

    private func move(_ step: Int) -> KeyPress.Result {
        let rows = flat
        let live = rows.indices.filter { !rows[$0].disabled }
        if !open { open = true }
        guard !live.isEmpty else { return .handled }
        guard let at = highlighted, let index = live.firstIndex(of: at) else {
            highlighted = step > .zero ? live.first : live.last
            return .handled
        }
        highlighted = live[min(max(index + step, .zero), live.count - 1)]
        return .handled
    }

    private func enter() -> KeyPress.Result {
        guard shown, let at = highlighted, flat.indices.contains(at) else { return .ignored }
        choose(flat[at])
        return .handled
    }

    // MARK: body

    public var body: some View {
        Group {
            if specimen != nil {
                VStack(alignment: .leading, spacing: MetalMenuMetrics.offset) {
                    well
                    if shown { plate }
                }
            } else {
                live
            }
        }
        .metalWait(loading ? .working : .idle, into: $wait)
        .metalWaitSaid(wait.phase, label: "Searching")
    }

    private var live: some View {
        well
            .onKeyPress(.downArrow) { move(1) }
            .onKeyPress(.upArrow) { move(-1) }
            .onKeyPress(.return) { enter() }
            .onKeyPress(.tab) { take() }
            .onKeyPress(.rightArrow) { take() }
            .onKeyPress(.escape) {
                guard open else { return .ignored }
                close()
                return .handled
            }
            .onChange(of: text) { _, new in
                if new == written { written = nil; return }
                open = !new.isEmpty
                highlighted = highlightFirst && !flat.isEmpty ? .zero : nil
            }
            .overlay(alignment: .bottomLeading) {
                if shown {
                    plate
                        .fixedSize(horizontal: false, vertical: true)
                        .alignmentGuide(.bottom) { $0[.top] - MetalMenuMetrics.offset }
                        .transition(.opacity)
                }
            }
            .metalAnimation(.settle, value: shown)
            .zIndex(shown ? .one : .zero)
    }

    private var well: some View {
        let field = MetalRecipes.field
        let value = specimen.map { .constant($0.text) } ?? $text
        let form = MetalField(label, text: value, prompt: prompt, size: size, icon: icon, invalid: invalid) { keys }
        return Group {
            if let specimen { form.snapshot(focused: !specimen.text.isEmpty) } else { form }
        }
        .overlay(alignment: .leading) {
            if let completion {
                ghost(completion)
                    .padding(.leading, field.points("\(size.part).pad-left") + (icon == nil ? .zero : field.points("\(size.part).glyph") + field.points("\(size.part).gap")))
                    .padding(.trailing, field.points("\(size.part).pad-right"))
                    .allowsHitTesting(false)
            }
        }
        .frame(minWidth: MetalRecipes.combobox.points("self.min-width"))
        .accessibilityAddTraits(.isSearchField)
    }

    /// The rest of the best match, drawn after the text in the field's own type.
    private func ghost(_ item: MetalComboboxItem) -> some View {
        let field = MetalRecipes.field
        let role = size == .large ? field.typeRole("field.font", trackingKey: "field.tracking") : MetalType.ui
        return HStack(spacing: .zero) {
            Text(shownText).hidden()
            Text(String(item.value.dropFirst(shownText.count))).foregroundColor(colorway.tokens.ink3.color)
        }
        .font(.metal(role))
        .tracking(role.trackingPoints)
        .lineLimit(1)
        .accessibilityHidden(true)
    }

    /// The trail: the clear key (the ring stands in its place while a search runs).
    private var keys: some View {
        ZStack {
            MetalFieldKey("Clear", icon: .close) { text = ""; close() }
                .metalPresence(!shownText.isEmpty && !wait.showing, pop: MetalRecipes.field.scalar("key.pop"))
            if wait.showing {
                MetalSpinner(label: "Searching", phase: wait.phase) { EmptyView() }
                    .foregroundStyle(colorway.tokens.ink2.color)
            }
        }
    }

    // MARK: the plate (Combobox's)

    private var plate: some View {
        let menu = MetalRecipes.menu
        let combobox = MetalRecipes.combobox
        let shape = RoundedRectangle(cornerRadius: menu.points("self.radius"), style: .continuous)
        let tallest = combobox.scalar("self.max-rows") * menu.points("row.height")
        return Group {
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
        .metalWaitDim(wait.showing && !flat.isEmpty)
        .padding(menu.points("self.pad"))
        .frame(minWidth: menu.points("self.min-width"), maxWidth: .infinity, alignment: .leading)
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
        let index = Dictionary(rows.enumerated().map { ($1.id, $0) }, uniquingKeysWith: { first, _ in first })
        let at = specimen?.highlighted ?? highlighted
        return LazyVStack(alignment: .leading, spacing: .zero, pinnedViews: pinned ? [.sectionHeaders] : []) {
            if let quiet { quietLine(quiet) }
            ForEach(sections) { section in
                SwiftUI.Section {
                    ForEach(section.rows) { row in
                        rowView(row, on: index[row.id] == at).id(row.id)
                            .onHover { if $0 && !row.disabled { highlighted = index[row.id] } }
                            .onTapGesture { choose(row) }
                    }
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

    private func quietLine(_ text: String) -> some View {
        let menu = MetalRecipes.menu
        return Text(text)
            .font(.metal(MetalType.ui))
            .foregroundColor(colorway.tokens.ink3.color)
            .padding(.horizontal, menu.points("row.pad"))
            .padding(.vertical, menu.points("heading.pad-bottom"))
            .frame(maxWidth: .infinity, alignment: .leading)
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

    private func rowView(_ row: MetalComboboxItem, on: Bool) -> some View {
        let menu = MetalRecipes.menu
        let combobox = MetalRecipes.combobox
        let retry = row.value == Self.retry.value
        return HStack(spacing: menu.points("row.gap")) {
            if let person = row.person {
                let avatar = MetalRecipes.avatar
                MetalAvatar(name: person)
                    .scaleEffect(avatar.points("size.small") / avatar.points("size.regular"))
                    .frame(width: avatar.points("size.small"), height: avatar.points("size.small"))
            } else if let icon = row.icon {
                MetalIcon(icon, size: menu.points("row.glyph")).foregroundColor(colorway.tokens.ink2.color)
            }
            VStack(alignment: .leading, spacing: combobox.points("detail.gap")) {
                (retry ? Text(row.label).foregroundColor(colorway.tokens.ink.color) : matchedText(row.label))
                    .font(menu.font("row.font"))
                    .lineLimit(1)
                if let description = row.description {
                    Text(description).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color).lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            if retry {
                Text("Try again").font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
            }
        }
        .padding(.horizontal, menu.points("row.pad"))
        .padding(.vertical, row.description != nil ? combobox.points("detail.pad-y") : .zero)
        .frame(minHeight: menu.points("row.height"))
        .background {
            if on { MetalListGlide().matchedGeometryEffect(id: "highlight", in: glide) }
        }
        .contentShape(Rectangle())
        .opacity(row.disabled ? menu.scalar("row.disabled") : .one)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction { choose(row) }
    }

    /// For headless captures: the plate drawn open under the well at `text`, with row `highlighted` lit.
    func specimen(text: String, highlighted: Int? = nil) -> Self {
        var copy = self
        copy.specimen = (text, highlighted)
        return copy
    }
}
