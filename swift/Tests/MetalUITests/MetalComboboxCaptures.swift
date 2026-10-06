import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI combobox beside the web playground on metalui.dev (docs/captures/swift/combobox-*.png): a field
/// open on "bo" with the typed letters standing out and the glide on a row; people with avatars and a second
/// line; labels as chips with the create row and a command behind hairlines; a picker from a button.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalComboboxCaptures
@MainActor
final class MetalComboboxCaptures: XCTestCase {
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

    func testCombobox() throws {
        let cities = ["Bologna", "Bordeaux", "Lisbon", "Madrid"].map { MetalComboboxItem($0) }
        let people = [
            MetalComboboxItem("maria", label: "Maria Costa", description: "maria@studio.pt", person: "Maria Costa"),
            MetalComboboxItem("maria-s", label: "Maria Silva", description: "msilva@harbour.co", person: "Maria Silva"),
        ]
        let labels = ["Bug", "Design", "Docs", "Urgent"].map { MetalComboboxItem($0) }
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 28) {
                VStack(alignment: .leading, spacing: 28) {
                    MetalCombobox("City", selection: .constant(nil), items: cities, prompt: "Choose a city")
                        .specimen(query: "bo", highlighted: 1)
                    MetalCombobox("Person", selection: .constant(nil), items: people, prompt: "Find a person")
                        .specimen(query: "maria", highlighted: 0)
                }
                .frame(width: 260, alignment: .leading)
                VStack(alignment: .leading, spacing: 28) {
                    MetalCombobox("Labels", selections: .constant(["Design", "Urgent"]), items: labels, prompt: "Add labels",
                                  onCreate: { $0 }, actions: [MetalComboboxAction("Manage labels\u{2026}", icon: .settings) {}])
                        .specimen(query: "Lisbon")
                    HStack(spacing: 8) {
                        MetalCombobox("Assign", selection: .constant("maria-s"), items: people, prompt: "Assign", trigger: .button)
                        MetalCombobox("Kind", selection: .constant(nil), items: labels, prompt: "Kind", size: .compact, trigger: .button)
                    }
                }
                .frame(width: 300, alignment: .leading)
            }
            try write("combobox", colorway, view)
        }
    }
}
