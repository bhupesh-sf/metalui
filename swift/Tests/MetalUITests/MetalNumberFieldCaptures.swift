import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI number field beside the web playground on metalui.dev (docs/captures/swift/number-field-*.png):
/// the three sizes, ⇧ held (the legends), a unit, arithmetic read back, a soft limit, off its default,
/// mixed, and the inspector.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalNumberFieldCaptures
@MainActor
final class MetalNumberFieldCaptures: XCTestCase {
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

    func testNumberField() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 20) {
                HStack(alignment: .bottom, spacing: 16) {
                    MetalNumberField("Copies", value: .constant(2), in: 1...20, smallStep: 1, size: .large)
                    MetalNumberField("Copies", value: .constant(2), in: 1...20, smallStep: 1)
                    MetalNumberField("Copies", value: .constant(2), in: 1...20, smallStep: 1, size: .compact)
                }
                HStack(alignment: .top, spacing: 16) {
                    MetalNumberField("Opacity", value: .constant(80), in: 0...100, unit: "%").preview(held: .coarse)
                    MetalNumberField("Width", value: .constant(240), in: 0...4000, unit: "px").preview(draft: "*2")
                }
                HStack(alignment: .top, spacing: 16) {
                    MetalNumberField("Seats", value: .constant(140), in: 1...100, softLimits: true)
                    MetalNumberField("Font size", value: .constant(18), in: 8...72, unit: "pt", default: 16)
                        .padding(.leading, 12)
                    MetalNumberField("Opacity", value: .constant(nil), in: 0...100, unit: "%", mixed: true)
                }
                HStack(spacing: 8) {
                    MetalNumberField("X", value: .constant(120), in: -10_000...10_000, size: .compact, kind: .inspector, letter: "X")
                    MetalNumberField("Width", value: .constant(320), in: 0...10_000, size: .compact, kind: .inspector, letter: "W", default: 300)
                    MetalNumberField("Rotation", value: .constant(45), in: -180...180, size: .compact, kind: .inspector, letter: "∠", unit: "°")
                }
            }
            .frame(width: 520, alignment: .leading)
            try write("number-field", colorway, view)
        }
    }
}
