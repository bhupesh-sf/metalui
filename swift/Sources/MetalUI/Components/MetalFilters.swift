import SwiftUI

// Filters: a row of conditions you build and change in place, each read as a sentence ("Status is Open").
//   tokens   the combobox chip's plate: the field's glyph and name (ink2), the operator key (ink2), the value
//            key (ink), the mini remove key; keys hover with the menu row's plate
//   add      Filter (the compact cap, the filter glyph) opens the menu of fields; a new token lands on the
//            object spring with its editor open
//   operator a menu of the type's operators; a change keeps the value where it still means something
//   value    a popover with the editor: a field, a number field (two for between), a ticked list (a search
//            well past the threshold, chosen first), a calendar with Cancel and Apply
//   empty    an editor closed with nothing in it takes its token away again (release)
//   clear    with two or more tokens
// Every number is the filters, combobox, chip, menu, popover or attachment recipe's. Reduce Motion: at once.

public enum MetalFilterType: Sendable { case text, number, select, multiselect, boolean, date }

public enum MetalFilterOp: String, Sendable, CaseIterable {
    case contains, `is`, isNot = "is-not", starts, ends, empty, notEmpty = "not-empty", gt, lt, between, before, after, any, all, none

    static func ops(for type: MetalFilterType) -> [MetalFilterOp] {
        switch type {
        case .text: [.contains, .is, .starts, .ends, .empty, .notEmpty]
        case .number: [.is, .isNot, .gt, .lt, .between, .empty]
        case .select: [.is, .isNot, .empty]
        case .multiselect: [.any, .all, .none]
        case .boolean: [.is]
        case .date: [.is, .before, .after, .between, .empty]
        }
    }

    static func first(for type: MetalFilterType) -> MetalFilterOp {
        switch type {
        case .text: .contains
        case .number: .gt
        case .multiselect: .any
        default: .is
        }
    }

    var needsValue: Bool { self != .empty && self != .notEmpty }

    /// The operator's words; a select's follow the count ("is" → "is any of").
    public func words(_ type: MetalFilterType, count: Int = 1) -> String {
        if type == .select && count > 1 && self == .is { return "is any of" }
        if type == .select && count > 1 && self == .isNot { return "is none of" }
        switch self {
        case .contains: return "contains"
        case .is: return "is"
        case .isNot: return "isn’t"
        case .starts: return "starts with"
        case .ends: return "ends with"
        case .empty: return "is empty"
        case .notEmpty: return "isn’t empty"
        case .gt: return "more than"
        case .lt: return "less than"
        case .between: return "between"
        case .before: return "before"
        case .after: return "after"
        case .any: return "has any of"
        case .all: return "has all of"
        case .none: return "has none of"
        }
    }
}

/// What can be filtered.
public struct MetalFilterField: Identifiable, Sendable {
    public let id: String
    public let label: String
    public let type: MetalFilterType
    public let icon: MetalIconName?
    public let options: [MetalFilterOption]
    public let unit: String?

    public init(_ id: String, label: String, type: MetalFilterType, icon: MetalIconName? = nil, options: [MetalFilterOption] = [], unit: String? = nil) {
        self.id = id
        self.label = label
        self.type = type
        self.icon = icon
        self.options = options
        self.unit = unit
    }
}

public struct MetalFilterOption: Sendable, Hashable {
    public let value: String
    public let label: String
    public init(_ value: String, label: String) {
        self.value = value
        self.label = label
    }
}

/// One condition. The value lives in the slot its field's type uses: `text`, `number` (and `upper` for between),
/// `options`, `flag`, `day` (and `lastDay` for between).
public struct MetalFilterCondition: Identifiable, Equatable, Sendable {
    public var id: String
    public var field: String
    public var op: MetalFilterOp
    public var text: String
    public var number: Double?
    public var upper: Double?
    public var options: [String]
    public var flag: Bool
    public var day: Date?
    public var lastDay: Date?

    public init(id: String = UUID().uuidString, field: String, op: MetalFilterOp, text: String = "", number: Double? = nil, upper: Double? = nil,
                options: [String] = [], flag: Bool = true, day: Date? = nil, lastDay: Date? = nil) {
        self.id = id
        self.field = field
        self.op = op
        self.text = text
        self.number = number
        self.upper = upper
        self.options = options
        self.flag = flag
        self.day = day
        self.lastDay = lastDay
    }

    /// It has what its operator needs; an incomplete condition is never applied.
    public func isComplete(_ type: MetalFilterType) -> Bool {
        guard op.needsValue else { return true }
        switch type {
        case .text: return !text.trimmingCharacters(in: .whitespaces).isEmpty
        case .number: return number != nil && (op != .between || upper != nil)
        case .select, .multiselect: return !options.isEmpty
        case .boolean: return true
        case .date: return day != nil && (op != .between || lastDay != nil)
        }
    }

