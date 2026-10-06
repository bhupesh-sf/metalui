import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI attachment tiles beside the web's "Pictures and tiles" (docs/captures/swift/attachment-tiles-*.png):
/// a row with its picture, then tiles done, uploading, failed and a document; a composer's compact tiles.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalAttachmentCaptures
@MainActor
final class MetalAttachmentCaptures: XCTestCase {
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

    /// A stand-in photo: a warm gradient with a sun and hills, like the web page's.
    private func photo(_ a: Color, _ b: Color) -> Image {
        let view = ZStack {
            LinearGradient(colors: [a, b], startPoint: .topLeading, endPoint: .bottomTrailing)
            Circle().fill(.white.opacity(0.6)).frame(width: 32).offset(x: 38, y: -36)
        }
        .frame(width: 160, height: 160)
        let renderer = ImageRenderer(content: view)
        return Image(nsImage: NSImage(cgImage: renderer.cgImage!, size: NSSize(width: 160, height: 160)))
    }

    func testTiles() throws {
        let warm = photo(Color(red: 0.91, green: 0.79, blue: 0.63), Color(red: 0.76, green: 0.49, blue: 0.37))
        let cool = photo(Color(red: 0.66, green: 0.78, blue: 0.85), Color(red: 0.33, green: 0.44, blue: 0.54))
        let green = photo(Color(red: 0.72, green: 0.82, blue: 0.65), Color(red: 0.36, green: 0.5, blue: 0.32))
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 16) {
                MetalAttachment(name: "Alfama at dusk.png", size: 3_420_000, preview: warm)
                HStack(alignment: .top, spacing: 12) {
                    MetalAttachment(name: "Alfama at dusk.png", size: 3_420_000, preview: warm, kind: .tile, remove: {}, open: {})
                    MetalAttachment(name: "Tram 28.jpg", size: 2_100_000, progress: 48, preview: cool, kind: .tile, remove: {})
                    MetalAttachment(name: "Miradouro.jpg", size: 4_800_000, error: "Connection lost", preview: green, kind: .tile, retry: {}, remove: {})
                    MetalAttachment(name: "Tickets.pdf", size: 380_000, kind: .tile, remove: {})
                }
                .frame(height: 170)
                HStack(spacing: 8) {
                    MetalAttachment(name: "Alfama at dusk.png", preview: warm, kind: .tile, compact: true, remove: {})
                    MetalAttachment(name: "Tram 28.jpg", preview: cool, kind: .tile, compact: true, remove: {})
                    MetalAttachment(name: "Itinerary.pdf", kind: .tile, compact: true, remove: {})
                }
            }
            .foregroundColor(colorway.tokens.ink.color)
            .frame(width: 520, alignment: .leading)
            .environment(\.metalWaitFrozen, true)
            try write("attachment-tiles", colorway, view)
        }
    }
}
