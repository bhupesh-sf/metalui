import SwiftUI
#if canImport(AppKit)
import AppKit
#endif

// DATA GRID, a table whose cells are targets (data-grid.agent.md), from the generated table and
// data-grid recipes, as the web draws them.
//
//   rest      Table's look: engraved labels, rows parted by hairlines, plus a hairline between cells
//   focus     one cell holds focus: a ring the focus ring's width inside it. Arrows walk the cells
//   edit      Return, or typing over a cell: a text field stands in it, editor.inset from its sides.
//             Return commits, Escape puts it back
//   saving    `onCommit` is async: the new value shows, dimmed to saving.dim, until it lands
//   failed    it threw: the old value comes back, the cell shakes once (refusal) and a red ring holds
//             until it is edited again
//   refused   a cell that can't be edited, or text its column can't read, shakes once
//   clipboard ⌘C and ⌘V on the focused cell (macOS)
//   columns   drag a header onto another to put it there (`columnOrder`)
// Reduce Motion: no shake.
// Gaps against the web (no SwiftUI cell selection): no ranges, the clipboard takes one cell, columns move
// by drag only, every editor is a text field.

/// A column of a data grid: a table column, whether its cells can be edited, and how it reads typed text.
public struct MetalDataGridColumn<Row>: Identifiable {
    public var id: String { column.id }
    let column: MetalTableColumn<Row>
    let editable: (Row) -> Bool
    let parse: ((String) -> MetalTableValue?)?

    /// - Parameters:
    ///   - editable: whether a row's cell can be edited (computed columns can't).
    ///   - parse: typed or pasted text to a value; nil refuses it. By kind otherwise (figures, text, code, tags).
    public init(_ column: MetalTableColumn<Row>, editable: @escaping (Row) -> Bool = { _ in false }, parse: ((String) -> MetalTableValue?)? = nil) {
        self.column = column
        self.editable = editable
        self.parse = parse
    }

    public init(_ column: MetalTableColumn<Row>, editable: Bool, parse: ((String) -> MetalTableValue?)? = nil) {
        self.init(column, editable: { _ in editable }, parse: parse)
    }

    /// The value as a person would type or copy it: figures bare, a status in its word.
    func text(_ value: MetalTableValue) -> String {
        let k = column.kind
        switch value {
        case .number(let n): return String(format: "%.\(column.format.digits(for: k))f", k == .percent || k == .progress ? n * 100 : n)
        case .text(let s, _), .code(let s): return s
        case .tags(let a), .people(let a): return a.joined(separator: ", ")
        case .status(let s, let word): return word ?? column.format.words[s] ?? "\(s)"
        case .yes(let b): return b ? "TRUE" : "FALSE"
        case .date(let d): return d.formatted(.iso8601.year().month().day())
        case .trend(let a): return a.map { String($0) }.joined(separator: " ")
        case .none: return ""
        }
    }

    /// Text to a value, the kind's way; nil when it means nothing for the kind.
    func read(_ text: String) -> MetalTableValue? {
        if let parse { return parse(text) }
        let t = text.trimmingCharacters(in: .whitespaces)
        switch column.kind {
        case .number, .currency, .percent, .delta, .progress:
            if t.isEmpty { return MetalTableValue.none }
            let bare = t.replacingOccurrences(of: "−", with: "-").replacingOccurrences(of: ",", with: "").replacingOccurrences(of: "%", with: "")
            guard let n = Double(bare) else { return nil }
            return .number(column.kind == .percent || column.kind == .progress ? n / 100 : n)
        case .text: return .text(text)
        case .code: return .code(t)
        case .tags: return .tags(t.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty })
        case .yes, .check:
            switch t.lowercased() {
            case "true", "yes", "1", "x": return .yes(true)
            case "false", "no", "0", "": return .yes(false)
            default: return nil
            }
        default: return nil
        }
    }
}

public struct MetalDataGrid<Row: Identifiable>: View where Row.ID: Hashable {
    struct CellID: Hashable { let row: Row.ID; let column: String }

    let rows: [Row]
    let columns: [MetalDataGridColumn<Row>]
    let caption: String
    let density: MetalTableDensity
    let now: Date
    let onCommit: (Row, String, MetalTableValue) async throws -> Void
    private let order: Binding<[String]>?

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @FocusState private var focus: CellID?
    @FocusState private var editorFocused: Bool
    @State private var editing: CellID?
    @State private var draft = ""
    @State private var saving: [CellID: MetalTableValue] = [:]
    @State private var failed: Set<CellID> = []
    @State private var refusals: [CellID: Int] = [:]
    @State private var ownOrder: [String] = []

