import SwiftUI

// Branch picker: which of a message's replies is showing, in MetalMessage's footer. Mirrors
// components/branch-picker (branch-picker.agent.md) from the branch-picker recipe:
//   keys    ghost icon keys, the chevron turned back and forward, each with a tooltip
//   count   "2 / 3" in meta type, tabular figures, ink2; the number turns as you move
//   ends    at the first reply Previous is disabled, at the last Next
//   one     a single reply: nothing is drawn
// Reduce Motion: the number crossfades in place.

public struct MetalBranchPicker: View {
    @Binding var index: Int
    let count: Int
    let label: String
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    /// `index` from 1; under two replies nothing is drawn.
    public init(index: Binding<Int>, count: Int, label: String = "Reply") {
        self._index = index
        self.count = count
        self.label = label
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.branchPicker }

    public var body: some View {
        if count > 1 {
            let at = min(count, max(1, index))
            let word = label.lowercased()
            HStack(spacing: recipe.points("self.gap")) {
                MetalIconButton("Previous \(word)", action: { index = at - 1 }) {
                    MetalIcon(.chevron, size: MetalRecipes.iconButton.points("ghost.glyph")).rotationEffect(.degrees(90))
                }
                .disabled(at <= 1)
                .metalTooltip("Previous \(word)")
                Text("\(at) / \(count)")
                    .font(.metal(MetalType.meta)).monospacedDigit()
                    .foregroundColor(colorway.tokens.ink2.color)
                    .contentTransition(reduceMotion ? .opacity : .numericText(value: Double(at)))
                    .metalAnimation(.settle, value: at)
                    .padding(.horizontal, recipe.points("count.pad"))
                    .accessibilityHidden(true)
                MetalIconButton("Next \(word)", action: { index = at + 1 }) {
                    MetalIcon(.chevron, size: MetalRecipes.iconButton.points("ghost.glyph")).rotationEffect(.degrees(-90))
                }
                .disabled(at >= count)
                .metalTooltip("Next \(word)")
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("\(label) \(at) of \(count)")
        }
    }
}
