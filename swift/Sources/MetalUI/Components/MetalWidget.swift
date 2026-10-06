import SwiftUI

// Widget: a piece of interface a model sent as JSON, rendered with MetalUI's own views. Mirrors
// components/widget (widget.agent.md), reading the same spec (MetalWidgetSpec.generated.swift, from spec.ts):
//   parse     untrusted JSON: only spec'd nodes and props pass; strings are text; URLs only http, https or
//             mailto; depth 8 and 200 nodes at most; what fails becomes a fallback or is dropped
//   render    each node is the view it names, in a column (the widget recipe's gap)
//   fallback  "Can't show this part", meta type in ink3, in place of a node that can't be shown
//   actions   a key hands the host its action and the fields' values by name; nothing runs on its own
// Nothing of its own moves; each view keeps its motion and its Reduce Motion.

/// What a key hands the host: its name and the model's payload (plain JSON data).
public struct MetalWidgetAction: Sendable, Equatable {
    public let name: String
    public let payload: Data?
}

public struct MetalWidgetOption: Sendable, Equatable, Hashable { public let value: String; public let label: String }
public struct MetalWidgetPair: Sendable, Equatable { public let label: String; public let value: String }

/// A prop's value after parsing.
public enum MetalWidgetValue: Sendable, Equatable {
    case text(String), number(Double), flag(Bool), nodes([MetalWidgetNode]), action(MetalWidgetAction), options([MetalWidgetOption]), pairs([MetalWidgetPair])
}

/// A node after parsing: a type of the spec with its valid props, or `Fallback`.
public struct MetalWidgetNode: Sendable, Equatable {
    public let type: String
    public let props: [String: MetalWidgetValue]

    static let fallback = MetalWidgetNode(type: "Fallback", props: [:])

