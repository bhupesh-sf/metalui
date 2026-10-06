import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI collapsible beside the web playground on metalui.dev (docs/captures/swift/collapsible-*.png): an
/// export card with Advanced open and a closed row saying its summary; a line with its key and the list it opens.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCollapsibleCaptures
@MainActor
final class MetalCollapsibleCaptures: XCTestCase {
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

    func testCollapsible() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 28) {
                MetalCard("Export Lisbon", description: "Every region of the canvas, as one file.", media: { EmptyView() }) {
                    VStack(alignment: .leading, spacing: 12) {
                        MetalCollapsible("Advanced", isOpen: .constant(true), summary: "PNG, 2×") {
                            HStack(spacing: 10) { MetalSwitch("Canvas background", isOn: .constant(true)); Text("Canvas background").font(.metal(MetalType.ui)) }.padding(.vertical, 8)
                        }
                        MetalCollapsible("Metadata", isOpen: .constant(false), summary: "Title, date") { EmptyView() }
                        MetalButton("Export", cap: .primary) {}
                    }
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Ana starred 3 repositories").font(.metal(MetalType.ui))
                        Spacer()
                        MetalCollapsibleKey("Show repositories", isOpen: .constant(true))
                    }
                    MetalCollapsiblePanel(isOpen: true) {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(["ana/lisbon-sketches", "ana/tram-map", "studio/metalui"], id: \.self) {
                                Text($0).font(.metal(MetalType.readout))
                            }
                        }
                    }
                }
                MetalCollapsible(isOpen: .constant(false), more: .count(3)) { EmptyView() }
            }
            .frame(width: 360, alignment: .leading)
            try write("collapsible", colorway, view)
        }
    }
}
