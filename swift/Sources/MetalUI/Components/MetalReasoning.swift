import SwiftUI

// Reasoning: the assistant's thinking inside its reply. Mirrors components/reasoning (reasoning.agent.md)
// from the reasoning recipe, on the collapsible's row and panel:
//   streaming  the amber lamp breathing and "Thinking"; the fold is open, the thought arriving in it
//   done       streaming turns off: the fold shuts on the release spring and the words turn to
//              "Thought for 4 s" beside the off lamp; under a second, "Thought for a moment"
//   seconds    measured from streaming on to off (nothing ticks), or the host's `duration`
//   yours      once the person presses the row, streaming no longer opens or shuts it
//   thought    body type, ink2, beside an engraved rule at the start
// Reduce Motion: the fold crossfades; the lamp holds steady.

/// The assistant's thinking: open while it streams, folded to "Thought for 4 s" when the answer starts.
public struct MetalReasoning<Content: View>: View {
    let streaming: Bool
    let duration: TimeInterval?
    let label: String?
    let content: Content

    @State private var isOpen: Bool
    @State private var yours = false
    @State private var started: Date?
    @State private var took: TimeInterval?
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `duration` in seconds when the host knows it (history); `label` for the row once done ("Worked for 12 s").
    public init(streaming: Bool = false, duration: TimeInterval? = nil, label: String? = nil, @ViewBuilder content: () -> Content) {
        self.streaming = streaming
        self.duration = duration
        self.label = label
        self.content = content()
        _isOpen = State(initialValue: streaming)
        _started = State(initialValue: streaming ? Date() : nil)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.reasoning }

    private var words: String {
        if streaming { return "Thinking" }
        if let label { return label }
        guard let seconds = duration ?? took else { return "Thought" }
        let s = Int(seconds.rounded())
        if s < 1 { return "Thought for a moment" }
        return s < 60 ? "Thought for \(s) s" : "Thought for \(s / 60):\(String(format: "%02d", s % 60))"
    }

    public var body: some View {
        let t = colorway.tokens
        VStack(alignment: .leading, spacing: .zero) {
            MetalCollapsibleRow(isOpen: $isOpen, onPress: { yours = true }) {
                HStack(spacing: recipe.points("row.gap")) {
                    // In the small ring's slot, as Tool call's lamp: lamps line up down a reply.
                    MetalLED(streaming ? .waiting : .off, size: .small, gesture: streaming ? .breathe : .steady)
                        .frame(width: MetalRecipes.spinner.points("self.small"), height: MetalRecipes.spinner.points("self.small"))
                    Text(words)
                        .font(.metal(MetalType.ui)).tracking(MetalType.ui.trackingPoints)
                        .foregroundColor(t.ink2.color).lineLimit(1)
                        .contentTransition(reduceMotion ? .opacity : .numericText())
                        .metalAnimation(.settle, value: words)
                }
            }
            .accessibilityLabel(words)
            MetalCollapsiblePanel(isOpen: isOpen) {
                HStack(alignment: .top, spacing: recipe.points("panel.indent")) {
                    MetalReasoningRule()
                    content
                        .font(.metal(MetalType.body))
                        .foregroundColor(t.ink2.color)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .fixedSize(horizontal: false, vertical: true)
                .padding(.vertical, recipe.points("panel.pad-y"))
            }
        }
        .onChange(of: streaming) { _, now in
            if now { started = Date() } else if let s = started {
                took = Date().timeIntervalSince(s)
                started = nil
            }
            guard !yours else { return }
            withMetalAnimation(now ? .settle : .release, reduceMotion: reduceMotion) { isOpen = now }
        }
        .accessibilityElement(children: .contain)
        .accessibilityValue(streaming ? "busy" : "")
    }
}

/// The engraved rule at the margin's start, full height and without the rule's own side margins.
private struct MetalReasoningRule: View {
    var body: some View {
        MetalRule(.vertical)
            .padding(.horizontal, -MetalRecipes.rule.points("self.margin"))
            .frame(maxHeight: .infinity)
            .accessibilityHidden(true)
    }
}