    /// Validates widget JSON against the spec. Never throws: what fails is a fallback or dropped, and listed in `issues`.
    public static func parse(_ data: Data) -> (nodes: [MetalWidgetNode], issues: [String]) {
        var parser = Parser()
        guard let root = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]) else { return ([.fallback], ["not JSON"]) }
        let roots = (root as? [Any]) ?? [root]
        let nodes = roots.prefix(MetalWidgetSpec.items).compactMap { raw -> MetalWidgetNode? in
            guard let n = parser.node(raw, depth: 1) else { return nil }
            return n.type != "Fallback" && MetalWidgetSpec.nested.contains(n.type) ? parser.fail("\(n.type) can't stand here") : n
        }
        return (nodes, parser.issues)
    }

    private struct Parser {
        var issues: [String] = []
        var count = 0

        mutating func fail(_ message: String) -> MetalWidgetNode { issues.append(message); return .fallback }

        mutating func node(_ raw: Any, depth: Int) -> MetalWidgetNode? {
            count += 1
            if count > MetalWidgetSpec.nodes { if count == MetalWidgetSpec.nodes + 1 { issues.append("more than \(MetalWidgetSpec.nodes) nodes") }; return nil }
            if depth > MetalWidgetSpec.depth { return fail("deeper than \(MetalWidgetSpec.depth)") }
            guard let object = raw as? [String: Any], let type = object["type"] as? String else { return fail("not a node") }
            guard let spec = MetalWidgetSpec.props[type] else { return fail("unknown node \(type.prefix(40))") }
            var props: [String: MetalWidgetValue] = [:]
            for (key, p) in spec {
                guard let given = object[key], !(given is NSNull) else {
                    if p.required { return fail("\(type) needs \(key)") }
                    continue
                }
                guard let v = value(p, given, depth: depth) else {
                    issues.append("\(type).\(key): not valid; dropped")
                    if p.required { return fail("\(type) needs \(key)") }
                    continue
                }
                props[key] = v
            }
            return MetalWidgetNode(type: type, props: props)
        }

        mutating func value(_ p: MetalWidgetSpec.Prop, _ v: Any, depth: Int) -> MetalWidgetValue? {
            switch p.kind {
            case .string:
                guard let s = v as? String else { return nil }
                return .text(String(s.prefix(Int(p.max ?? Double(MetalWidgetSpec.text)))))
            case .name:
                guard let s = v as? String, s.range(of: MetalWidgetSpec.name, options: .regularExpression) != nil else { return nil }
                return .text(s)
            case .number:
                guard let n = v as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID(), n.doubleValue.isFinite else { return nil }
                return .number(Swift.min(p.max ?? .infinity, Swift.max(p.min ?? -.infinity, n.doubleValue)))
            case .boolean:
                guard let n = v as? NSNumber, CFGetTypeID(n) == CFBooleanGetTypeID() else { return nil }
                return .flag(n.boolValue)
            case .choice:
                guard let s = v as? String, p.values.contains(s) else { return nil }
                return .text(s)
            case .url:
                let s = (v as? String)?.trimmingCharacters(in: .whitespaces) ?? ""
                guard s.range(of: MetalWidgetSpec.url, options: [.regularExpression, .caseInsensitive]) != nil, URL(string: s) != nil else { return nil }
                return .text(s)
            case .date:
                guard let s = v as? String, MetalWidgetNode.day(s) != nil else { return nil }
                return .text(s)
            case .action:
                guard let a = v as? [String: Any], a["type"] as? String == "action", let name = a["name"] as? String, !name.isEmpty, name.count <= 64 else { return nil }
                guard let payload = a["payload"] else { return .action(MetalWidgetAction(name: name, payload: nil)) }
                guard payload is [String: Any], let data = try? JSONSerialization.data(withJSONObject: payload), data.count <= MetalWidgetSpec.payload else { return nil }
                return .action(MetalWidgetAction(name: name, payload: data))
            case .nodes:
                guard let list = v as? [Any] else { return nil }
                return .nodes(list.prefix(MetalWidgetSpec.items).compactMap { child in
                    guard let n = node(child, depth: depth + 1) else { return nil }
                    if n.type == "Fallback" { return n }
                    let fits = p.values.isEmpty ? !MetalWidgetSpec.nested.contains(n.type) : p.values.contains(n.type)
                    return fits ? n : fail("\(n.type) can't stand here")
                })
            case .options:
                let out = ((v as? [Any]) ?? []).prefix(MetalWidgetSpec.items).compactMap { o -> MetalWidgetOption? in
                    guard let o = o as? [String: Any], let value = o["value"] as? String, let label = o["label"] as? String else { return nil }
                    return MetalWidgetOption(value: String(value.prefix(200)), label: String(label.prefix(200)))
                }
                return out.isEmpty ? nil : .options(out)
            case .pairs:
                let out = ((v as? [Any]) ?? []).prefix(MetalWidgetSpec.items).compactMap { o -> MetalWidgetPair? in
                    guard let o = o as? [String: Any], let label = o["label"] as? String else { return nil }
                    let value: String
                    if let s = o["value"] as? String { value = s } else if let n = o["value"] as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() { value = n.stringValue } else { return nil }
                    return MetalWidgetPair(label: String(label.prefix(200)), value: String(value.prefix(600)))
                }
                return out.isEmpty ? nil : .pairs(out)
            }
        }
    }

    /// A YYYY-MM-DD day in the current calendar, or nil.
    static func day(_ s: String) -> Date? {
        let parts = s.split(separator: "-").compactMap { Int($0) }
        guard s.count == 10, parts.count == 3 else { return nil }
        let c = DateComponents(year: parts[0], month: parts[1], day: parts[2])
        guard c.isValidDate(in: .current) else { return nil }
        return Calendar.current.date(from: c)
    }

    func text(_ key: String) -> String? { if case .text(let s) = props[key] { return s }; return nil }
    func number(_ key: String) -> Double? { if case .number(let n) = props[key] { return n }; return nil }
    func flag(_ key: String) -> Bool { if case .flag(let b) = props[key] { return b }; return false }
    func nodes(_ key: String) -> [MetalWidgetNode] { if case .nodes(let n) = props[key] { return n }; return [] }
    func action(_ key: String) -> MetalWidgetAction? { if case .action(let a) = props[key] { return a }; return nil }
}

/// Renders widget JSON a model sent with MetalUI's views; keys hand their actions and the field values to `onAction`.
public struct MetalWidget: View {
    let nodes: [MetalWidgetNode]
    let onAction: (MetalWidgetAction, [String: String]) -> Void
    @State private var values: [String: String]

    public init(json: Data, onAction: @escaping (MetalWidgetAction, [String: String]) -> Void) {
        let nodes = MetalWidgetNode.parse(json).nodes
        self.nodes = nodes
        self.onAction = onAction
        var seed: [String: String] = [:]
        MetalWidget.seed(nodes, into: &seed)
        _values = State(initialValue: seed)
    }

