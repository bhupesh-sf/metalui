import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI code field beside the web playground on metalui.dev (docs/captures/swift/code-field-*.png): a code
/// half typed with the current slot focused, a wrong code ringed, a recovery code at the regular size, and Resend.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCodeFieldCaptures
@MainActor
final class MetalCodeFieldCaptures: XCTestCase {
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

    func testCodeField() throws {
        for colorway in MetalColorway.allCases {
            let ink = (colorway == .bone ? MetalColorway.bone : MetalColorway.graphite).tokens
            let view = VStack(alignment: .leading, spacing: 20) {
                Text("Sign-in code").font(.metal(MetalType.ui)).foregroundColor(ink.ink.color)
                MetalCodeField("Sign-in code", text: .constant("246")).snapshot()
                MetalCodeField("Sign-in code", text: .constant("246000"), invalid: true).snapshot(focused: false)
                MetalCodeField("Recovery code", text: .constant("K7Q2"), length: 8, size: .regular, kind: .alphanumeric).snapshot(focused: false)
                MetalCodeFieldResend(onResend: {})
            }
            .frame(width: 380, alignment: .leading)
            try write("code-field", colorway, view)
        }
    }
}
