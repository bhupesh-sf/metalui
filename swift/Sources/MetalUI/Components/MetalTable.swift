import SwiftUI
#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

// TABLE, rows of a person's things (table.agent.md), from the generated table, label, rule, row,
// menu and checkbox recipes and the parts its cells are made of, as the web draws them.
//
//   rest      engraved column labels over rows parted by hairlines; density roomy 48, regular 40,
//             compact 32; the primary column takes the room left and truncates
//   cells     each column says its kind (MetalTableValue carries the value): text, number, currency,
//             percent, delta, date, status, person, tags, progress, trend, yes, code, actions;
//             an empty value is "—" in ink3
//   guide     one plate (the menu's row highlight) glides under the hovered row on the settle spring
//   open      `onOpen`: a click or Return opens the row; `opened` takes the row's green rail
//   sort      a sortable header turns its arrow; rows travel to their places on the settle spring
//   select    the row dimple; select-all is mixed when some are chosen; chosen rows take the green tint
//   filtered  `filter`: "12 of 240" and Clear beside the caption
//   waiting   `loading` with no rows: skeleton rows; with rows: they dim. Empty, nothing matches and
//             failed each say so in one row
//   narrow    under 720 priority 3 columns leave, under 560 priority 2 (and the side padding narrows to 8); their values move to a line
//             under the primary cell
//   sticky    the head is pinned on frost while the rows scroll
//   totals    a column's `total` fills a sunk readout row at the foot, held under the rows; its
//             figures turn (numeric text) when the rows change
//   groups    `groupBy`: an engraved header per group (chevron, name, count, subtotals), pinned while
//             its rows scroll; the chevron turns on the part spring, the rows below travel on settle
//   pinned    `pin`: the first column holds at the leading edge while the rest scroll sideways, with a
//             shade at its edge only while something is under it
//   matrix    `rowHeader` cells are headers; `.check` cells are row dimples
//   live      new rows land at the top (object spring); scrolled away, they wait behind "N new"
//   detail    `detail`: a chevron key opens a sunk panel under the row, revealed from its top edge
//   columns   `columnsMenu`: hide and show from a menu; `resizable`: drag the hairline at a header's
//             end (it thickens to a grip on the part spring); `columnsState` keeps both
// Reduce Motion: rows jump and land at once; the guide, the arrow and the chevrons change at once.

public enum MetalTableKind: Sendable { case text, number, currency, percent, delta, date, status, person, tags, progress, trend, yes, check, code, actions }
public enum MetalTableDensity: Sendable { case roomy, regular, compact }
public enum MetalTableDateFormat: Sendable { case relative, date, time, datetime }

/// One value, in the shape its kind reads.
public enum MetalTableValue {
    case text(String, detail: String? = nil)
    case number(Double)
    case date(Date)
    case status(MetalLEDKind, word: String? = nil)
    case people([String])
    case tags([String])
    case trend([Double])
    case yes(Bool)
    case code(String)
    case none

    var isEmpty: Bool {
        switch self {
        case .none: return true
        case .text(let s, _), .code(let s): return s.isEmpty
        case .people(let a), .tags(let a): return a.isEmpty
        case .trend(let a): return a.isEmpty
        case .number(let n): return n.isNaN
        default: return false
        }
    }

    /// The value read the kind's way, for sorting.
    var sortKey: MetalTableSortKey {
        switch self {
        case .number(let n): return .number(n)
        case .date(let d): return .number(d.timeIntervalSince1970)
        case .status(let s, _): return .number(Double([MetalLEDKind.failed, .waiting, .live, .off, .link].firstIndex(of: s) ?? 9))
        case .yes(let b): return .number(b ? .one : .zero)
        case .trend(let a): return .number(a.last ?? .zero)
        case .text(let s, _), .code(let s): return .text(s)
        case .people(let a), .tags(let a): return .text(a.joined(separator: " "))
        case .none: return .text("")
        }
    }
}

enum MetalTableSortKey: Comparable {
    case number(Double), text(String)

    static func < (a: Self, b: Self) -> Bool {
        switch (a, b) {
        case (.number(let x), .number(let y)): return x < y
        case (.text(let x), .text(let y)): return x.localizedStandardCompare(y) == .orderedAscending
        case (.number, .text): return true
        case (.text, .number): return false
        }
    }
}

/// How a kind draws its value: the unit, currency, digits, date format, which way is good, words.
public struct MetalTableFormat {
    public var unit: String?
    public var currency: String?
    public var digits: Int?
    public var date: MetalTableDateFormat
    public var betterDown: Bool
    public var words: [MetalLEDKind: String]
    public var warn: Double?

    public init(unit: String? = nil, currency: String? = nil, digits: Int? = nil, date: MetalTableDateFormat = .relative,
                betterDown: Bool = false, words: [MetalLEDKind: String] = [:], warn: Double? = nil) {
        self.unit = unit
        self.currency = currency
        self.digits = digits
        self.date = date
        self.betterDown = betterDown
        self.words = words
        self.warn = warn
    }

    func digits(for kind: MetalTableKind) -> Int { digits ?? (kind == .currency ? 2 : kind == .delta ? 1 : 0) }

    /// The unit the header shows after its label.
    func headerUnit(for kind: MetalTableKind) -> String? {
        if let unit { return unit }
        if kind == .percent { return "%" }
        if kind == .currency, let currency {
            let f = NumberFormatter()
            f.numberStyle = .currency
            f.currencyCode = currency
            return f.currencySymbol
        }
        return nil
    }

    /// A figure with a real minus sign.
    func figure(_ value: Double, kind: MetalTableKind) -> String {
        let d = digits(for: kind)
        let shown = kind == .percent ? value * 100 : value
        var s = shown.formatted(.number.precision(.fractionLength(d)))
        if kind == .delta && shown > 0 { s = "+" + s }
        return s.replacingOccurrences(of: "-", with: "−")
    }
}

