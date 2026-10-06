import SwiftUI

// Plan: the agent's to-do list. Mirrors components/plan (plan.agent.md) from the plan recipe:
//   head      a compact MetalProgress: the title, "3 of 5", the track filling as steps finish; failed if
//             any step failed, complete when every step is done
//   pending   the off lamp, the title in ink
//   queued    the amber lamp, "Queued" (what is waiting to run)
//   running   the lamp gives way to the Spinner's ring after the show delay (.metalWait), "Running"
//   done      the check glyph, the title in ink3
//   failed    the red lamp, "Failed"; blinks twice when it turns failed on screen
//   nested    a step's own tasks beside an engraved rule down the mark's column
// The states are MetalToolCall's words and lamps. Reduce Motion: the lamp holds steady.

public enum MetalPlanTaskState: Sendable, Equatable { case pending, queued, running, done, failed }

public struct MetalPlanTask: Identifiable, Sendable {
    public let id: String
    public let title: String
    public let state: MetalPlanTaskState
    public let description: String?
    public let tasks: [MetalPlanTask]

    public init(id: String, title: String, state: MetalPlanTaskState = .pending, description: String? = nil, tasks: [MetalPlanTask] = []) {
        self.id = id
        self.title = title
        self.state = state
        self.description = description
        self.tasks = tasks
    }
}

private func metalPlanWord(_ state: MetalPlanTaskState) -> String? {
    switch state {
    case .queued: return "Queued"
    case .running: return "Running"
    case .failed: return "Failed"
    case .pending, .done: return nil
    }
}

/// One task: its mark, its title and word, a detail line, its own tasks.
private struct MetalPlanTaskRow: View {
    let task: MetalPlanTask
    @State private var wait = MetalWait()
    @State private var gesture: MetalLampGesture = .steady
    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var recipe: MetalObjectRecipe { MetalRecipes.plan }
    private var slot: CGFloat { MetalRecipes.spinner.points("self.small") }

    private var kind: MetalLEDKind {
        switch task.state {
        case .queued: return .waiting
        case .running: return .live
        case .failed: return .failed
        case .pending, .done: return .off
        }
    }

    private var work: MetalWork { task.state == .running ? .working : task.state == .done ? .done : .idle }

    var body: some View {
        let t = colorway.tokens
        let gap = recipe.points("task.gap")
        VStack(alignment: .leading, spacing: .zero) {
            HStack(spacing: gap) {
                Group {
                    if task.state == .done && !wait.showing {
                        MetalIcon(.check, size: slot).foregroundColor(t.ink3.color)
                    } else {
                        MetalSpinner(size: .small, label: "\(task.title), running", phase: wait.phase) {
                            MetalLED(kind, size: .small, gesture: gesture)
                        }
                    }
                }
                .frame(width: slot, height: slot)
                .accessibilityHidden(true)
                Text(task.title)
                    .font(.metal(MetalType.ui))
                    .foregroundColor((task.state == .done ? t.ink3 : t.ink).color)
                    .frame(maxWidth: .infinity, alignment: .leading)
                if let word = metalPlanWord(task.state) {
                    Text(word)
                        .font(.metal(MetalType.meta)).monospacedDigit()
                        .foregroundColor(t.ink3.color).lineLimit(1)
                        .contentTransition(reduceMotion ? .opacity : .numericText())
                        .metalAnimation(.settle, value: word)
                }
            }
            .padding(.vertical, recipe.points("task.pad-y"))
            .accessibilityElement(children: .combine)
            .accessibilityLabel([task.title, task.state == .done ? "done" : metalPlanWord(task.state)].compactMap { $0 }.joined(separator: ", "))
            if let description = task.description {
                Text(description)
                    .font(.metal(MetalType.meta)).foregroundColor(t.ink2.color)
                    .padding(.leading, slot + gap)
            }
            if !task.tasks.isEmpty {
                HStack(alignment: .top, spacing: gap) {
                    MetalRule(.vertical)
                        .padding(.horizontal, -MetalRecipes.rule.points("self.margin"))
                        .frame(width: slot)
                        .frame(maxHeight: .infinity)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: .zero) {
                        ForEach(task.tasks) { MetalPlanTaskRow(task: $0) }
                    }
                }
                .fixedSize(horizontal: false, vertical: true)
            }
        }
        .metalWait(work, into: $wait)
        .onChange(of: task.state) { _, new in gesture = new == .failed ? .blink2 : .steady }
    }
}

/// The agent's to-do list: a head with how far it has got, and the steps with their states.
public struct MetalPlan: View {
    let title: String
    let tasks: [MetalPlanTask]

    public init(_ title: String = "Plan", tasks: [MetalPlanTask]) {
        self.title = title
        self.tasks = tasks
    }

    public var body: some View {
        let done = tasks.filter { $0.state == .done }.count
        let state: MetalProgressState = tasks.contains { $0.state == .failed } ? .failed
            : (!tasks.isEmpty && done == tasks.count ? .complete : .running)
        VStack(alignment: .leading, spacing: MetalRecipes.plan.points("self.gap")) {
            MetalProgress(title, value: Double(done), total: Double(max(tasks.count, 1)), state: state, size: .compact,
                          detail: "\(done) of \(tasks.count)")
            VStack(alignment: .leading, spacing: .zero) {
                ForEach(tasks) { MetalPlanTaskRow(task: $0) }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel(title)
        }
    }
}
