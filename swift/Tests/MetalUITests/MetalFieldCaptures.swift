import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI field and form field beside the web playgrounds on metalui.dev
/// (docs/captures/swift/field-*.png, form-field-*.png): the three sizes, the caret, a prefix and suffix,
/// the trail's keys, the counter and chars; a form field with its marks, readback and error.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalFieldCaptures
@MainActor
final class MetalFieldCaptures: XCTestCase {
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

    func testField() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 16) {
                MetalField("Lens or action", text: .constant("north"), prompt: "Lens or action", icon: .search,
                           clear: true, shortcut: "⌘K").snapshot(focused: true)
                MetalField("Website", text: .constant("studio"), size: .regular, prefix: "https://", suffix: ".metalui.dev")
                    .snapshot(focused: false)
                MetalField("Display name", text: .constant("Morning pages, kitchen"), size: .regular, limit: 24)
                    .snapshot(focused: false)
                HStack(spacing: 12) {
                    MetalField("Postcode", text: .constant(""), prompt: "SW1A 1AA", size: .regular, chars: 8).snapshot(focused: false)
                    MetalField("Weight", text: .constant("12.5"), size: .compact, suffix: "kg", chars: 6).snapshot(focused: false)
                }
                MetalField("Username", text: .constant("vijay"), size: .regular, prefix: "@", check: "Name available")
                    .snapshot(focused: false)
                MetalField("API key", text: .constant("mu_live_7Hq2v9KcX4"), size: .regular, copy: true).snapshot(focused: false)
                MetalField("Password", text: .constant("north-light-42"), size: .regular, secure: true).snapshot(focused: false)
            }
            .frame(width: 320, alignment: .leading)
            try write("field", colorway, view)
        }
    }

    func testFormField() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 20) {
                MetalFormField("Region name", description: "Shown on its edge and in search.", error: "Use at least 3 letters.", changed: true) {
                    MetalField("Region name", text: .constant("ab"), size: .regular).snapshot(focused: false)
                }
                MetalFormField("Remind me", readback: "Wed 7 Oct, 08:00", mark: .optional) {
                    MetalField("Remind me", text: .constant("tomorrow 8am"), size: .regular, icon: .calendar).snapshot(focused: false)
                }
                MetalFormField("Studio name", orientation: .horizontal) {
                    MetalField("Studio name", text: .constant("North light"), size: .regular).snapshot(focused: false)
                }
                MetalFieldset("Contact") {
                    MetalFormField("Display name", mark: .required) {
                        MetalField("Display name", text: .constant(""), size: .regular).snapshot(focused: false)
                    }
                }
            }
            .padding(.leading, 12)
            .frame(width: 440, alignment: .leading)
            try write("form-field", colorway, view)
        }
    }
}
