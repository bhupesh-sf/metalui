import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Thread and Message pages' SwiftUI twins: a conversation with both sides, a reply writing, grouped
/// turns with avatars and a system line.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalThreadCaptures
@MainActor
final class MetalThreadCaptures: XCTestCase {
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

    private var turns: some View {
        let at = Date(timeIntervalSince1970: 1_791_300_000)
        return VStack(alignment: .leading, spacing: MetalRecipes.thread.points("self.gap")) {
            MetalMessage(.system) { Text("Ana joined the conversation") }
            MetalMessage(.user, time: at, avatar: MetalAvatar(name: "Rui Matos")) { Text("My export stops at page 12.") }
            MetalMessage(.user, avatar: MetalAvatar(name: "Rui Matos"), grouped: true) { Text("It's the Alfama board.") }
            MetalMessage(.assistant, name: "Ana Rocha", time: at, avatar: MetalAvatar(name: "Ana Rocha")) {
                Text("Page 13 has a photo larger than the export allows.")
            }
            MetalMessage(.assistant, name: "Ana Rocha", avatar: MetalAvatar(name: "Ana Rocha"), grouped: true) {
                Text("I've raised the limit; try it again now.")
            } footer: {
                MetalButton("Retry", icon: .retry, size: .compact) {}
            }
            MetalMessage(.assistant, model: "Fast", status: .writing) { Text("The export finished: 40 pages, 18 MB, and") }
            MetalMessage(.assistant, model: "Thorough", status: .waiting) { EmptyView() }
        }
        .environment(\.metalThreadGroupPull, MetalRecipes.thread.points("self.gap") - MetalRecipes.thread.points("self.group-gap"))
    }

    func testThread() {
        for colorway in MetalColorway.allCases {
            let view = turns
                .padding(32)
                .frame(width: 560, alignment: .topLeading)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("thread-\(colorway.rawValue)", view)
            capture("message-\(colorway.rawValue)", view)
        }
    }
}
