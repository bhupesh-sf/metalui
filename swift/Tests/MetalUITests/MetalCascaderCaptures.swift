import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Cascader page's SwiftUI twin: places opened down to Lisbon (columns), a search across levels,
/// and several values with a box showing the dash.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCascaderCaptures
@MainActor
final class MetalCascaderCaptures: XCTestCase {
    private func capture<V: View>(_ name: String, _ view: V) {
        let renderer = ImageRenderer(content: view)
        renderer.scale = 2
        guard let image = renderer.cgImage else { return XCTFail("\(name) did not render") }
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name).png")
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let rep = NSBitmapImageRep(cgImage: image)
        XCTAssertNoThrow(try rep.representation(using: .png, properties: [:])!.write(to: url))
    }

    private static func cities(_ country: String, _ names: [String]) -> [MetalTreeItem] {
        names.map { MetalTreeItem("\(country)/\($0.lowercased())", $0) }
    }

    private static let places: [MetalTreeItem] = [
        MetalTreeItem("europe", "Europe", children: [
            MetalTreeItem("pt", "Portugal", children: cities("pt", ["Lisbon", "Porto", "Coimbra", "Faro"])),
            MetalTreeItem("es", "Spain", children: cities("es", ["Madrid", "Barcelona", "Seville"])),
            MetalTreeItem("fr", "France", children: cities("fr", ["Paris", "Lyon"]) + [MetalTreeItem("fr/nice", "Nice", disabled: true, trail: "Closed")]),
            MetalTreeItem("is", "Iceland", children: []),
        ]),
        MetalTreeItem("americas", "Americas", children: [
            MetalTreeItem("us", "United States", children: [
                MetalTreeItem("us/tx", "Texas", children: cities("us/tx", ["Austin", "Paris"])),
            ]),
        ]),
        MetalTreeItem("asia", "Asia", hasChildren: true),
    ]

    func testCascader() {
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: MetalSpace.s32) {
                MetalCascader("Place", items: Self.places, selection: .constant("pt/lisbon"))
                    .specimen(trail: ["europe", "pt"], active: "pt/porto")
                    .fixedSize()
                MetalCascader("Place", items: Self.places, selection: .constant("us/tx/paris"))
                    .specimen(trail: [], active: nil, query: "par")
                    .fixedSize()
                MetalCascader("Ship to", items: Self.places, values: .constant(["pt", "fr/paris"]), max: 3)
                    .specimen(trail: ["europe"], active: "es")
                    .fixedSize()
            }
            .padding(32)
            .frame(width: 1640, height: 420, alignment: .topLeading)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("cascader-\(colorway.rawValue)", view)
        }
    }
}
