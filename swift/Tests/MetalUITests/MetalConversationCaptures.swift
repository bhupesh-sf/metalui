import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Branch picker and Conversation list pages' SwiftUI twins.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalConversationCaptures
@MainActor
final class MetalConversationCaptures: XCTestCase {
    private func capture<V: View>(_ name: String, width: CGFloat = 560, _ view: V) {
        for colorway in MetalColorway.allCases {
            let framed = view
                .padding(32)
                .frame(width: width, alignment: .topLeading)
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

    func testBranchPicker() {
        capture("branch-picker", VStack(alignment: .leading, spacing: 16) {
            MetalMessage(.user) { Text("When is high tide at Belém today?") }
            MetalMessage(.assistant, model: "Fast", status: .done, content: {
                MetalMarkdown("The next high tide at Belém is **14:02** today (3.4 m); the one after is at 02:31.")
            }, footer: {
                HStack(spacing: 8) {
                    MetalBranchPicker(index: .constant(2), count: 2)
                    MetalMessageActions(copy: "", onRetry: {})
                }
            })
        })
    }

    func testConversationList() {
        let now = Date(timeIntervalSince1970: 1_791_000_000)
        let h: TimeInterval = 3600
        let chats = [
            MetalConversation(id: "tides", title: "High tide at Belém today", time: now - 0.4 * h),
            MetalConversation(id: "release", title: "Release note for the spring tokens", time: now - 3 * h),
            MetalConversation(id: "ferry", title: "Ferry times from Cais do Sodré", time: now - 25 * h),
            MetalConversation(id: "tiles", title: "Azulejo patterns for the hallway", time: now - 120 * h, pinned: true),
            MetalConversation(id: "budget", title: "Trip budget in euros", time: now - 288 * h),
        ]
        capture("conversation-list", width: 300, MetalConversationList(chats, current: .constant("tides"), onRename: { _, _ in }, onDelete: { _ in }, now: now))
    }

    func testSpinnerText() {
        capture("spinner-text", MetalMessage(.assistant) {
            MetalSpinnerText("Searching the tide tables")
        }.environment(\.metalWaitFrozen, true))
    }
}
