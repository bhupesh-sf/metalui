import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI badge beside the web page on metalui.dev (docs/captures/swift/badge-*.png): a kind, the
/// LED states, a glyph, counts at both sizes and past max, and a count on a bell's corner.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalBadgeCaptures
@MainActor
final class MetalBadgeCaptures: XCTestCase {
    private func write<V: View>(_ name: String, _ colorway: MetalColorway, _ view: V) throws {
        let framed = view
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
        let renderer = ImageRenderer(content: framed)
        renderer.scale = 2
        let image = try XCTUnwrap(renderer.cgImage)
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name)-\(colorway.rawValue).png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
    }

    func testBadge() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 8) {
                    MetalBadge("Beta")
                    MetalBadge("v2.4")
                    MetalBadge("Private", glyph: .lock)
                    MetalBadge(count: 7)
                    MetalBadge(count: 120)
                }
                HStack(spacing: 8) {
                    MetalBadge("Deployed", led: .live)
                    MetalBadge("Building", led: .waiting)
                    MetalBadge("Build failed", led: .failed)
                    MetalBadge("Linked", led: .link)
                    MetalBadge("Queued", led: .off)
                }
                HStack(spacing: 8) {
                    MetalBadge("Draft", size: .compact)
                    MetalBadge("Review", led: .waiting, size: .compact)
                    MetalBadge(count: 4, size: .compact)
                    Spacer().frame(width: 16)
                    MetalIconButton("Inbox, 3 unread", icon: .bell) {}
                        .metalBadge(count: 3)
                    MetalIconButton("Inbox, 120 unread", icon: .bell) {}
                        .metalBadge(count: 120)
                }
            }
            try write("badge", colorway, view)
        }
    }
}