    func valueWords(_ field: MetalFilterField) -> String {
        switch field.type {
        case .text: return "“\(text)”"
        case .number:
            let f = { (x: Double?) in x.map { $0.formatted(.number) } ?? "…" }
            let unit = field.unit.map { " \($0)" } ?? ""
            return op == .between ? "\(f(number)) and \(f(upper))\(unit)" : "\(f(number))\(unit)"
        case .select, .multiselect:
            let labels = options.map { v in field.options.first { $0.value == v }?.label ?? v }
            if labels.isEmpty { return "…" }
            return labels.count <= 2 ? labels.joined(separator: ", ") : "\(labels[0]) +\(labels.count - 1)"
        case .boolean: return flag ? "Yes" : "No"
        case .date:
            let f = { (d: Date?) in d.map { $0.formatted(.dateTime.day().month(.abbreviated)) } ?? "…" }
            return op == .between ? "\(f(day)) – \(f(lastDay))" : f(day)
        }
    }

    /// The condition as a sentence: "Status is any of Open, Paused".
    public func sentence(_ field: MetalFilterField) -> String {
        let words = op.words(field.type, count: options.count)
        return op.needsValue ? "\(field.label) \(words) \(valueWords(field))" : "\(field.label) \(words)"
    }

    func keeps(_ raw: Any?, type: MetalFilterType) -> Bool {
        let calendar = Calendar.current
        switch type {
        case .text:
            let s = (raw.map { "\($0)" } ?? "").lowercased()
            let q = text.lowercased()
            switch op {
            case .empty: return s.trimmingCharacters(in: .whitespaces).isEmpty
            case .notEmpty: return !s.trimmingCharacters(in: .whitespaces).isEmpty
            case .is: return s == q
            case .starts: return s.hasPrefix(q)
            case .ends: return s.hasSuffix(q)
            default: return s.contains(q)
            }
        case .number:
            let n: Double? = (raw as? Double) ?? (raw as? Int).map(Double.init)
            if op == .empty { return n == nil }
            guard let n, let x = number else { return false }
            switch op {
            case .between: let y = upper ?? x; return n >= min(x, y) && n <= max(x, y)
            case .isNot: return n != x
            case .gt: return n > x
            case .lt: return n < x
            default: return n == x
            }
        case .select:
            let s = raw.map { "\($0)" }
            if op == .empty { return s?.isEmpty ?? true }
            let hit = s.map(options.contains) ?? false
            return op == .isNot ? !hit : hit
        case .multiselect:
            let has = (raw as? [String]) ?? []
            if op == .all { return options.allSatisfy(has.contains) }
            let any = options.contains(where: has.contains)
            return op == .none ? !any : any
        case .boolean:
            return ((raw as? Bool) ?? false) == flag
        case .date:
            guard let d = raw as? Date else { return op == .empty }
            if op == .empty { return false }
            let day = calendar.startOfDay(for: d)
            guard let a = self.day.map(calendar.startOfDay) else { return false }
            switch op {
            case .before: return day < a
            case .after: return day > a
            case .between: let b = calendar.startOfDay(for: lastDay ?? a); return day >= min(a, b) && day <= max(a, b)
            default: return day == a
            }
        }
    }
}

/// A row of conditions you build and change in place.
///
///     MetalFilters("Invoice filters", fields: fields, conditions: $filters)
///     let rows = MetalFilters.apply(filters, to: invoices, fields: fields) { row, field in row[field] }
public struct MetalFilters: View {
    private let label: String
    private let fields: [MetalFilterField]
    @Binding private var conditions: [MetalFilterCondition]
    private let addLabel: String

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var adding = false
    @State private var editing: String?

    public init(_ label: String = "Filters", fields: [MetalFilterField], conditions: Binding<[MetalFilterCondition]>, addLabel: String = "Filter") {
        self.label = label
        self.fields = fields
        self._conditions = conditions
        self.addLabel = addLabel
    }

    /// The rows every complete condition keeps ("and"). `value` reads a row's field.
    public static func apply<Row>(_ conditions: [MetalFilterCondition], to rows: [Row], fields: [MetalFilterField], value: (Row, String) -> Any?) -> [Row] {
        let live = conditions.compactMap { c in fields.first { $0.id == c.field }.map { (c, $0) } }.filter { $0.0.isComplete($0.1.type) }
        return rows.filter { row in live.allSatisfy { c, f in c.keeps(value(row, f.id), type: f.type) } }
    }

    /// Every complete condition as one sentence, joined by "and".
    public static func describe(_ conditions: [MetalFilterCondition], fields: [MetalFilterField]) -> String {
        conditions.compactMap { c in fields.first { $0.id == c.field }.flatMap { f in c.isComplete(f.type) ? c.sentence(f) : nil } }
            .joined(separator: " and ")
    }