/// A column: its header, the kind its cells are, how it reads a row, and how early it leaves.
public struct MetalTableColumn<Row>: Identifiable {
    public let id: String
    let header: String
    let kind: MetalTableKind
    let format: MetalTableFormat
    let priority: Int
    let sortable: Bool
    let value: (Row) -> MetalTableValue
    let actions: ((Row) -> [MetalMenuItem])?
    let total: MetalTableTotal?
    let pin: Bool
    let rowHeader: Bool
    let onCheck: ((Row, Bool) -> Void)?

    /// `total` fills the totals row and each group's subtotal; `pin` holds the first column while the rest
    /// scroll sideways; `rowHeader` makes its cells name their rows.
    public init(_ header: String, id: String? = nil, kind: MetalTableKind = .text, format: MetalTableFormat = .init(),
                priority: Int = 1, sortable: Bool = false, total: MetalTableTotal? = nil, pin: Bool = false,
                rowHeader: Bool = false, value: @escaping (Row) -> MetalTableValue) {
        self.id = id ?? header
        self.header = header
        self.kind = kind
        self.format = format
        self.priority = priority
        self.sortable = sortable
        self.value = value
        self.actions = nil
        self.total = total
        self.pin = pin
        self.rowHeader = rowHeader
        self.onCheck = nil
    }

    /// A column of row dimples (a permissions matrix): nil is "—" (it can't apply); without `onChange` the
    /// dimples are read-only.
    public init(check header: String, id: String? = nil, value: @escaping (Row) -> Bool?, onChange: ((Row, Bool) -> Void)? = nil) {
        self.id = id ?? header
        self.header = header
        self.kind = .check
        self.format = .init()
        self.priority = 1
        self.sortable = false
        self.value = { row in value(row).map { .yes($0) } ?? .none }
        self.actions = nil
        self.total = nil
        self.pin = false
        self.rowHeader = false
        self.onCheck = onChange
    }

    /// The actions column: a `more` key at the row's end opening the row's menu.
    public init(actions header: String, _ actions: @escaping (Row) -> [MetalMenuItem]) {
        self.id = header
        self.header = header
        self.kind = .actions
        self.format = .init()
        self.priority = 1
        self.sortable = false
        self.value = { _ in .none }
        self.actions = actions
        self.total = nil
        self.pin = false
        self.rowHeader = false
        self.onCheck = nil
    }

    var alignment: Alignment {
        switch kind {
        case .number, .currency, .percent, .delta, .actions: return .trailing
        case .yes, .check: return .center
        default: return .leading
        }
    }
}

/// What a totals cell shows: the sum or the mean of the column's figures.
public enum MetalTableTotal: Sendable { case sum, mean }

/// What a person changed about the columns: the ones they hid and the widths they dragged.
public struct MetalTableColumnsState: Equatable, Sendable {
    public var hidden: Set<String>
    public var widths: [String: Double]
    public init(hidden: Set<String> = [], widths: [String: Double] = [:]) {
        self.hidden = hidden
        self.widths = widths
    }
}

public struct MetalTableSort: Equatable, Sendable {
    public var column: String
    public var ascending: Bool
    public init(_ column: String, ascending: Bool = true) {
        self.column = column
        self.ascending = ascending
    }
}

/// The table recipe's metrics at a density.
struct MetalTableMetrics {
    let row, head, padX, gap, detailGap, glyph: Double

    init(_ density: MetalTableDensity) {
        let r = MetalRecipes.table
        row = r.points(density == .roomy ? "roomy.height" : density == .compact ? "compact.height" : "row.height")
        head = r.points("head.height")
        padX = r.points("row.pad-x")
        gap = r.points("row.gap")
        detailGap = r.points("row.detail-gap")
        glyph = r.points("glyph.size")
    }
}

// MARK: - A cell

/// One value in the look of its kind: the table's cells, and values in MetalProperties.
public struct MetalTableCell: View {
    let kind: MetalTableKind
    let value: MetalTableValue
    let format: MetalTableFormat
    let label: String
    let now: Date
    @Environment(\.metalColorway) private var colorway
    @State private var copied = false

    public init(_ kind: MetalTableKind, _ value: MetalTableValue, format: MetalTableFormat = .init(), label: String = "", now: Date = Date()) {
        self.kind = kind
        self.value = value
        self.format = format
        self.label = label
        self.now = now
    }

