import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI signature pad beside the web playground on metalui.dev (docs/captures/swift/signature-pad-*.png):
/// a drawn signature, a typed one, initials on a compact pad, and the empty paper.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalSignaturePadCaptures
@MainActor
final class MetalSignaturePadCaptures: XCTestCase {
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

    private static func wave(_ x0: Double, _ y0: Double, _ n: Int, _ amp: Double, _ len: Double) -> [MetalSignaturePoint] {
        (0..<n).map { i in
            let t = Double(i) / Double(n - 1)
            return MetalSignaturePoint(x0 + t * len, y0 - sin(t * .pi * 3) * amp * (1 - t * 0.4), width: 1.4 + 1.8 * sin(t * .pi))
        }
    }

    func testSignaturePad() throws {
        let drawn = MetalSignature(.drawn([Self.wave(40, 100, 60, 26, 170), Self.wave(200, 104, 50, 14, 150)]), width: 420, height: 160)
        let initials = MetalSignature(.drawn([Self.wave(30, 50, 30, 12, 90)]), width: 160, height: 88)
        let typed = MetalSignature(.typed("Ana Ribeiro"), width: 420, height: 160)
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 20) {
                MetalSignaturePad(signature: .constant(drawn))
                MetalSignaturePad(signature: .constant(typed), readOnly: true)
                HStack(alignment: .top, spacing: 16) {
                    MetalSignaturePad(signature: .constant(initials), size: .compact, hint: "Initials", label: "Initials").frame(width: 160)
                    MetalSignaturePad(signature: .constant(nil), size: .compact, hint: "Initials", label: "Initials").frame(width: 160)
                }
            }
            .foregroundColor(colorway.tokens.ink.color)
            .frame(width: 420, alignment: .leading)
            try write("signature-pad", colorway, view)
        }
    }
}