    public var body: some View {
        let recipe = MetalRecipes.filters
        MetalComboboxFlow(spacing: recipe.points("bar.gap")) {
            ForEach($conditions) { $condition in
                if let field = fields.first(where: { $0.id == condition.field }) {
                    MetalFilterToken(condition: $condition, field: field, editing: $editing,
                                     onRemove: { remove([condition.id]) }, onClose: { close(condition.id) })
                }
            }
            MetalButton(addLabel, size: .compact, action: { adding = true }) {
                MetalIcon(.filter, size: recipe.points("seg.glyph"))
            }
            .metalMenu(isPresented: $adding, heading: "Filter by", items: fields.map { f in MetalMenuItem(f.label, icon: f.icon) { add(f) } })
            if conditions.count >= 2 {
                MetalButton("Clear", size: .compact) { remove(conditions.map(\.id)) }
                    .transition(.opacity)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(label)
    }

    private func add(_ field: MetalFilterField) {
        let c = MetalFilterCondition(field: field.id, op: MetalFilterOp.first(for: field.type))
        withMetalAnimation(.object, reduceMotion: reduceMotion) { conditions.append(c) }
        if field.type != .boolean { editing = c.id }
    }

    private func remove(_ ids: [String]) {
        withMetalAnimation(.release, reduceMotion: reduceMotion) { conditions.removeAll { ids.contains($0.id) } }
    }

    private func close(_ id: String) {
        editing = nil
        guard let c = conditions.first(where: { $0.id == id }), let f = fields.first(where: { $0.id == c.field }) else { return }
        if !c.isComplete(f.type) { remove([id]) }
    }
}

private struct MetalFilterToken: View {
    @Binding var condition: MetalFilterCondition
    let field: MetalFilterField
    @Binding var editing: String?
    let onRemove: () -> Void
    let onClose: () -> Void

    @Environment(\.metalColorway) private var colorway
    @State private var choosingOp = false
    @State private var choosingFlag = false

    var body: some View {
        let recipe = MetalRecipes.filters
        let t = colorway.tokens
        let ops = MetalFilterOp.ops(for: field.type)
        let opWords = condition.op.words(field.type, count: condition.options.count)
        HStack(spacing: recipe.points("token.gap")) {
            HStack(spacing: recipe.points("seg.glyph-gap")) {
                if let icon = field.icon { MetalIcon(icon, size: recipe.points("seg.glyph")) }
                Text(field.label)
            }
            .foregroundColor(t.ink2.color)
            .padding(.trailing, recipe.points("seg.pad-x"))
            if ops.count > 1 {
                MetalFilterKey(opWords, ink: t.ink2.color, open: choosingOp) { choosingOp = true }
                    .accessibilityLabel("Operator: \(opWords)")
                    .metalMenu(isPresented: $choosingOp, heading: field.label, items: ops.map { op in
                        MetalMenuItem(op.words(field.type, count: condition.options.count), icon: op == condition.op ? .check : nil) { change(op) }
                    })
            } else {
                Text(opWords).foregroundColor(t.ink2.color).padding(.horizontal, recipe.points("seg.pad-x"))
            }
            if condition.op.needsValue { valueKey }
            MetalIconButton("Remove \(condition.sentence(field))", variant: .mini, action: onRemove) {
                MetalIcon(.close, size: MetalRecipes.attachment.points("remove.glyph"))
            }
        }
        .font(.metal(MetalType.ui))
        .lineLimit(1)
        .padding(.leading, recipe.points("token.pad-start"))
        .padding(.trailing, recipe.points("token.pad-end"))
        .frame(height: recipe.points("token.height"))
        .metalObjectRecipe(MetalRecipes.combobox, part: "chip", in: Capsule(style: .continuous))
        .fixedSize()
        .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: -MetalRadius.nest)),
                                removal: .opacity.combined(with: .offset(y: MetalRadius.nest))))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(condition.sentence(field))
    }

    @ViewBuilder private var valueKey: some View {
        let words = condition.valueWords(field)
        let ink = colorway.tokens.ink.color
        if field.type == .boolean {
            MetalFilterKey(words, ink: ink, open: choosingFlag) { choosingFlag = true }
                .accessibilityLabel("Value: \(words)")
                .metalMenu(isPresented: $choosingFlag, heading: field.label, items: [true, false].map { b in
                    MetalMenuItem(b ? "Yes" : "No", icon: condition.flag == b ? .check : nil) { condition.flag = b }
                })
        } else {
            let shown = Binding(get: { editing == condition.id }, set: { open in if open { editing = condition.id } else if editing == condition.id { onClose() } })
            MetalFilterKey(words, ink: ink, open: shown.wrappedValue) { editing = condition.id }
                .accessibilityLabel("Value: \(words)")
                .popover(isPresented: shown, arrowEdge: .bottom) {
                    MetalFilterEditor(condition: $condition, field: field, onDone: onClose)
                        .padding(MetalRecipes.popover.points("self.pad"))
                        .metalColorway(colorway)
                }
        }
    }

    private func change(_ op: MetalFilterOp) {
        guard op != condition.op else { return }
        let wasRange = condition.op == .between
        condition.op = op
        if wasRange != (op == .between) && field.type == .date && op == .between { condition.lastDay = condition.day }
        if !condition.isComplete(field.type) { editing = condition.id }
    }
}