    public var body: some View {
        let t = colorway.tokens
        let r = MetalRecipes.table
        let glyph = r.points("glyph.size")
        Group {
            if value.isEmpty && kind != .yes {
                Text("—").foregroundStyle(t.ink3.color).accessibilityLabel("none")
            } else {
                switch value {
                case .number(let n) where kind == .delta:
                    if n == .zero {
                        Text(format.figure(n, kind: kind)).foregroundStyle(t.ink2.color)
                    } else {
                        let good = (n > .zero) != format.betterDown
                        HStack(spacing: r.points("sort.gap")) {
                            MetalIcon(.arrow, size: glyph)
                                .rotationEffect(.degrees(n > .zero ? -45 : 135))
                                .accessibilityHidden(true)
                                .foregroundStyle(good ? MetalShared.greenDeep.color : MetalShared.red.color)
                            Text(format.figure(n, kind: kind))
                        }
                    }
                case .number(let n) where kind == .progress:
                    MetalMeter(label, value: min(1, max(0, n)) * 100)
                        .labelsHidden()
                        .frame(width: r.points("meter.width"))
                        .help(format.figure(min(1, max(0, n)), kind: .percent) + "%")
                case .number(let n):
                    Text(format.figure(n, kind: kind))
                case .date(let d):
                    Text(dateWords(d))
                        .help(d.formatted(date: .abbreviated, time: .shortened))
                case .status(let s, let word):
                    HStack(spacing: r.points("row.gap")) {
                        MetalLED(s, size: .small)
                        Text(word ?? format.words[s] ?? MetalTableCell.statusWord(s))
                    }
                case .people(let names):
                    people(names)
                case .tags(let tags):
                    HStack(spacing: r.points("sort.gap")) {
                        ForEach(tags.prefix(2), id: \.self) { tag in
                            MetalChip(.tag) { MetalChipText { Text(tag) } }
                        }
                        if tags.count > 2 {
                            Text("+\(tags.count - 2)")
                                .font(.metal(MetalType.meta))
                                .foregroundStyle(t.ink2.color)
                                .help(tags.dropFirst(2).joined(separator: ", "))
                        }
                    }
                case .trend(let points):
                    MetalSparkline(points: points.map { MetalSparklinePoint(value: $0) }, size: .mini)
                        .frame(width: r.points("trend.width"))
                        .accessibilityLabel("\(label) trend, \(format.figure(points.first ?? .zero, kind: .number)) to \(format.figure(points.last ?? .zero, kind: .number))")
                case .yes(let on) where kind == .check:
                    MetalDimple(isOn: .constant(on), size: .row, label: label).disabled(true)
                case .yes(let on):
                    if on { MetalIcon(.check, size: glyph).accessibilityLabel("Yes") } else { Color.clear.frame(width: glyph, height: glyph).accessibilityLabel("No") }
                case .code(let code):
                    HStack(spacing: r.points("row.gap")) {
                        Text(code).font(.metal(MetalType.code)).foregroundStyle(t.ink.color)
                        MetalIconButton(copied ? "Copied \(code)" : "Copy \(code)", icon: copied ? .check : .copy) { copy(code) }
                    }
                case .text(let s, _):
                    Text(s).lineLimit(1).truncationMode(.tail).help(s)
                case .none:
                    EmptyView()
                }
            }
        }
        .monospacedDigit()
    }

    static func statusWord(_ s: MetalLEDKind) -> String {
        switch s {
        case .live: return "Live"
        case .waiting: return "Waiting"
        case .failed: return "Failed"
        case .link: return "Link"
        case .off: return "Off"
        }
    }

    private func dateWords(_ d: Date) -> String {
        switch format.date {
        case .relative:
            if abs(d.timeIntervalSince(now)) >= 7 * 24 * 3600 { return d.formatted(.dateTime.day().month(.abbreviated)) }
            let f = RelativeDateTimeFormatter()
            f.unitsStyle = .short
            return f.localizedString(for: d, relativeTo: now)
        case .date: return d.formatted(.dateTime.day().month(.abbreviated))
        case .time: return d.formatted(date: .omitted, time: .shortened)
        case .datetime: return d.formatted(.dateTime.day().month(.abbreviated).hour().minute())
        }
    }

    @ViewBuilder private func people(_ names: [String]) -> some View {
        let a = MetalRecipes.avatar
        let scale = a.points("size.small") / a.points("size.regular")
        let disc = a.points("size.small")
        if names.count == 1 {
            HStack(spacing: MetalRecipes.table.points("row.gap")) {
                MetalAvatar(name: names[0]).scaleEffect(scale).frame(width: disc, height: disc).accessibilityHidden(true)
                Text(names[0]).lineLimit(1)
            }
        } else {
            HStack(spacing: -a.points("group.overlap") * scale) {
                ForEach(names.prefix(3), id: \.self) { name in
                    MetalAvatar(name: name).scaleEffect(scale).frame(width: disc, height: disc)
                }
                if names.count > 3 {
                    Text("+\(names.count - 3)").font(.metal(MetalType.meta)).foregroundStyle(colorway.tokens.ink2.color)
                        .padding(.leading, a.points("group.overlap") * scale + MetalSpace.s4)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(names.joined(separator: ", "))
        }
    }

    private func copy(_ text: String) {
        #if canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #elseif canImport(UIKit)
        UIPasteboard.general.string = text
        #endif
        copied = true
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(MetalRecipes.table.durationSeconds("copy.hold")))
            copied = false
        }
    }
}

// MARK: - The table

/// Column widths measured from every cell, so the rows line up like a table.
private struct MetalTableWidths: PreferenceKey {
    static let defaultValue: [String: Double] = [:]
    static func reduce(value: inout [String: Double], nextValue: () -> [String: Double]) {
        value.merge(nextValue(), uniquingKeysWith: max)
    }
}

/// How far the rows have scrolled down (negative) and the columns sideways (negative).
private struct MetalTableScrollY: PreferenceKey {
    static let defaultValue: CGFloat = .zero
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}
private struct MetalTableScrollX: PreferenceKey {
    static let defaultValue: CGFloat = .zero
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

private enum MetalTableSpace {
    static let x = "metal.table.x"
    static let y = "metal.table.y"
    static let top = "metal.table.top"
}

/// A panel revealed from its top edge: the mask grows with the rows below travelling down.
private struct MetalTableReveal: ViewModifier, Animatable {
    var progress: Double
    var animatableData: Double {
        get { progress }
        set { progress = newValue }
    }
    func body(content: Content) -> some View {
        content.mask(alignment: .top) {
            GeometryReader { g in Rectangle().frame(height: g.size.height * progress) }
        }
    }
}

/// Rows of things: kinds of cells, sort, selection, open, actions, and every way of having none.
public struct MetalTable<Row: Identifiable>: View where Row.ID: Hashable {
    let rows: [Row]
    let columns: [MetalTableColumn<Row>]
    let caption: String
    let density: MetalTableDensity
    @Binding var selection: Set<Row.ID>
    let selectable: Bool
    let opened: Row.ID?
    let onOpen: ((Row) -> Void)?
    let filter: (total: Int, onClear: () -> Void)?
    let loading: Bool
    let error: (message: String, retry: (() -> Void)?)?
    let empty: String
    let maxHeight: CGFloat?
    let now: Date
    let footer: String
    let groupBy: ((Row) -> String)?
    let live: Bool
    let detail: ((Row) -> AnyView)?
    let columnsMenu: Bool
    let resizable: Bool
    let columnsBinding: Binding<MetalTableColumnsState>?

