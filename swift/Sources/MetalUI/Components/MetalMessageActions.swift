import SwiftUI
#if canImport(AppKit)
import AppKit
#endif

// Message actions: the keys that act on a message, in MetalMessage's footer. Mirrors components/message-actions
// (message-actions.agent.md) from the message-actions recipe:
//   keys      ghost icon keys, each named with a tooltip, each only when given: Copy, Retry, Edit (the pen),
//             Good and Bad (the thumb, and the thumb turned over)
//   copy      the copy glyph turns to the check and the name to "Copied" for copy.hold
//   thumbs    toggles, the chosen one latched; choosing it again clears
//   reasons   after Bad, a row of compact buttons fades in (settle); one press sends the reason, the row
//             says "Thanks" for thanks.hold, and goes
// Reduce Motion: the row appears at once; glyphs change in place.

public enum MetalMessageFeedback: Sendable, Equatable { case up, down }

public struct MetalMessageActions: View {
    let copy: String?
    let onRetry: (() -> Void)?
    let retryDisabled: Bool
    let onEdit: (() -> Void)?
    @Binding var feedback: MetalMessageFeedback?
    let onFeedback: ((MetalMessageFeedback?, String?) -> Void)?
    let reasons: [String]
    @State private var copied = false
    @State private var asking = false
    @State private var thanked = false

    public init(copy: String? = nil, onRetry: (() -> Void)? = nil, retryDisabled: Bool = false, onEdit: (() -> Void)? = nil,
                feedback: Binding<MetalMessageFeedback?> = .constant(nil),
                onFeedback: ((MetalMessageFeedback?, String?) -> Void)? = nil, reasons: [String] = []) {
        self.copy = copy
        self.onRetry = onRetry
        self.retryDisabled = retryDisabled
        self.onEdit = onEdit
        self._feedback = feedback
        self.onFeedback = onFeedback
        self.reasons = reasons
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.messageActions }

    public var body: some View {
        VStack(alignment: .leading, spacing: recipe.points("reasons.gap")) {
            HStack(spacing: recipe.points("self.gap")) {
                if let copy {
                    MetalIconButton(copied ? "Copied" : "Copy", icon: copied ? .check : .copy) { write(copy) }
                        .metalTooltip(copied ? "Copied" : "Copy")
                }
                if let onRetry {
                    MetalIconButton("Retry", icon: .retry, action: onRetry).disabled(retryDisabled).metalTooltip("Retry")
                }
                if let onEdit {
                    MetalIconButton("Edit", icon: .pen, action: onEdit).metalTooltip("Edit")
                }
                if onFeedback != nil {
                    MetalIconButton("Good response", icon: .thumb, pressed: feedback == .up) { choose(.up) }
                        .metalTooltip("Good response")
                    MetalIconButton("Bad response", pressed: feedback == .down, action: { choose(.down) }) {
                        MetalIcon(.thumb, size: MetalRecipes.iconButton.points("ghost.glyph")).rotationEffect(.degrees(180))
                    }
                    .metalTooltip("Bad response")
                }
            }
            if asking {
                HStack(spacing: recipe.points("reasons.gap")) {
                    if thanked {
                        Text("Thanks").font(.metal(MetalType.meta))
                    } else {
                        ForEach(reasons, id: \.self) { r in
                            MetalButton(r, size: .compact) { because(r) }
                        }
                    }
                }
                .transition(.opacity)
                .accessibilityElement(children: .contain)
                .accessibilityLabel("What went wrong?")
            }
        }
        .metalAnimation(.settle, value: asking)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Message actions")
    }

    private func write(_ text: String) {
        #if canImport(AppKit)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        #endif
        copied = true
        Task {
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("copy.hold")))
            copied = false
        }
    }

    private func choose(_ next: MetalMessageFeedback) {
        let value: MetalMessageFeedback? = feedback == next ? nil : next
        feedback = value
        onFeedback?(value, nil)
        thanked = false
        asking = value == .down && !reasons.isEmpty
    }

    private func because(_ reason: String) {
        onFeedback?(.down, reason)
        thanked = true
        Task {
            try? await Task.sleep(for: .seconds(recipe.durationSeconds("thanks.hold")))
            asking = false
            thanked = false
        }
    }
}
