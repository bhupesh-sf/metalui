import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Link page's SwiftUI twin: every state SwiftUI can express, named under it, in both colorways.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalLinkCaptures
@MainActor
final class MetalLinkCaptures: XCTestCase {
    private let url = URL(string: "https://metalui.dev/components/link")!

    private func cell(_ name: String, _ link: some View, _ colorway: MetalColorway) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            link
            Text(name.uppercased()).font(.metal(MetalType.label)).tracking(MetalType.label.trackingPoints).foregroundStyle(colorway.tokens.ink3.color)
        }
        .frame(width: 170, alignment: .leading)
    }

    func testLinkStates() throws {
        for colorway in MetalColorway.allCases {
            let view = Grid(alignment: .leading, horizontalSpacing: 16, verticalSpacing: 22) {
                GridRow {
                    cell("rest", MetalLink("the export guide", destination: url), colorway)
                    cell("hover", MetalLink("the export guide", destination: url).environment(\.metalLinkStill, .hover), colorway)
                    cell("pressed", MetalLink("the export guide", destination: url).environment(\.metalLinkStill, .pressed), colorway)
                    cell("current", MetalLink("Link", destination: url, current: true), colorway)
                }
                GridRow {
                    cell("disabled", MetalLink("the export guide", destination: url, reason: "Export is on the Pro plan").disabled(true), colorway)
                    cell("loading", MetalLink("the Lisbon region", destination: url, loading: true), colorway)
                    cell("external", MetalLink("the WAI notes", destination: url, external: true), colorway)
                    cell("download", MetalLink("Tram map.pdf", destination: url, fileSize: "200 KB"), colorway)
                }
                GridRow {
                    cell("quiet", MetalLink("Lisbon", destination: url, kind: .quiet), colorway)
                    cell("standalone", MetalLink("All regions", destination: url, kind: .standalone), colorway)
                }
            }
            .padding(26)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.cgImage)
            guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { continue }
            let file = URL(fileURLWithPath: dir).appendingPathComponent("link-\(colorway.rawValue).png")
            try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
            try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: file)
        }
    }
}