    @State private var sort: MetalTableSort?
    @State private var widths: [String: Double] = [:]
    @State private var hovered: Row.ID?
    @State private var tableWidth: Double = .zero
    @State private var collapsed: Set<String>
    @State private var expanded: Set<Row.ID> = []
    @State private var known: Set<Row.ID>?
    @State private var scrollY: CGFloat = .zero
    @State private var scrollX: CGFloat = .zero
    @State private var ownColumns = MetalTableColumnsState()
    @State private var grip: String?
    @State private var dragStart: Double?
    @Namespace private var guide
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `groupBy` groups the rows under headers (`collapsed` start closed); `live` keeps new rows from pushing a
    /// reader; `detail` opens a panel under a row; `columnsState` keeps hidden columns and dragged widths.
    public init(_ rows: [Row], columns: [MetalTableColumn<Row>], caption: String, density: MetalTableDensity = .regular,
                selection: Binding<Set<Row.ID>>? = nil, sort: MetalTableSort? = nil, opened: Row.ID? = nil,
                onOpen: ((Row) -> Void)? = nil, filter: (total: Int, onClear: () -> Void)? = nil, loading: Bool = false,
                error: (message: String, retry: (() -> Void)?)? = nil, empty: String = "Nothing here yet.",
                maxHeight: CGFloat? = nil, now: Date = Date(), footer: String = "Total",
                groupBy: ((Row) -> String)? = nil, collapsed: Set<String> = [], live: Bool = false,
                detail: ((Row) -> AnyView)? = nil, columnsState: Binding<MetalTableColumnsState>? = nil,
                columnsMenu: Bool = false, resizable: Bool = false) {
        self.rows = rows
        self.columns = columns
        self.caption = caption
        self.density = density
        self._selection = selection ?? .constant([])
        self.selectable = selection != nil
        self._sort = State(initialValue: sort)
        self.opened = opened
        self.onOpen = onOpen
        self.filter = filter
        self.loading = loading
        self.error = error
        self.empty = empty
        self.maxHeight = maxHeight
        self.now = now
        self.footer = footer
        self.groupBy = groupBy
        self._collapsed = State(initialValue: collapsed)
        self.live = live
        self.detail = detail
        self.columnsBinding = columnsState
        self.columnsMenu = columnsMenu
        self.resizable = resizable
    }

    private var m: MetalTableMetrics { MetalTableMetrics(density) }
    private var settle: Animation? { MetalMotion.resolve(.settle, reduceMotion: reduceMotion).animation }
    private var part: Animation? { MetalMotion.resolve(.part, reduceMotion: reduceMotion).animation }
    private var object: Animation? { MetalMotion.resolve(.object, reduceMotion: reduceMotion).animation }

    private var layout: MetalTableColumnsState { columnsBinding?.wrappedValue ?? ownColumns }
    private func setLayout(_ next: MetalTableColumnsState) {
        if let columnsBinding { columnsBinding.wrappedValue = next } else { ownColumns = next }
    }

    private var pinned: Bool { columns.first?.pin == true }
    private var hasTotals: Bool { shown.contains { $0.total != nil } }

    /// Columns the person kept (the first can't hide).
    private var chosen: [MetalTableColumn<Row>] {
        columns.enumerated().filter { $0.offset == .zero || !layout.hidden.contains($0.element.id) }.map(\.element)
    }

    /// Columns still standing at this width (priority 3 leaves under 720, 2 under 560).
    private var shown: [MetalTableColumn<Row>] {
        let r = MetalRecipes.table
        guard tableWidth > .zero else { return chosen }
        return chosen.filter { c in
            !(c.priority >= 3 && tableWidth < r.points("narrow.low")) && !(c.priority == 2 && tableWidth < r.points("narrow.mid"))
        }
    }

    private var moved: [MetalTableColumn<Row>] { chosen.dropFirst().filter { c in !shown.contains { $0.id == c.id } } }

    /// Live: rows that arrived while the reader was scrolled away wait, unseen.
    private var present: [Row] {
        guard live, let known else { return rows }
        return rows.filter { known.contains($0.id) }
    }
    private var waiting: Int { rows.count - present.count }
    private var away: Bool { scrollY < -MetalRecipes.table.points("live.slop") }

    private var sorted: [Row] {
        guard let sort, let col = columns.first(where: { $0.id == sort.column }) else { return present }
        return present.sorted { a, b in
            let x = col.value(a).sortKey, y = col.value(b).sortKey
            return sort.ascending ? x < y : y < x
        }
    }

    /// Groups in the order they first appear in the rows; each group's rows in the sorted order.
    private var groups: [(name: String?, rows: [Row])] {
        guard let groupBy else { return [(nil, sorted)] }
        var order: [String] = []
        var seen = Set<String>()
        for row in present where seen.insert(groupBy(row)).inserted { order.append(groupBy(row)) }
        return order.map { g in (g, sorted.filter { groupBy($0) == g }) }
    }

