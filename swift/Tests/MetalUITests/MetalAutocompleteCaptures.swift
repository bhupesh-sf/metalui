import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI autocomplete beside the web playground on metalui.dev (docs/captures/swift/autocomplete-*.png): a city
/// search open on "li" with the rest of "Lisbon" after the text and the rows that start with it first; an email "To"
/// with avatars, completing an address.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalAutocompleteCaptures
@MainActor
final class MetalAutocompleteCaptures: XCTestCase {
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

    func testAutocomplete() throws {
        let cities = ["Berlin", "Dublin", "Lisbon", "Ljubljana", "Lyon"].map { MetalComboboxItem($0) }
        let people = [
            MetalComboboxItem("maria@studio.pt", label: "Maria Costa", description: "maria@studio.pt", person: "Maria Costa"),
            MetalComboboxItem("msilva@harbour.co", label: "Maria Silva", description: "msilva@harbour.co", person: "Maria Silva"),
        ]
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 28) {
                MetalAutocomplete("City", text: .constant(""), items: cities, prompt: "Search a city", icon: .search)
                    .specimen(text: "li")
                    .frame(width: 260, alignment: .leading)
                MetalAutocomplete("To", text: .constant(""), items: people, prompt: "Name or address")
                    .specimen(text: "mar", highlighted: 0)
                    .frame(width: 280, alignment: .leading)
            }
            try write("autocomplete", colorway, view)
        }
    }
}
