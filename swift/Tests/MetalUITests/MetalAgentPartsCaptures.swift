import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Reasoning, Tool call, Confirmation, Plan and Citation pages' SwiftUI twins, each inside an assistant's message.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalAgentPartsCaptures
@MainActor
final class MetalAgentPartsCaptures: XCTestCase {
    private func capture<V: View>(_ name: String, _ view: V) {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let image = renderer.cgImage else { return XCTFail("\(name) did not render") }
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name).png")
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let rep = NSBitmapImageRep(cgImage: image)
        XCTAssertNoThrow(try rep.representation(using: .png, properties: [:])!.write(to: url))
    }

    private func page<V: View>(_ colorway: MetalColorway, _ view: V) -> some View {
        view
            .padding(32)
            .frame(width: 560, alignment: .topLeading)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
    }

    private var reasoning: some View {
        VStack(alignment: .leading, spacing: MetalRecipes.thread.points("self.gap")) {
            MetalMessage(.assistant, model: "Thorough", status: .writing) {
                MetalReasoning(streaming: true) { Text("The person wants the note shorter, not different.") }
            }
            MetalMessage(.assistant, model: "Thorough") {
                VStack(alignment: .leading, spacing: MetalRecipes.message.points("self.gap")) {
                    MetalReasoning(duration: 4) { Text("Three headlines, each under six words.") }
                    Text("1. Every spring, on time")
                }
            }
        }
    }

    private var toolCalls: some View {
        MetalMessage(.assistant, model: "Fast") {
            VStack(alignment: .leading, spacing: .zero) {
                MetalToolCall("search_docs", summary: "‘springs’", input: [("query", "springs"), ("limit", "5")],
                              result: "Springs · /foundations/motion\nReduce Motion · /foundations/motion#reduce", duration: 1.24, isOpen: true)
                MetalToolCall("open_link", status: .failed, summary: "motion#reduce")
                MetalToolCall("read_file", status: .queued, summary: "release-note.md")
                MetalToolCallGroup(count: 3, status: .running) { EmptyView() }
            }
        }
    }

    private var confirmations: some View {
        MetalMessage(.assistant, model: "Fast") {
            VStack(alignment: .leading, spacing: MetalRecipes.message.points("self.gap")) {
                MetalConfirmation("Delete 3 files?", detail: "They are deleted for good.", destructive: true,
                                  allowLabel: "Delete", denyLabel: "Keep") { _ in }
                MetalConfirmation("Move 3 files to the archive?", detail: "drafts/old-note.md and 2 more",
                                  decision: .allowed, time: Date(timeIntervalSince1970: 1_791_300_000)) { _ in }
            }
        }
    }

    // A waiting reply with a body shows it (the skeleton is only for a reply with none yet).
    private var plan: some View {
        MetalMessage(.assistant, model: "Thorough", status: .waiting) {
            MetalPlan(tasks: [
                MetalPlanTask(id: "1", title: "Read the release notes", state: .done),
                MetalPlanTask(id: "2", title: "Search the docs for springs", state: .running, tasks: [
                    MetalPlanTask(id: "2a", title: "Motion", state: .done),
                    MetalPlanTask(id: "2b", title: "Transitions", state: .queued),
                ]),
                MetalPlanTask(id: "3", title: "Draft the summary", state: .failed, description: "The docs index is rebuilding."),
                MetalPlanTask(id: "4", title: "Check the links"),
            ])
        }
    }

    private var citations: some View {
        let sources = [
            MetalCitationSource(url: URL(string: "https://metalui.dev/foundations/motion")!, title: "Motion"),
            MetalCitationSource(url: URL(string: "https://www.w3.org/WAI/WCAG22/")!, title: "Animation from interactions"),
        ]
        return MetalMessage(.assistant, model: "Thorough") {
            VStack(alignment: .leading, spacing: MetalRecipes.message.points("self.gap")) {
                HStack(spacing: MetalRecipes.citation.points("list.number-gap")) {
                    Text("Every move rides a named spring")
                    MetalCitation(1, source: sources[0])
                    MetalCitation(2, source: sources[1])
                }
                MetalCitationSources(sources, isOpen: true)
            }
        }
    }

    func testAgentParts() {
        for colorway in MetalColorway.allCases {
            capture("reasoning-\(colorway.rawValue)", page(colorway, reasoning))
            capture("tool-call-\(colorway.rawValue)", page(colorway, toolCalls))
            capture("confirmation-\(colorway.rawValue)", page(colorway, confirmations))
            capture("plan-\(colorway.rawValue)", page(colorway, plan))
            capture("citation-\(colorway.rawValue)", page(colorway, citations))
        }
    }
}
