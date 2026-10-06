import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI phone input beside the web playground on metalui.dev (docs/captures/swift/phone-input-*.png): a UK
/// mobile number with its readback, a French one, and an empty German one showing its grouping in zeros.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalPhoneInputCaptures
@MainActor
final class MetalPhoneInputCaptures: XCTestCase {
    private func write<V: View>(_ name: String, _ colorway: MetalColorway, _ view: V) throws {
        let framed = view
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            .environment(\.locale, Locale(identifier: "en_GB"))
        let renderer = ImageRenderer(content: framed)
        renderer.scale = 2
        let image = try XCTUnwrap(renderer.cgImage)
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name)-\(colorway.rawValue).png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
    }

    private func phone(_ value: String?, _ country: String) -> MetalPhoneInput {
        var view = MetalPhoneInput("Phone", value: .constant(value), defaultCountry: country)
        view.snapshot = true
        return view
    }

    func testPhoneInput() throws {
        // Pasted numbers read as the web's do.
        let table = MetalPhoneTable()
        let gb = try XCTUnwrap(table.byCode["GB"])
        XCTAssertEqual(MetalPhoneTable.show(table.read("+44 (0)7700-900-123", in: gb)), "7700 900123")
        XCTAssertEqual(table.read("+1 416 555 0132", in: gb).country.code, "CA")
        XCTAssertEqual(table.read("0044 20 7946 0958", in: gb).nsn, "2079460958")
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Phone").font(.metal(MetalType.ui))
                    phone("+447700900123", "GB")
                }
                phone("+33612345678", "FR")
                phone(nil, "DE")
            }
            .frame(width: 300, alignment: .leading)
            try write("phone-input", colorway, view)
        }
    }
}