/// A key inside a token: words on the menu row's hover plate while hovered or open.
private struct MetalFilterKey: View {
    let words: String
    let ink: Color
    let open: Bool
    let action: () -> Void
    @State private var hovered = false

    init(_ words: String, ink: Color, open: Bool, action: @escaping () -> Void) {
        self.words = words
        self.ink = ink
        self.open = open
        self.action = action
    }

    var body: some View {
        let recipe = MetalRecipes.filters
        let shape = RoundedRectangle(cornerRadius: recipe.points("seg.radius"), style: .continuous)
        Button(action: action) {
            Text(words)
                .foregroundColor(ink)
                .contentTransition(.numericText())
                .padding(.horizontal, recipe.points("seg.pad-x"))
                .frame(height: recipe.points("seg.height"))
                .background { if hovered || open { Color.clear.metalObjectRecipe(MetalRecipes.menu, part: "row", state: "hover", in: shape) } }
                .contentShape(shape)
        }
        .buttonStyle(.plain)
        .onHover { hovered = $0 }
    }
}

private struct MetalFilterEditor: View {
    @Binding var condition: MetalFilterCondition
    let field: MetalFilterField
    let onDone: () -> Void
    @State private var query = ""
    @State private var order: [MetalFilterOption] = []
    @State private var draft: Date?
    @State private var draftRange: MetalDateRange?

    var body: some View {
        let recipe = MetalRecipes.filters
        let name = "\(field.label) \(condition.op.words(field.type, count: condition.options.count))"
        VStack(alignment: .leading, spacing: recipe.points("editor.gap")) {
            switch field.type {
            case .text:
                MetalField(name, text: $condition.text, size: .compact).onSubmit(onDone)
            case .number:
                MetalNumberField(condition.op == .between ? "\(name), from" : name, value: $condition.number, in: -Double.greatestFiniteMagnitude...Double.greatestFiniteMagnitude, size: .compact, unit: field.unit)
                if condition.op == .between {
                    Text("and").font(.metal(MetalType.ui))
                    MetalNumberField("\(name), to", value: $condition.upper, in: -Double.greatestFiniteMagnitude...Double.greatestFiniteMagnitude, size: .compact, unit: field.unit)
                }
            case .select, .multiselect:
                if Double(field.options.count) > recipe.points("editor.search") {
                    MetalField("Find \(field.label.lowercased())", text: $query, prompt: "Find \(field.label.lowercased())", size: .compact, icon: .search)
                }
                ScrollView {
                    MetalCheckboxGroup(options: shownOptions.map { ($0.value, $0.label) }, selection: Binding(
                        get: { Set(condition.options) },
                        set: { next in condition.options = field.options.map(\.value).filter(next.contains) }
                    ))
                }
                .frame(maxHeight: recipe.points("editor.rows") * MetalRecipes.checkboxGroup.points("row.height"))
            case .date:
                if condition.op == .between {
                    MetalCalendar(name, selection: $draftRange, months: 2)
                } else {
                    MetalCalendar(name, selection: $draft)
                }
                HStack(spacing: recipe.points("editor.gap")) {
                    Spacer()
                    MetalButton("Cancel", size: .compact, action: onDone)
                    MetalButton("Apply", cap: .primary, size: .compact) {
                        if condition.op == .between { condition.day = draftRange?.start; condition.lastDay = draftRange?.end } else { condition.day = draft }
                        onDone()
                    }
                    .disabled(condition.op == .between ? draftRange?.end == nil : draft == nil)
                }
            case .boolean:
                EmptyView()
            }
        }
        .frame(minWidth: field.type == .date ? nil : recipe.points("editor.width"), alignment: .leading)
        .onAppear {
            // Chosen options first, in the order they had on opening; they stay put while it is open.
            order = field.options.filter { condition.options.contains($0.value) } + field.options.filter { !condition.options.contains($0.value) }
            draft = condition.day
            draftRange = condition.day.map { MetalDateRange(start: $0, end: condition.lastDay) }
        }
    }

    private var shownOptions: [MetalFilterOption] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let all = order.isEmpty ? field.options : order
        return q.isEmpty ? all : all.filter { $0.label.lowercased().contains(q) }
    }
}
