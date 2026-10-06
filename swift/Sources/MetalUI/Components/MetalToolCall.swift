import SwiftUI

// Tool call: one thing the agent did. Mirrors components/tool-call (tool-call.agent.md) from the
// tool-call recipe, on the collapsible's row and panel:
//   row      folded by default: the lamp, the tool's name in code type, the state's word; a summary in
//            ink3 that fades as it opens
//   queued   the amber lamp, "Queued"
//   running  the lamp gives way to the Spinner's ring after the show delay (.metalWait), "Running"; said
//            when it shows and when it ends
//   done     the off lamp; the duration ("1.2 s") when given
//   failed   the red lamp, "Failed"; blinks twice when it turns failed on screen
//   panel    Input (compact properties), Result (code type in the field's sunk well, scrolling past its
//            height) or the error in the error ink; a tool's own UI replaces them
//   group    MetalToolCallGroup: one row ("4 tools") with the host's status, the calls beside a rule
// Reduce Motion: the fold crossfades; the lamp holds steady.

public enum MetalToolCallStatus: Sendable, Equatable { case queued, running, done, failed }

/// "0.4 s" and "1.2 s" under ten seconds, then "42 s", then "1:12".
private func metalToolCallTook(_ seconds: TimeInterval) -> String {
    if seconds < 10 { return String(format: "%.1f s", seconds) }
    let s = Int(seconds.rounded())
    return s < 60 ? "\(s) s" : "\(s / 60):\(String(format: "%02d", s % 60))"
}

private func metalToolCallWord(_ status: MetalToolCallStatus, duration: TimeInterval?) -> String? {
    switch status {
    case .queued: return "Queued"
    case .running: return "Running"
    case .failed: return "Failed"
    case .done: return duration.map(metalToolCallTook)
    }
}

/// The lamp (the ring stands in for it while it runs), the words and the state's word.
private struct MetalToolCallHead: View {
    let status: MetalToolCallStatus
    let title: String
    let duration: TimeInterval?
    let code: Bool
    @State private var wait = MetalWait()
    @State private var gesture: MetalLampGesture = .steady
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var kind: MetalLEDKind {
        switch status {
        case .queued: return .waiting
        case .running: return .live
        case .done: return .off
        case .failed: return .failed
        }
    }

    private var work: MetalWork { status == .running ? .working : status == .done ? .done : .idle }

    var body: some View {
        let t = colorway.tokens
        let word = metalToolCallWord(status, duration: duration)
        HStack(spacing: MetalRecipes.toolCall.points("row.gap")) {
            MetalSpinner(size: .small, label: "\(title), running", phase: wait.phase) {
                MetalLED(kind, size: .small, gesture: gesture)
            }
            .accessibilityHidden(true)
            Text(title)
                .font(.metal(code ? MetalType.code : MetalType.ui))
                .foregroundColor(t.ink.color).lineLimit(1)
            if let word {
                Text(word)
                    .font(.metal(MetalType.meta)).monospacedDigit()
                    .foregroundColor(t.ink3.color).lineLimit(1)
                    .contentTransition(reduceMotion ? .opacity : .numericText())
                    .metalAnimation(.settle, value: word)
            }
        }
        .metalWait(work, into: $wait)
        .metalWaitSaid(wait.phase, label: "\(title), running", result: "\(title), done")
        .onChange(of: status) { _, new in gesture = new == .failed ? .blink2 : .steady }
    }
}

/// One tool call: a folded row with its state; open, its input and result (or its own UI).
public struct MetalToolCall<Content: View>: View {
    let name: String
    let status: MetalToolCallStatus
    let summary: String?
    let input: [(String, String)]
    let result: String?
    let error: String?
    let duration: TimeInterval?
    let content: Content
    @State private var isOpen: Bool
    @Environment(\.metalColorway) private var colorway

    /// `input` as label and value pairs; `duration` in seconds; `content` is the tool's own UI.
    public init(_ name: String, status: MetalToolCallStatus = .done, summary: String? = nil, input: [(String, String)] = [],
                result: String? = nil, error: String? = nil, duration: TimeInterval? = nil, isOpen: Bool = false,
                @ViewBuilder content: () -> Content) {
        self.name = name
        self.status = status
        self.summary = summary
        self.input = input
        self.result = result
        self.error = error
        self.duration = duration
        self.content = content()
        _isOpen = State(initialValue: isOpen)
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.toolCall }