    /// - Parameters:
    ///   - onCommit: a cell changed (row, column id, value): put it in `rows`; throw to put the old value back.
    ///   - columnOrder: the columns' ids in the person's order (headers dragged onto each other); the grid keeps its own without it.
    public init(_ rows: [Row], columns: [MetalDataGridColumn<Row>], caption: String, density: MetalTableDensity = .regular, now: Date = Date(),
                columnOrder: Binding<[String]>? = nil, onCommit: @escaping (Row, String, MetalTableValue) async throws -> Void) {
        self.rows = rows
        self.columns = columns
        self.caption = caption
        self.density = density
        self.now = now
        self.order = columnOrder
        self.onCommit = onCommit
    }

    private var m: MetalTableMetrics { MetalTableMetrics(density) }
    private var recipe: MetalObjectRecipe { MetalRecipes.dataGrid }
    private var orderNow: [String] { order?.wrappedValue ?? ownOrder }
    private var shown: [MetalDataGridColumn<Row>] {
        let o = orderNow
        return columns.enumerated().sorted { a, b in
            (o.firstIndex(of: a.element.id) ?? o.count + a.offset) < (o.firstIndex(of: b.element.id) ?? o.count + b.offset)
        }.map(\.element)
    }

    public var body: some View {
        let t = colorway.tokens
        VStack(alignment: .leading, spacing: MetalRecipes.table.points("caption.gap")) {
            Text(caption).font(.metal(MetalType.title)).foregroundStyle(t.ink.color)
            Grid(horizontalSpacing: .zero, verticalSpacing: .zero) {
                GridRow {
                    ForEach(shown) { c in header(c) }
                }
                ForEach(rows) { row in
                    GridRow {
                        ForEach(shown) { c in cell(c, row: row) }
                    }
                }
            }
            .font(.metal(MetalType.ui))
            .foregroundStyle(t.ink.color)
            .onKeyPress(phases: .down) { press in key(press) }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(caption)
    }

    // MARK: - Head

    private func header(_ c: MetalDataGridColumn<Row>) -> some View {
        let unit = c.column.format.headerUnit(for: c.column.kind)
        return MetalLabel(unit.map { "\(c.column.header) (\($0))" } ?? c.column.header, style: .engraved)
            .frame(maxWidth: .infinity, alignment: c.column.alignment)
            .padding(.horizontal, m.padX)
            .frame(height: m.head)
            .overlay(alignment: .bottom) { MetalRule(.horizontal) }
            .overlay(alignment: .leading) { if c.id != shown.first?.id { MetalRule(.vertical) } }
            .contentShape(Rectangle())
            .draggable(c.id)
            .dropDestination(for: String.self) { ids, _ in
                guard let moved = ids.first, moved != c.id else { return false }
                var next = shown.map(\.id).filter { $0 != moved }
                next.insert(moved, at: next.firstIndex(of: c.id) ?? next.endIndex)
                if let order { order.wrappedValue = next } else { ownOrder = next }
                return true
            }
            .accessibilityAddTraits(.isHeader)
            .accessibilityHint("Drag onto another header to move the column there")
    }

    // MARK: - Cells

    private func value(_ c: MetalDataGridColumn<Row>, _ row: Row) -> MetalTableValue {
        saving[CellID(row: row.id, column: c.id)] ?? c.column.value(row)
    }

    private func name(of row: Row) -> String {
        if case .text(let s, _) = columns.first?.column.value(row) { return s }
        return "\(row.id)"
    }

    @ViewBuilder private func cell(_ c: MetalDataGridColumn<Row>, row: Row) -> some View {
        let id = CellID(row: row.id, column: c.id)
        let isEditing = editing == id
        let ring = failed.contains(id) ? MetalShared.red.color : focus == id && !isEditing ? MetalShared.focus.color : Color.clear
        let v = value(c, row)
        Group {
            if isEditing {
                TextField(c.column.header, text: $draft)
                    .textFieldStyle(.plain)
                    .focused($editorFocused)
                    .onAppear { editorFocused = true }
                    .onSubmit { commit(id, row: row, c: c) }
                    #if os(macOS)
                    .onExitCommand { cancel(id) }
                    #endif
                    .padding(.horizontal, recipe.points("editor.inset"))
                    .frame(maxHeight: .infinity)
                    .overlay { RoundedRectangle(cornerRadius: MetalRadius.key).strokeBorder(MetalShared.focus.color, lineWidth: MetalRing.focusWidth) }
                    .padding(recipe.points("editor.inset"))
            } else {
                MetalTableCell(c.column.kind, v, format: c.column.format, label: c.column.header, now: now)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity, alignment: c.column.alignment)
                    .padding(.horizontal, m.padX)
                    .opacity(saving[id] != nil ? recipe.scalar("saving.dim") : .one)
            }
        }
        .frame(minHeight: m.row)
        .overlay(alignment: .bottom) { MetalRule(.horizontal) }
        .overlay(alignment: .leading) { if c.id != shown.first?.id { MetalRule(.vertical) } }
        .overlay { Rectangle().strokeBorder(ring, lineWidth: recipe.points("active.width")).allowsHitTesting(false) }
        .contentShape(Rectangle())
        .focusable(!isEditing)
        .focused($focus, equals: id)
        .focusEffectDisabled()
        .onTapGesture(count: 2) { startEdit(id, row: row, c: c, typed: nil) }
        .onTapGesture { focus = id }
        .keyframeAnimator(initialValue: Double.zero, trigger: refusals[id, default: .zero]) { view, nudge in
            view.offset(x: nudge)
        } keyframes: { _ in
            KeyframeTrack {
                LinearKeyframe(reduceMotion ? .zero : MetalRadius.nest, duration: .zero)
                SpringKeyframe(.zero, duration: MetalSprings.refusal.duration,
                               spring: Spring(mass: .one, stiffness: MetalSprings.refusal.stiffness, damping: MetalSprings.refusal.damping))
            }
        }
        #if os(macOS)
        .onCopyCommand { [NSItemProvider(object: c.text(v) as NSString)] }
        .onPasteCommand(of: [.plainText]) { providers in paste(providers, into: id, row: row, c: c) }
        #endif
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(c.column.header), \(name(of: row))")
        .accessibilityValue(c.text(v))
        .accessibilityHint(c.editable(row) ? "Press Return to edit" : "")
    }

