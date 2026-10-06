import SwiftUI

// PROPERTIES, label and value pairs (properties.agent.md), from the generated properties, label and
// rule recipes, as the web draws them.
//
//   rest      engraved labels in a column as wide as the longest (up to 200), values beside them in ui
//             type and ink; each pair parted by the rule's hairline, the last one open
//   size      regular (pairs at least 32 tall) or compact (24)
//   values    text, or a MetalTableCell in its kind's look
//   narrow    under 280 wide the label stands above its value
// Nothing moves.

public enum MetalPropertiesSize: Sendable { case regular, compact }

/// One pair: an engraved label and its value. A missing value is "—" in ink3.
public struct MetalProperty: Identifiable {
    public let id = UUID()
    let label: String
    let value: AnyView?

    public init<Value: View>(_ label: String, @ViewBuilder value: () -> Value) {
        self.label = label
        self.value = AnyView(value())
    }

    public init(_ label: String, text: String?) {
        self.label = label
        self.value = text.map { AnyView(Text($0)) }
    }
}

/// Label and value pairs: a receipt, a details panel, a spec sheet.
public struct MetalProperties: View {
    let size: MetalPropertiesSize
    let items: [MetalProperty]
    @Environment(\.metalColorway) private var colorway

    public init(size: MetalPropertiesSize = .regular, _ items: [MetalProperty]) {
        self.size = size
        self.items = items
    }

    private var part: String { size == .compact ? "compact" : "self" }

    public var body: some View {
        let r = MetalRecipes.properties
        ViewThatFits(in: .horizontal) {
            Grid(alignment: .leading, horizontalSpacing: r.points("\(part).gap"), verticalSpacing: .zero) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    GridRow(alignment: .firstTextBaseline) {
                        label(item)
                            .frame(maxWidth: r.points("self.label-max"), minHeight: r.points("\(part).min-height"), alignment: .leading)
                            .fixedSize(horizontal: true, vertical: false)
                            .padding(.vertical, r.points("\(part).pad-y"))
                        value(item)
                            .frame(maxWidth: .infinity, minHeight: r.points("\(part).min-height"), alignment: .leading)
                            .padding(.vertical, r.points("\(part).pad-y"))
                    }
                    if index < items.count - 1 { hairline }
                }
            }
            .frame(minWidth: r.points("stack.below"))
            VStack(alignment: .leading, spacing: .zero) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    VStack(alignment: .leading, spacing: r.points("stack.gap")) {
                        label(item)
                        value(item)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, r.points("\(part).pad-y"))
                    .overlay(alignment: .bottom) { if index < items.count - 1 { hairline } }
                }
            }
        }
        .accessibilityElement(children: .contain)
    }

    private func label(_ item: MetalProperty) -> some View {
        MetalLabel(item.label, style: .engraved)
            .lineLimit(1)
    }

    @ViewBuilder private func value(_ item: MetalProperty) -> some View {
        Group {
            if let v = item.value { v } else { Text("—").foregroundStyle(colorway.tokens.ink3.color).accessibilityLabel("none") }
        }
        .font(.metal(MetalType.ui))
        .monospacedDigit()
        .foregroundStyle(colorway.tokens.ink.color)
    }

    private var hairline: some View { MetalRule(.horizontal) }
}