    public init(json: String, onAction: @escaping (MetalWidgetAction, [String: String]) -> Void) {
        self.init(json: Data(json.utf8), onAction: onAction)
    }

    private static func seed(_ nodes: [MetalWidgetNode], into values: inout [String: String]) {
        for n in nodes {
            if ["Field", "Select", "DatePicker"].contains(n.type), let name = n.text("name") { values[name] = n.text("defaultValue") ?? "" }
            for case .nodes(let children) in n.props.values { seed(children, into: &values) }
        }
    }

    public var body: some View {
        MetalWidgetStack(nodes: nodes, values: $values) { onAction($0, values) }
    }
}

private struct MetalWidgetStack: View {
    let nodes: [MetalWidgetNode]
    @Binding var values: [String: String]
    let act: (MetalWidgetAction) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.widget.points("self.gap")) {
            ForEach(nodes.indices, id: \.self) { i in MetalWidgetNodeView(node: nodes[i], values: $values, act: act) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct MetalWidgetNodeView: View {
    let node: MetalWidgetNode
    @Binding var values: [String: String]
    let act: (MetalWidgetAction) -> Void
    @Environment(\.openURL) private var openURL
    @Environment(\.metalColorway) private var colorway

    private func stack(_ key: String) -> AnyView { AnyView(MetalWidgetStack(nodes: node.nodes(key), values: $values, act: act)) }
    private func keys(_ key: String) -> AnyView {
        AnyView(HStack(spacing: MetalRecipes.alert.points("self.actions-gap")) {
            ForEach(node.nodes(key).indices, id: \.self) { i in MetalWidgetNodeView(node: node.nodes(key)[i], values: $values, act: act) }
        })
    }
    private func value(_ name: String) -> Binding<String> {
        Binding(get: { values[name] ?? "" }, set: { values[name] = $0 })
    }
    private func labelled<V: View>(_ control: V) -> some View {
        MetalFormField(node.text("label") ?? node.text("name") ?? "") { control }
    }

    var body: some View {
        switch node.type {
        case "Card": card
        case "List":
            VStack(alignment: .leading, spacing: .zero) { stack("children") }
                .accessibilityElement(children: .contain)
                .accessibilityLabel(node.text("label") ?? "")
        case "ListItem": listItem
        case "Badge":
            MetalBadge(node.text("text") ?? "", led: led(node.text("led")), size: node.text("size") == "compact" ? .compact : .regular)
        case "Button":
            if let action = node.action("action") {
                MetalButton(node.text("label") ?? "", cap: cap(node.text("cap")), size: node.text("size") == "compact" ? .compact : .default) { act(action) }
                    .disabled(node.flag("disabled"))
            }
        case "Field":
            labelled(MetalField(node.text("label") ?? node.text("name") ?? "", text: value(node.text("name") ?? ""), prompt: node.text("placeholder") ?? "",
                                size: MetalFieldSize(rawValue: node.text("size") ?? "regular") ?? .regular))
        case "Select":
            labelled(MetalSelect(node.text("label") ?? node.text("name") ?? "", selection: choice(node.text("name") ?? ""),
                                 options: options.map { MetalSelectOption($0.value, label: $0.label) }, placeholder: node.text("placeholder") ?? "",
                                 size: node.text("size") == "compact" ? .compact : .regular))
        case "DatePicker":
            labelled(MetalDatePicker(node.text("label") ?? node.text("name") ?? "", selection: day(node.text("name") ?? ""), in: bounds,
                                     size: node.text("size") == "compact" ? .compact : .regular))
        case "Properties":
            if case .pairs(let pairs) = node.props["items"] {
                MetalProperties(size: node.text("size") == "compact" ? .compact : .regular, pairs.map { MetalProperty($0.label, text: $0.value) })
            }
        case "Markdown": MetalMarkdown(MetalWidgetNodeView.safeLinks(node.text("text") ?? ""))
        case "Progress":
            MetalProgress(node.text("label"), value: node.number("value"), total: 100, state: progressState, showValue: node.number("value") != nil)
        case "Meter":
            let low = node.number("min") ?? .zero
            let high = Swift.max(low + 1, node.number("max") ?? 100)
            MetalMeter(node.text("label") ?? "", value: Swift.min(high, Swift.max(low, node.number("value") ?? low)), in: low...high)
        case "Alert":
            MetalAlert(kind: alertKind, title: node.text("title"), description: node.text("description"), actions: {
                if !node.nodes("actions").isEmpty { keys("actions") }
            })
        default:
            Text("Can't show this part")
                .font(.metal(MetalType.meta))
                .foregroundColor(colorway.tokens.ink3.color)
        }
    }

    private var card: some View {
        let href = node.text("href").flatMap(URL.init(string:))
        let body = node.nodes("children")
        let footer = node.nodes("footer")
        return MetalCard(node.text("title") ?? "", description: node.text("description"), status: cardStatus,
                         size: node.text("size") == "compact" ? .compact : nil, open: href.map { url in { openURL(url) } },
                         media: { EmptyView() }) {
            if !body.isEmpty || !footer.isEmpty {
                VStack(alignment: .leading, spacing: MetalRecipes.widget.points("self.gap")) {
                    if !body.isEmpty { stack("children") }
                    if !footer.isEmpty { keys("footer") }
                }
            }
        }
    }

    @ViewBuilder private var listItem: some View {
        let row = MetalRow(.panel, lead: { EmptyView() }, text: {
            VStack(alignment: .leading, spacing: .zero) {
                MetalRowText(node.text("text") ?? "")
                if let detail = node.text("detail") {
                    Text(detail).font(.metal(MetalType.meta)).foregroundColor(colorway.tokens.ink2.color)
                }
            }
        }, trail: {
            if let badge = node.text("badge") { MetalBadge(badge, size: .compact) }
        })
        if let action = node.action("action") {
            Button { act(action) } label: { row }.buttonStyle(.plain)
        } else {
            row
        }
    }

    private var options: [MetalWidgetOption] { if case .options(let o) = node.props["options"] { return o }; return [] }
    private func choice(_ name: String) -> Binding<String?> {
        Binding(get: { values[name].flatMap { v in options.contains { $0.value == v } ? v : nil } }, set: { values[name] = $0 ?? "" })
    }
    private func day(_ name: String) -> Binding<Date?> {
        Binding(get: { values[name].flatMap(MetalWidgetNode.day) }, set: { values[name] = $0.map(MetalWidgetNodeView.iso) ?? "" })
    }
    private var bounds: ClosedRange<Date>? {
        let low = node.text("min").flatMap(MetalWidgetNode.day) ?? .distantPast
        let high = node.text("max").flatMap(MetalWidgetNode.day) ?? .distantFuture
        return low <= high && (node.text("min") != nil || node.text("max") != nil) ? low...high : nil
    }
    private static func iso(_ d: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year ?? .zero, c.month ?? .zero, c.day ?? .zero)
    }
    /// Markdown links that are not http, https or mailto become their words.
    static func safeLinks(_ text: String) -> String {
        guard let re = try? NSRegularExpression(pattern: #"\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)"#) else { return text }
        var out = text
        for m in re.matches(in: text, range: NSRange(text.startIndex..., in: text)).reversed() {
            guard let all = Range(m.range, in: text), let words = Range(m.range(at: 1), in: text), let url = Range(m.range(at: 2), in: text) else { continue }
            if text[url].range(of: MetalWidgetSpec.url, options: [.regularExpression, .caseInsensitive]) == nil { out.replaceSubrange(all, with: text[words]) }
        }
        return out
    }

    private func led(_ s: String?) -> MetalLEDKind? {
        switch s { case "live": .live; case "waiting": .waiting; case "failed": .failed; case "off": .off; default: nil }
    }
    private func cap(_ s: String?) -> MetalButtonCap {
        switch s { case "primary": .primary; case "destructive": .destructive; default: .standard }
    }
    private var cardStatus: MetalCardStatus? {
        switch node.text("status") { case "live": .live; case "waiting": .waiting; case "failed": .failed; default: nil }
    }
    private var progressState: MetalProgressState {
        switch node.text("state") { case "paused": .paused; case "failed": .failed; case "complete": .complete; default: .running }
    }
    private var alertKind: MetalAlertKind {
        switch node.text("kind") { case "done": .done; case "waiting": .waiting; case "urgent": .urgent; case "failed": .failed; default: .note }
    }
}
