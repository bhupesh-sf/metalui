import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

@MainActor
final class MetalButtonGroupCaptures: XCTestCase {
    func testButtonGroupBars() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: MetalSettingsMetrics.rowGap) {
                HStack(spacing: MetalSettingsMetrics.rowGap) {
                    MetalButtonGroup("History", parts: [.key("Undo", icon: .undo) {}, .key("Redo", icon: .redo) {}])
                    MetalButtonGroup("Zoom", parts: [
                        .key("Zoom out", icon: .zoomOut, showsTitle: false) {},
                        .readout("100 %"),
                        .key("Zoom in", icon: .zoomIn, showsTitle: false) {},
                    ])
                }
                HStack(spacing: MetalSettingsMetrics.rowGap) {
                    MetalButtonGroup("Alignment", parts: [
                        .latch("Left", isOn: .constant(true)), .latch("Centre", isOn: .constant(false)), .latch("Right", isOn: .constant(false)),
                    ])
                    MetalButtonGroup("Clipboard", size: .compact, parts: [.key("Cut") {}, .key("Copy") {}, .key("Paste", disabled: true) {}])
                }
                MetalSplitButton("Export PDF", icon: .download, menuLabel: "More export options", items: [MetalMenuItem("PNG") {}]) {}
            }
            .padding(MetalSettingsMetrics.rowPadX)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.cgImage)
            let dir = try XCTUnwrap(ProcessInfo.processInfo.environment["METALUI_CAPTURES"])
            let url = URL(fileURLWithPath: dir).appendingPathComponent("button-group-\(colorway.rawValue).png")
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
        }
    }
}
