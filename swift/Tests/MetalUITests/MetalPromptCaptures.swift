import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Markdown, Prompt input and Message actions pages' SwiftUI twins.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalPromptCaptures
@MainActor
final class MetalPromptCaptures: XCTestCase {
    private func capture<V: View>(_ name: String, _ view: V) {
        for colorway in MetalColorway.allCases {
            let framed = view
                .padding(32)
                .frame(width: 560, alignment: .topLeading)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            let renderer = ImageRenderer(content: framed)
            renderer.scale = 2
            guard let image = renderer.cgImage else { return XCTFail("\(name) did not render") }
            guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { continue }
            let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name)-\(colorway.rawValue).png")
            try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            let rep = NSBitmapImageRep(cgImage: image)
            XCTAssertNoThrow(try rep.representation(using: .png, properties: [:])!.write(to: url))
        }
    }

    func testMarkdown() {
        capture("markdown", MetalMessage(.assistant, model: "Fast", status: .writing) {
            MetalMarkdown("""
            ## Spring tokens, in short

            Springs now ship **with their durations**, so tuning a curve retimes every component.

            - Components read `--mu-spring-settle-d`
            - Reduce Motion sets every *travel* to zero

            | Spring | Duration |
            |---|---|
            | settle | 440 ms |

            The last line is still **arriving
            """, streaming: true)
        })
    }

    func testPromptInput() {
        capture("prompt-input", VStack(spacing: 24) {
            MetalPromptInput(text: .constant("Draft a release note\nand keep it short"), onSend: { _ in }, onAttach: { _ in }) {
                MetalAttachment(name: "brief.pdf", size: 120_000)
            } tools: {
                EmptyView()
            }
            MetalPromptInput(text: .constant(""), busy: true, onSend: { _ in }, onStop: {})
            MetalPromptInput(text: .constant(""), disabledReason: "You're offline", onSend: { _ in }).disabled(true)
        })
    }

    func testMessageActions() {
        capture("message-actions", MetalMessage(.assistant, model: "Fast", status: .done) {
            Text("Springs now ship with their durations, so tuning a curve retimes every component that uses it.")
        } footer: {
            MetalMessageActions(copy: "…", onRetry: {}, feedback: .constant(.down), onFeedback: { _, _ in }, reasons: ["Not accurate", "Too long"])
        })
    }
}
