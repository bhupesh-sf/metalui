import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI scrollspy beside the web playground on metalui.dev (docs/captures/swift/scrollspy-*.png): the guide's
/// contents as a rail with Sintra current (two subsections indented under it), and as a compact strip.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalScrollspyCaptures
@MainActor
final class MetalScrollspyCaptures: XCTestCase {
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

    func testScrollspy() throws {
        let sections = [
            MetalScrollspySection("arrival", title: "Arrival"),
            MetalScrollspySection("alfama", title: "Alfama"),
            MetalScrollspySection("tram", title: "Tram 28"),
            MetalScrollspySection("sintra", title: "Sintra"),
            MetalScrollspySection("pena", title: "Pena Palace", level: 2),
            MetalScrollspySection("regaleira", title: "Quinta da Regaleira", level: 2),
            MetalScrollspySection("leaving", title: "Leaving"),
        ]
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 40) {
                MetalScrollspyRail("Guide contents", sections: sections, current: "sintra") { _ in }
                    .frame(width: 180)
                MetalScrollspyRail("Guide strip", sections: Array(sections.prefix(4)), current: "tram",
                                   orientation: .horizontal, size: .compact) { _ in }
                    .fixedSize()
            }
            try write("scrollspy", colorway, view)
        }
    }
}
