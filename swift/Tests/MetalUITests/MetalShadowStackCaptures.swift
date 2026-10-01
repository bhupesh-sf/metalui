import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// Shadow stacks render once into one texture (PERFORMANCE rule 12); these captures prove the
/// blur is not cut off at the view bounds. Set `METALUI_CAPTURES` to a directory to write PNGs:
///
///     METALUI_CAPTURES=docs/captures/swift-shadow-after swift test --filter MetalShadowStackCaptures
@MainActor
final class MetalShadowStackCaptures: XCTestCase {
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

    private func page(_ colorway: MetalColorway) -> Color {
        colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color
    }

    func testFrostStacks() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 48) {
                ForEach(MetalFrost.allCases, id: \.self) { frost in
                    Color.clear
                        .frame(width: 160, height: 56)
                        .metalFrost(frost, in: RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous))
                }
            }
            .padding(64)
            .background(page(colorway))
            .metalColorway(colorway)
            capture("shadow-frost-\(colorway.rawValue)", view)
        }
    }

    func testLargestBlurObjects() {
        for colorway in MetalColorway.allCases {
            let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)
            let view = HStack(spacing: 96) {
                ForEach([MetalRecipes.menu, MetalRecipes.toast, MetalRecipes.tooltip], id: \.name) { recipe in
                    Color.clear
                        .frame(width: 180, height: 120)
                        .metalObjectRecipe(recipe, part: "self", in: shape)
                }
            }
            .padding(120)
            .background(page(colorway))
            .metalColorway(colorway)
            capture("shadow-largest-\(colorway.rawValue)", view)
        }
    }

    func testWellOuterStack() {
        for colorway in MetalColorway.allCases {
            let view = MetalWell(.field) { Color.clear.frame(width: 160, height: 80) }
                .padding(64)
                .background(page(colorway))
                .metalColorway(colorway)
            capture("shadow-well-\(colorway.rawValue)", view)
        }
    }
}