    public var body: some View {
        let t = colorway.tokens
        VStack(alignment: .leading, spacing: MetalRecipes.table.points("caption.gap")) {
            captionView
            sideways {
                VStack(alignment: .leading, spacing: .zero) {
                    header
                    if let maxHeight {
                        // A scroll container: the head stays above the rows passing under it; group headers pin.
                        ScrollViewReader { proxy in
                            ScrollView(.vertical) {
                                LazyVStack(alignment: .leading, spacing: .zero, pinnedViews: [.sectionHeaders]) {
                                    Color.clear.frame(height: .zero).id(MetalTableSpace.top)
                                    content
                                }
                                .background(GeometryReader { g in
                                    Color.clear.preference(key: MetalTableScrollY.self, value: g.frame(in: .named(MetalTableSpace.y)).minY)
                                })
                            }
                            .coordinateSpace(.named(MetalTableSpace.y))
                            .scrollBounceBehavior(.basedOnSize)
                            .frame(maxHeight: maxHeight)
                            .onPreferenceChange(MetalTableScrollY.self) { scrollY = $0 }
                            .overlay(alignment: .top) { if live { newsKey(proxy) } }
                        }
                    } else {
                        VStack(alignment: .leading, spacing: .zero) { content }
                    }
                    if hasTotals && !present.isEmpty && error == nil { totalsRow }
                }
            }
        }
        .foregroundStyle(t.ink.color)
        .font(.metal(MetalType.ui))
        .onPreferenceChange(MetalTableWidths.self) { widths = $0 }
        .background(GeometryReader { g in Color.clear.onAppear { tableWidth = g.size.width }.onChange(of: g.size.width) { _, w in tableWidth = w } })
        .animation(settle, value: sort)
        .onAppear { if live && known == nil { known = Set(rows.map(\.id)) } }
        .onChange(of: rows.map(\.id)) { _, ids in
            guard live, !away else { return }
            withAnimation(object) { known = Set(ids) }
        }
        .onChange(of: away) { _, isAway in
            guard live, !isAway else { return }
            withAnimation(object) { known = Set(rows.map(\.id)) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(caption)
    }

    /// Pinned: the columns scroll sideways under the first, which holds at the leading edge.
    @ViewBuilder private func sideways<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        if pinned {
            ScrollView(.horizontal) {
                c().background(GeometryReader { g in
                    Color.clear.preference(key: MetalTableScrollX.self, value: g.frame(in: .named(MetalTableSpace.x)).minX)
                })
            }
            .coordinateSpace(.named(MetalTableSpace.x))
            .onPreferenceChange(MetalTableScrollX.self) { scrollX = max(.zero, -$0) }
        } else {
            c()
        }
    }

    /// The lead cells and the first column: held at the leading edge on opaque frost when pinned, with a
    /// shade at its edge only while something is under it.
    @ViewBuilder private func pin<V: View>(_ v: V, selected: Bool = false, hovered: Bool = false, well: Bool = false) -> some View {
        if pinned {
            let t = colorway.tokens
            let r = MetalRecipes.table
            let shade = r.color("pin.shade", colorway: MetalRecipeColorway(colorway))?.color ?? .clear
            v
                .background {
                    ZStack {
                        if well { LinearGradient(colors: [t.wellTop.color, t.wellBot.color], startPoint: .top, endPoint: .bottom) } else { t.frostOpaque.color }
                        if selected { r.color("select.tint", colorway: MetalRecipeColorway(colorway))?.color ?? .clear }
                        if hovered { t.menuRowHover.color }
                    }
                }
                .overlay(alignment: .trailing) {
                    LinearGradient(colors: [shade, shade.opacity(.zero)], startPoint: .leading, endPoint: .trailing)
                        .frame(width: r.points("pin.shadow"))
                        .offset(x: r.points("pin.shadow"))
                        .opacity(scrollX > .zero ? .one : .zero)
                        .animation(settle, value: scrollX > .zero)
                        .allowsHitTesting(false)
                }
                .offset(x: scrollX)
                .zIndex(.one)
        } else {
            v
        }
    }

    private var captionView: some View {
        HStack(alignment: .firstTextBaseline, spacing: m.gap) {
            Text(caption).font(.metal(MetalType.title))
            if let filter, rows.count < filter.total {
                Text("\(rows.count) of \(filter.total)")
                    .font(.metal(MetalType.ui))
                    .monospacedDigit()
                    .foregroundStyle(colorway.tokens.ink2.color)
                    .contentTransition(.numericText())
                MetalButton("Clear", size: .compact, action: filter.onClear)
            }
            if columnsMenu {
                Spacer(minLength: .zero)
                Menu {
                    ForEach(Array(columns.enumerated()), id: \.element.id) { index, c in
                        if c.kind != .actions {
                            Toggle(c.header, isOn: Binding(get: { index == .zero || !layout.hidden.contains(c.id) }, set: { on in
                                var next = layout
                                if on { next.hidden.remove(c.id) } else { next.hidden.insert(c.id) }
                                withAnimation(settle) { setLayout(next) }
                            }))
                            .disabled(index == .zero)
                        }
                    }
                } label: {
                    MetalIcon(.eye, size: MetalRecipes.iconButton.points("ghost.glyph"))
                }
                .menuStyle(.borderlessButton)
                .menuIndicator(.hidden)
                .fixedSize()
                .accessibilityLabel("Columns")
            }
        }
    }

    private var leadWidth: Double { m.row * Double((selectable ? 1 : 0) + (detail != nil ? 1 : 0)) }

    /// The selection and detail columns, empty (the head without selection, loading rows, group headers, totals).
    private var leadSpace: some View { Color.clear.frame(width: leadWidth, height: .zero) }

    // The head: engraved labels with their units, a sort button where order means something, a grip to size.
    private var header: some View {
        HStack(spacing: .zero) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, c in
                if index == .zero {
                    pin(HStack(spacing: .zero) {
                        if selectable {
                            let all = !rows.isEmpty && rows.allSatisfy { selection.contains($0.id) }
                            let some = !all && rows.contains { selection.contains($0.id) }
                            MetalDimple(isOn: Binding(get: { all }, set: { on in selection = on ? Set(rows.map(\.id)) : [] }),
                                        mixed: some, size: .row, label: "Select all")
                                .frame(width: m.row)
                        }
                        if detail != nil { Color.clear.frame(width: m.row) }
                        headerCell(c).modifier(width(c, first: true))
                    })
                } else {
                    headerCell(c)
                        .modifier(width(c, first: false))
                        .overlay(alignment: .trailing) { if resizable && c.kind != .actions { gripView(c) } }
                }
            }
        }
        .frame(height: m.head)
        .background(colorway.tokens.frostOpaque.color)
        .overlay(alignment: .bottom) { MetalRule(.horizontal) }
        .zIndex(.one)
    }