    public var body: some View {
        VStack(alignment: .leading, spacing: .zero) {
            MetalCollapsibleRow(isOpen: $isOpen, summary: summary) {
                MetalToolCallHead(status: status, title: name, duration: duration, code: true)
            }
            .accessibilityLabel([name, metalToolCallWord(status, duration: duration), isOpen ? nil : summary].compactMap { $0 }.joined(separator: ", "))
            MetalCollapsiblePanel(isOpen: isOpen) {
                panel.padding(.vertical, recipe.points("panel.pad-y"))
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityValue(status == .running ? "busy" : "")
    }

    @ViewBuilder private var panel: some View {
        if Content.self != EmptyView.self {
            content
        } else {
            VStack(alignment: .leading, spacing: recipe.points("panel.gap")) {
                if !input.isEmpty {
                    section("Input") { MetalProperties(size: .compact, input.map { MetalProperty($0.0, text: $0.1) }) }
                }
                if let error {
                    section("Error") {
                        Text(error).font(.metal(MetalType.meta))
                            .foregroundColor((MetalRecipes.formField.color("error.ink", colorway: MetalRecipeColorway(colorway)) ?? colorway.tokens.invalid).color)
                    }
                } else if let result {
                    section("Result") { well(result) }
                }
            }
        }
    }

    private func section(_ caption: String, @ViewBuilder _ body: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: recipe.points("section.gap")) {
            MetalLabel(caption, style: .engraved)
            body()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// The result in the field's sunk well, code type; past its height it scrolls.
    private func well(_ text: String) -> some View {
        let words = Text(text)
            .font(.metal(MetalType.code)).foregroundColor(colorway.tokens.ink.color)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, recipe.points("result.pad-x"))
            .padding(.vertical, recipe.points("result.pad-y"))
        return MetalWell(.field) {
            ViewThatFits(in: .vertical) {
                words
                ScrollView { words }
            }
            .frame(maxHeight: recipe.points("result.max-height"))
        }
        .accessibilityLabel("Result")
    }
}

extension MetalToolCall where Content == EmptyView {
    /// A tool with no UI of its own: the fallback Input and Result.
    public init(_ name: String, status: MetalToolCallStatus = .done, summary: String? = nil, input: [(String, String)] = [],
                result: String? = nil, error: String? = nil, duration: TimeInterval? = nil, isOpen: Bool = false) {
        self.init(name, status: status, summary: summary, input: input, result: result, error: error, duration: duration,
                  isOpen: isOpen) { EmptyView() }
    }
}

/// Calls in a row, folded under one row ("4 tools") with the host's status.
public struct MetalToolCallGroup<Calls: View>: View {
    let label: String?
    let count: Int
    let status: MetalToolCallStatus
    let calls: Calls
    @State private var isOpen: Bool

    /// `count` gives the default words ("4 tools"); `status` is the host's: running while any runs, failed if any failed.
    public init(label: String? = nil, count: Int, status: MetalToolCallStatus = .done, isOpen: Bool = false, @ViewBuilder calls: () -> Calls) {
        self.label = label
        self.count = count
        self.status = status
        self.calls = calls()
        _isOpen = State(initialValue: isOpen)
    }

    public var body: some View {
        let words = label ?? "\(count) tools"
        VStack(alignment: .leading, spacing: .zero) {
            MetalCollapsibleRow(isOpen: $isOpen) {
                MetalToolCallHead(status: status, title: words, duration: nil, code: false)
            }
            .accessibilityLabel([words, metalToolCallWord(status, duration: nil)].compactMap { $0 }.joined(separator: ", "))
            MetalCollapsiblePanel(isOpen: isOpen) {
                HStack(alignment: .top, spacing: MetalRecipes.toolCall.points("group.indent")) {
                    MetalRule(.vertical)
                        .padding(.horizontal, -MetalRecipes.rule.points("self.margin"))
                        .frame(maxHeight: .infinity)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: .zero) { calls }
                }
                .fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .contain)
    }
}
