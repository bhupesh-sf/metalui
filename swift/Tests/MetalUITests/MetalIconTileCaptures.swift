import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI icon tile beside the web page on metalui.dev (docs/captures/swift/icon-tile-*.png): the
/// four sizes sunk and raised, round, characters, and the lamp's five kinds on the rim.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalIconTileCaptures
@MainActor
final class MetalIconTileCaptures: XCTestCase {
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

    func testIconTile() throws {
        let sizes: [MetalIconTile.Size] = [.compact, .regular, .large, .hero]
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .center, spacing: 14) {
                    ForEach(sizes, id: \.self) { MetalIconTile(.folder, size: $0) }
                }
                HStack(alignment: .center, spacing: 14) {
                    ForEach(sizes, id: \.self) { MetalIconTile(.folder, look: .raised, size: $0) }
                }
                HStack(alignment: .center, spacing: 14) {
                    MetalIconTile(text: "AC")
                    MetalIconTile(text: "JS", look: .raised)
                    MetalIconTile(.person, shape: .round)
                    MetalIconTile(text: "v2", size: .large, shape: .round)
                }
                HStack(alignment: .center, spacing: 18) {
                    MetalIconTile(.document, led: .live)
                    MetalIconTile(.document, led: .waiting)
                    MetalIconTile(.document, led: .failed)
                    MetalIconTile(.link, led: .link)
                    MetalIconTile(.document, led: .off)
                    MetalIconTile(.bell, size: .compact, led: .failed)
                }
            }
            try write("icon-tile", colorway, view)
        }
    }
}
