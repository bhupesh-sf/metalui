import SwiftUI

// Confirmation: the agent asks before it acts, and what was decided stays. Mirrors components/confirmation
// (confirmation.agent.md) from the confirmation recipe, on MetalAlert and MetalButton:
//   asking       an urgent alert on its plate (the amber lamp steady, the warning glyph, read out at once):
//                the question, what will happen, and Deny then Allow (compact; Allow primary)
//   destructive  Allow is the destructive cap with the trash, held to confirm; let go early and the hint
//                fades in under the answers
//   decided      the plate goes (quiet), the glyph turns to the note's, and the answers give way to a check
//                or a cross, "Allowed" / "Denied" and the host's time
// Reduce Motion: the alert's own; the hold's fill still runs.

public enum MetalConfirmationDecision: Sendable, Equatable { case allowed, denied }

/// The agent's question with Deny and Allow; once answered (the host passes `decision`), what was decided.
public struct MetalConfirmation: View {
    let title: String
    let detail: String?
    let decision: MetalConfirmationDecision?
    let destructive: Bool
    let allowLabel: String
    let denyLabel: String
    let allowedLabel: String
    let deniedLabel: String
    let holdHint: String
    let time: Date?
    let onDecide: (MetalConfirmationDecision) -> Void
    @State private var hinted = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.metalColorway) private var colorway

    public init(_ title: String, detail: String? = nil, decision: MetalConfirmationDecision? = nil, destructive: Bool = false,
                allowLabel: String = "Allow", denyLabel: String = "Deny", allowedLabel: String = "Allowed", deniedLabel: String = "Denied",
                holdHint: String = "Hold to confirm", time: Date? = nil, onDecide: @escaping (MetalConfirmationDecision) -> Void) {
        self.title = title
        self.detail = detail
        self.decision = decision
        self.destructive = destructive
        self.allowLabel = allowLabel
        self.denyLabel = denyLabel
        self.allowedLabel = allowedLabel
        self.deniedLabel = deniedLabel
        self.holdHint = holdHint
        self.time = time
        self.onDecide = onDecide
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.confirmation }

    public var body: some View {
        MetalAlert(kind: decision == nil ? .urgent : .note, tone: decision == nil ? .plate : .quiet, title: title, description: detail) {
            if let decision { record(decision) } else { answers }
        }
    }

    private func record(_ decision: MetalConfirmationDecision) -> some View {
        let t = colorway.tokens
        return HStack(spacing: recipe.points("decision.gap")) {
            MetalIcon(decision == .allowed ? .check : .close, size: recipe.points("decision.glyph")).accessibilityHidden(true)
            Text(decision == .allowed ? allowedLabel : deniedLabel)
            if let time {
                Text(time.formatted(date: .omitted, time: .shortened)).monospacedDigit().foregroundColor(t.ink3.color)
            }
        }
        .font(.metal(MetalType.meta))
        .foregroundColor(t.ink2.color)
        .accessibilityElement(children: .combine)
    }

    private var answers: some View {
        VStack(alignment: .trailing, spacing: recipe.points("hint.gap")) {
            HStack(spacing: MetalRecipes.alert.points("self.actions-gap")) {
                MetalButton(denyLabel, size: .compact) { onDecide(.denied) }
                if destructive {
                    MetalButton(allowLabel, icon: .trash, cap: .destructive, size: .compact) { onDecide(.allowed) }
                        .metalHoldToConfirm(hint: holdHint) { withMetalAnimation(.settle, reduceMotion: reduceMotion) { hinted = true } }
                } else {
                    MetalButton(allowLabel, cap: .primary, size: .compact) { onDecide(.allowed) }
                }
            }
            if hinted {
                Text(holdHint)
                    .font(.metal(MetalType.meta))
                    .foregroundColor(colorway.tokens.ink3.color)
                    .transition(.opacity)
                    .onAppear { AccessibilityNotification.Announcement(holdHint).post() }
            }
        }
    }
}