    @ViewBuilder private func headerCell(_ c: MetalTableColumn<Row>) -> some View {
        let unit = c.format.headerUnit(for: c.kind)
        let label = c.kind == .actions ? "" : c.header.uppercased() + (unit.map { " (\($0))" } ?? "")
        if c.sortable {
            let on = sort?.column == c.id
            Button {
                sort = on ? MetalTableSort(c.id, ascending: !(sort?.ascending ?? true)) : MetalTableSort(c.id)
            } label: {
                HStack(spacing: MetalRecipes.table.points("sort.gap")) {
                    MetalLabel(label, style: .engraved)
                    MetalIcon(.arrow, size: MetalRecipes.table.points("sort.glyph"))
                        .rotationEffect(.degrees(on && sort?.ascending == false ? 135 : -45))
                        .opacity(on ? .one : .zero)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(c.header)
            .accessibilityValue(on ? (sort?.ascending == true ? "ascending" : "descending") : "")
        } else {
            MetalLabel(label, style: .engraved).accessibilityLabel(c.header)
        }
    }

    /// A column's width now: the one the person dragged, or the widest cell and its padding.
    private func currentWidth(_ c: MetalTableColumn<Row>) -> Double {
        layout.widths[c.id] ?? (widths[c.id] ?? .zero) + m.padX + m.padX
    }

    /// The hairline at a header's end: under the pointer or a drag it thickens to a grip (part spring);
    /// dragging sizes the column, a double-click gives it back its own width, and adjusting steps it.
    private func gripView(_ c: MetalTableColumn<Row>) -> some View {
        let r = MetalRecipes.table
        let t = colorway.tokens
        let on = grip == c.id
        let set: (Double?) -> Void = { w in
            var next = layout
            next.widths[c.id] = w.map { max(r.points("resize.min"), $0.rounded()) }
            setLayout(next)
        }
        return ZStack(alignment: .trailing) {
            Rectangle().fill(t.rule.color).frame(width: r.points("resize.line"), height: m.glyph)
            Capsule().fill(t.ink3.color)
                .frame(width: r.points("resize.grip"), height: m.glyph)
                .scaleEffect(x: on ? .one : r.points("resize.line") / r.points("resize.grip"), anchor: .trailing)
                .opacity(on ? .one : .zero)
                .animation(part, value: on)
        }
        .frame(width: r.points("resize.hit"), alignment: .trailing)
        .frame(maxHeight: .infinity)
        .contentShape(Rectangle())
        .onHover { inside in
            if dragStart == nil { grip = inside ? c.id : nil }
            #if canImport(AppKit)
            if inside { NSCursor.resizeLeftRight.push() } else { NSCursor.pop() }
            #endif
        }
        .gesture(DragGesture(minimumDistance: .zero)
            .onChanged { v in
                let start = dragStart ?? currentWidth(c)
                dragStart = start
                grip = c.id
                set(start + v.translation.width)
            }
            .onEnded { _ in dragStart = nil })
        .onTapGesture(count: 2) { set(nil) }
        .accessibilityElement()
        .accessibilityLabel("Size \(c.header)")
        .accessibilityValue("\(Int(currentWidth(c)))")
        .accessibilityAdjustableAction { direction in
            let step = r.points("resize.step")
            set(currentWidth(c) + (direction == .increment ? step : -step))
        }
    }

    private func width(_ c: MetalTableColumn<Row>, first: Bool) -> Width {
        Width(column: c.id, primary: first && !pinned, width: widths[c.id], fixed: layout.widths[c.id], alignment: c.alignment, padX: m.padX)
    }

    @ViewBuilder private var content: some View {
        if let error {
            stateRow {
                MetalIcon(.syncError, size: m.glyph).foregroundStyle(MetalShared.red.color)
                Text(error.message)
                if let retry = error.retry { MetalButton("Try again", size: .compact, action: retry) }
            }
        } else if loading && rows.isEmpty {
            ForEach(0..<5, id: \.self) { _ in
                HStack(spacing: .zero) {
                    leadSpace
                    ForEach(Array(shown.enumerated()), id: \.element.id) { index, c in
                        Group { if c.kind != .actions && c.kind != .yes && c.kind != .check { MetalSkeleton(width: index == 0 ? nil : CGFloat(MetalRecipes.table.points("trend.width"))) } }
                            .modifier(width(c, first: index == .zero))
                    }
                }
                .frame(minHeight: m.row)
                .overlay(alignment: .bottom) { MetalRule(.horizontal) }
                .accessibilityHidden(true)
            }
        } else if present.isEmpty {
            if let filter, filter.total > 0 {
                stateRow { Text("Nothing matches."); MetalButton("Clear", size: .compact, action: filter.onClear) }
            } else {
                stateRow { Text(empty) }
            }
        } else {
            ForEach(groups, id: \.name) { group in
                if let name = group.name {
                    Section {
                        if !collapsed.contains(name) { rowsView(group.rows) }
                    } header: {
                        groupHeader(name, rows: group.rows)
                    }
                } else {
                    rowsView(group.rows)
                }
            }
            .opacity(loading ? MetalRecipes.spinner.number("item.dim") ?? .one : .one)
        }
    }

    @ViewBuilder private func rowsView(_ rows: [Row]) -> some View {
        let arrive: AnyTransition = live ? .asymmetric(insertion: .offset(y: -MetalRadius.nest).combined(with: .opacity), removal: .opacity) : .opacity
        ForEach(rows) { row in
            rowView(row).transition(arrive)
            if let detail, expanded.contains(row.id) {
                MetalWell(.field, radius: MetalRecipes.table.points("detail.radius")) {
                    detail(row)
                        .padding(MetalRecipes.table.points("detail.pad"))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding([.horizontal, .bottom], MetalRecipes.table.points("detail.inset"))
                .overlay(alignment: .bottom) { MetalRule(.horizontal) }
                .transition(.modifier(active: MetalTableReveal(progress: .zero), identity: MetalTableReveal(progress: .one)))
            }
        }
    }

    /// A group's header: the chevron, the name and the count, then the subtotals; pinned while its rows pass.
    private func groupHeader(_ name: String, rows: [Row]) -> some View {
        let open = !collapsed.contains(name)
        return HStack(spacing: .zero) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, c in
                if index == .zero {
                    pin(HStack(spacing: .zero) {
                        leadSpace
                        Button {
                            withAnimation(settle) { if open { collapsed.insert(name) } else { collapsed.remove(name) } }
                        } label: {
                            HStack(spacing: MetalRecipes.table.points("group.gap")) {
                                MetalIcon(.chevron, size: m.glyph)
                                    .rotationEffect(.degrees(open ? .zero : -90))
                                    .animation(part, value: open)
                                MetalLabel(name.uppercased(), style: .engraved)
                                Text("\(rows.count)").font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.ink3.color).contentTransition(.numericText())
                            }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(name)
                        .accessibilityValue(open ? "expanded, \(rows.count)" : "collapsed, \(rows.count)")
                        .modifier(width(c, first: true))
                    })
                } else {
                    Group { if c.total != nil { totalCell(c, rows: rows) } }
                        .foregroundStyle(colorway.tokens.ink2.color)
                        .modifier(width(c, first: false))
                }
            }
        }
        .frame(height: MetalRecipes.table.points("group.height"))
        .background(colorway.tokens.frostOpaque.color)
        .overlay(alignment: .bottom) { MetalRule(.horizontal) }
        .accessibilityAddTraits(.isHeader)
    }

    /// The sum or mean of a column over some rows.
    private func total(_ c: MetalTableColumn<Row>, rows: [Row]) -> Double? {
        let ns = rows.compactMap { row -> Double? in
            if case .number(let n) = c.value(row), !n.isNaN { return n }
            return nil
        }
        guard !ns.isEmpty else { return nil }
        let sum = ns.reduce(.zero, +)
        return c.total == .mean ? sum / Double(ns.count) : sum
    }

    /// A total in its column's look; its figures turn when they change.
    private func totalCell(_ c: MetalTableColumn<Row>, rows: [Row]) -> some View {
        let value = total(c, rows: rows)
        return MetalTableCell(c.kind, value.map { .number($0) } ?? .none, format: c.format, label: c.header, now: now)
            .lineLimit(1)
            .fixedSize()
            .contentTransition(.numericText())
            .animation(settle, value: value)
    }

    /// The totals row: a sunk readout at the foot, the label engraved in the first column.
    private var totalsRow: some View {
        HStack(spacing: .zero) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, c in
                if index == .zero {
                    pin(HStack(spacing: .zero) {
                        leadSpace
                        VStack(alignment: .leading, spacing: m.detailGap) {
                            MetalLabel(footer.uppercased(), style: .engraved)
                            let movedTotals = moved.filter { $0.total != nil }
                            if !movedTotals.isEmpty {
                                HStack(spacing: m.gap) {
                                    ForEach(movedTotals) { mc in
                                        HStack(spacing: MetalSpace.s4) {
                                            Text(mc.header).foregroundStyle(colorway.tokens.ink3.color)
                                            totalCell(mc, rows: present)
                                        }
                                    }
                                }
                                .font(.metal(MetalType.meta))
                            }
                        }
                        .modifier(width(c, first: true))
                    }, well: true)
                } else {
                    Group { if c.total != nil { totalCell(c, rows: present) } }
                        .modifier(width(c, first: false))
                }
            }
        }
        .frame(minHeight: m.row)
        .background {
            MetalWell(.field, radius: MetalRecipes.table.points("total.radius")) { Color.clear }
        }
    }

    /// Live: the rows that wait behind it, and the way back to the top where they land.
    private func newsKey(_ proxy: ScrollViewProxy) -> some View {
        let shown = waiting > 0
        return MetalButton("\(waiting) new", size: .compact, action: {
            withAnimation(settle) { proxy.scrollTo(MetalTableSpace.top, anchor: .top) }
            withAnimation(object) { known = Set(rows.map(\.id)) }
        }) {
            MetalIcon(.arrow, size: m.glyph).rotationEffect(.degrees(-45))
        }
        .padding(.top, MetalRecipes.table.points("live.inset"))
        .opacity(shown ? .one : .zero)
        .offset(y: shown ? .zero : -MetalRadius.nest)
        .allowsHitTesting(shown)
        .accessibilityHidden(!shown)
        .animation(settle, value: shown)
    }

    private func stateRow<C: View>(@ViewBuilder _ c: () -> C) -> some View {
        HStack(spacing: MetalRecipes.table.points("state.gap")) { c() }
            .font(.metal(MetalType.body))
            .foregroundStyle(colorway.tokens.ink2.color)
            .frame(maxWidth: .infinity)
            .padding(.vertical, MetalRecipes.table.points("state.pad-y"))
    }

    private func rowView(_ row: Row) -> some View {
        let t = colorway.tokens
        let on = selection.contains(row.id)
        let rail = MetalRecipes.row
        let open = expanded.contains(row.id)
        return HStack(spacing: .zero) {
            ForEach(Array(shown.enumerated()), id: \.element.id) { index, c in
                if index == .zero {
                    pin(HStack(spacing: .zero) {
                        if selectable {
                            MetalDimple(isOn: Binding(get: { on }, set: { v in if v { selection.insert(row.id) } else { selection.remove(row.id) } }),
                                        size: .row, label: "Select \(name(of: row))")
                                .frame(width: m.row)
                        }
                        if detail != nil {
                            MetalIconButton("Details for \(name(of: row))", action: {
                                withAnimation(settle) { if open { expanded.remove(row.id) } else { expanded.insert(row.id) } }
                            }) {
                                MetalIcon(.chevron, size: MetalRecipes.iconButton.points("ghost.glyph"))
                                    .rotationEffect(.degrees(open ? .zero : -90))
                                    .animation(part, value: open)
                            }
                            .accessibilityValue(open ? "expanded" : "collapsed")
                            .frame(width: m.row)
                        }
                        cell(c, row: row, primary: true).modifier(width(c, first: true))
                    }, selected: on, hovered: hovered == row.id)
                } else {
                    cell(c, row: row, primary: false).modifier(width(c, first: false))
                }
            }
        }
        .frame(minHeight: m.row)
        .background {
            ZStack {
                if on { (MetalRecipes.table.color("select.tint", colorway: MetalRecipeColorway(colorway))?.color ?? .clear) }
                if hovered == row.id {
                    RoundedRectangle(cornerRadius: MetalRecipes.menu.points("row.radius"), style: .continuous)
                        .fill(t.menuRowHover.color)
                        .matchedGeometryEffect(id: "guide", in: guide)
                }
            }
        }
        .overlay(alignment: .leading) {
            if opened == row.id {
                RoundedRectangle(cornerRadius: rail.points("rail.radius"))
                    .fill(MetalShared.greenDeep.color)
                    .frame(width: rail.points("rail.w"))
                    .padding(.vertical, rail.points("rail.inset"))
                    .offset(x: scrollX)
                    .zIndex(.one)
            }
        }
        .overlay(alignment: .bottom) { MetalRule(.horizontal) }
        .contentShape(Rectangle())
        .onHover { inside in withAnimation(settle) { hovered = inside ? row.id : (hovered == row.id ? nil : hovered) } }
        .onTapGesture { onOpen?(row) }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(on ? [.isSelected] : [])
        .accessibilityAction(named: "Open") { onOpen?(row) }
    }

    private func name(of row: Row) -> String {
        if case .text(let s, _) = columns.first?.value(row) { return s }
        return "\(row.id)"
    }

    @ViewBuilder private func cell(_ c: MetalTableColumn<Row>, row: Row, primary: Bool) -> some View {
        let value = c.value(row)
        if c.kind == .actions, let items = c.actions?(row), !items.isEmpty {
            Menu {
                ForEach(items) { item in
                    if let action = item.action {
                        Button(role: item.danger ? .destructive : nil, action: action) { Text(item.label) }
                            .disabled(item.disabled)
                    } else {
                        Divider()
                    }
                }
            } label: {
                MetalIcon(.more, size: MetalRecipes.iconButton.points("ghost.glyph"))
            }
            .menuStyle(.borderlessButton)
            .menuIndicator(.hidden)
            .fixedSize()
            .opacity(hovered == row.id ? .one : .zero)
            .accessibilityLabel("More for \(name(of: row))")
        } else if c.kind == .check, case .yes(let on) = value, let onCheck = c.onCheck {
            MetalDimple(isOn: Binding(get: { on }, set: { onCheck(row, $0) }), size: .row, label: "\(name(of: row)), \(c.header)")
        } else if primary {
            VStack(alignment: .leading, spacing: m.detailGap) {
                MetalTableCell(c.kind, value, format: c.format, label: c.header, now: now)
                    .accessibilityAddTraits(c.rowHeader ? .isHeader : [])
                if case .text(_, let detail?) = value {
                    Text(detail).font(.metal(MetalType.meta)).foregroundStyle(colorway.tokens.ink2.color).lineLimit(1)
                }
                if !moved.isEmpty {
                    HStack(spacing: m.gap) {
                        ForEach(moved) { mc in
                            HStack(spacing: MetalSpace.s4) {
                                Text(mc.header).foregroundStyle(colorway.tokens.ink3.color)
                                MetalTableCell(mc.kind, mc.value(row), format: mc.format, label: mc.header, now: now)
                            }
                        }
                    }
                    .font(.metal(MetalType.meta))
                    .foregroundStyle(colorway.tokens.ink2.color)
                    .lineLimit(1)
                }
            }
        } else {
            MetalTableCell(c.kind, value, format: c.format, label: c.kind == .check ? "\(name(of: row)), \(c.header)" : c.header, now: now)
                .lineLimit(1)
                .fixedSize()
                .accessibilityAddTraits(c.rowHeader ? .isHeader : [])
        }
    }
}

/// Lays one cell into its column: the primary column takes the room left; the others are as wide as
/// their widest cell, measured from every row, or the width the person dragged.
private struct Width: ViewModifier {
    let column: String
    let primary: Bool
    let width: Double?
    let fixed: Double?
    let alignment: Alignment
    let padX: Double

    func body(content: Content) -> some View {
        if primary && fixed == nil {
            content
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, padX)
        } else if let fixed {
            let inner = max(.zero, fixed - padX - padX)
            content
                .background(GeometryReader { g in Color.clear.preference(key: MetalTableWidths.self, value: [column: g.size.width]) })
                .frame(width: inner, alignment: alignment)
                .clipped()
                .padding(.horizontal, padX)
        } else {
            let measured: CGFloat? = width.map { CGFloat($0) }
            content
                .background(GeometryReader { g in Color.clear.preference(key: MetalTableWidths.self, value: [column: g.size.width]) })
                .frame(width: measured, alignment: alignment)
                .padding(.horizontal, padX)
        }
    }
}
