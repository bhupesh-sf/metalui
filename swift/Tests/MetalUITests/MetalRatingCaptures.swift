import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI rating beside the web playground on metalui.dev (docs/captures/swift/rating-*.png): an average
/// with its count and a decimal cut square; your own rating with its word; the three sizes; disabled.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalRatingCaptures
@MainActor
final class MetalRatingCaptures: XCTestCase {
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

    func testRating() throws {
        for colorway in MetalColorway.allCases {
            let row = { (title: String, content: AnyView) in
                HStack { Text(title).font(.metal(MetalType.ui)); Spacer(); content }
            }
            let view = VStack(alignment: .leading, spacing: 16) {
                row("Tram 28 café", AnyView(MetalRating(rating: 4.3, count: 1284, label: "Average")))
                row("Your rating", AnyView(MetalRating(value: .constant(4), labels: ["Poor", "Fair", "Good", "Very good", "Excellent"], label: "Your rating")))
                row("Compact", AnyView(MetalRating(value: .constant(3), showsValue: false, size: .compact, label: "Compact")))
                row("Large", AnyView(MetalRating(value: .constant(2), size: .large, label: "Large")))
                row("Closed", AnyView(MetalRating(value: .constant(3), label: "Closed").disabled(true)))
            }
            .foregroundColor(colorway.tokens.ink.color)
            .frame(width: 360, alignment: .leading)
            try write("rating", colorway, view)
        }
    }
}
