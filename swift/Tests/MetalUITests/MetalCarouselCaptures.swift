import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI carousel beside the web playground on metalui.dev (docs/captures/swift/carousel-*.png): a listing's
/// photos as Attachment tiles, three in view with the next peeking, the readout and the keys under them.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCarouselCaptures
@MainActor
final class MetalCarouselCaptures: XCTestCase {
    private struct Photo: Identifiable {
        let id: String
        let size: Int
        let colors: [Color]
    }

    private func write<V: View>(_ name: String, _ colorway: MetalColorway, _ view: V) throws {
        let framed = view
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
        // ImageRenderer draws a ScrollView empty: host it in a window and cache its display instead.
        let host = NSHostingView(rootView: framed)
        host.frame = NSRect(origin: .zero, size: host.fittingSize)
        let window = NSWindow(contentRect: host.frame, styleMask: .borderless, backing: .buffered, defer: false)
        window.contentView = host
        host.layoutSubtreeIfNeeded()
        RunLoop.main.run(until: Date().addingTimeInterval(0.3))
        let rep = try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in: host.bounds))
        host.cacheDisplay(in: host.bounds, to: rep)
        let image = try XCTUnwrap(rep.cgImage)
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name)-\(colorway.rawValue).png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
    }

    func testCarousel() throws {
        let photos = [
            Photo(id: "Living room.jpg", size: 3_420_000, colors: [.orange.opacity(0.5), .brown]),
            Photo(id: "Kitchen.jpg", size: 2_100_000, colors: [.blue.opacity(0.4), .indigo]),
            Photo(id: "Terrace.jpg", size: 4_800_000, colors: [.green.opacity(0.4), .green]),
            Photo(id: "Bedroom.jpg", size: 2_900_000, colors: [.pink.opacity(0.4), .purple]),
        ]
        for colorway in MetalColorway.allCases {
            let view = MetalCarousel("Listing photos", items: photos, slideWidth: 140) { p in
                MetalAttachment(name: p.id, size: p.size,
                                preview: Image(nsImage: NSImage(size: NSSize(width: 160, height: 160), flipped: false) { rect in
                                    NSGradient(colors: p.colors.map { NSColor($0) })?.draw(in: rect, angle: -45)
                                    return true
                                }), kind: .tile)
            }
            .frame(width: 500)
            try write("carousel", colorway, view)
        }
    }
}