    // MARK: - Keys, edits, saves

    private func key(_ press: KeyPress) -> KeyPress.Result {
        guard editing == nil, let at = focus else { return .ignored }
        let ids = shown.map(\.id)
        guard let ri = rows.firstIndex(where: { $0.id == at.row }), let ci = ids.firstIndex(of: at.column) else { return .ignored }
        let move = { (r: Int, c: Int) -> KeyPress.Result in
            let r2 = min(max(ri + r, .zero), rows.count - 1), c2 = min(max(ci + c, .zero), ids.count - 1)
            focus = CellID(row: rows[r2].id, column: ids[c2])
            return .handled
        }
        switch press.key {
        case .upArrow: return move(-1, .zero)
        case .downArrow: return move(1, .zero)
        case .leftArrow: return move(.zero, -1)
        case .rightArrow: return move(.zero, 1)
        case .home: return move(.zero, -ci)
        case .end: return move(.zero, ids.count - 1 - ci)
        case .return:
            if let row = rows.first(where: { $0.id == at.row }), let c = columns.first(where: { $0.id == at.column }) { startEdit(at, row: row, c: c, typed: nil) }
            return .handled
        default:
            guard !press.modifiers.contains(.command), let ch = press.characters.first, ch.isLetter || ch.isNumber || ch.isPunctuation || ch == "-",
                  let row = rows.first(where: { $0.id == at.row }), let c = columns.first(where: { $0.id == at.column }) else { return .ignored }
            startEdit(at, row: row, c: c, typed: press.characters)
            return .handled
        }
    }

    private func startEdit(_ id: CellID, row: Row, c: MetalDataGridColumn<Row>, typed: String?) {
        guard c.editable(row) else { refusals[id, default: .zero] += 1; return }
        if c.column.kind == .yes || c.column.kind == .check {
            if typed == nil, case .yes(let on) = value(c, row) { save(id, row: row, c: c, value: .yes(!on)) }
            return
        }
        draft = typed ?? c.text(value(c, row))
        editing = id
    }

    private func cancel(_ id: CellID) {
        editing = nil
        focus = id
    }

    private func commit(_ id: CellID, row: Row, c: MetalDataGridColumn<Row>) {
        guard let next = c.read(draft) else { refusals[id, default: .zero] += 1; return }
        editing = nil
        // Return goes down a row, as in a spreadsheet.
        if let i = rows.firstIndex(where: { $0.id == id.row }), i + 1 < rows.count { focus = CellID(row: rows[i + 1].id, column: id.column) } else { focus = id }
        save(id, row: row, c: c, value: next)
    }

    /// Shows the new value while it saves; a throw puts the old one back, shakes the cell and rings it red.
    private func save(_ id: CellID, row: Row, c: MetalDataGridColumn<Row>, value next: MetalTableValue) {
        guard c.text(next) != c.text(c.column.value(row)) else { return }
        failed.remove(id)
        saving[id] = next
        Task { @MainActor in
            do {
                try await onCommit(row, c.id, next)
                saving[id] = nil
            } catch {
                saving[id] = nil
                failed.insert(id)
                refusals[id, default: .zero] += 1
                AccessibilityNotification.Announcement("Couldn’t save \(c.column.header) for \(name(of: row))").post()
            }
        }
    }

    #if os(macOS)
    private func paste(_ providers: [NSItemProvider], into id: CellID, row: Row, c: MetalDataGridColumn<Row>) {
        guard c.editable(row), let provider = providers.first else { refusals[id, default: .zero] += 1; return }
        _ = provider.loadObject(ofClass: NSString.self) { object, _ in
            guard let text = (object as? String)?.components(separatedBy: CharacterSet(charactersIn: "\t\n")).first else { return }
            Task { @MainActor in
                if let next = c.read(text) { save(id, row: row, c: c, value: next) } else { refusals[id, default: .zero] += 1 }
            }
        }
    }
    #endif
}
