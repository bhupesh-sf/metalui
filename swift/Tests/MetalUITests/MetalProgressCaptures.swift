import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Progress page's SwiftUI twin: the states, shapes and sizes, beside the web on metalui.dev.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalProgressCaptures
@MainActor
final class MetalProgressCaptures: XCTestCase {
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

    func testProgressStates() {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 24) {
                MetalProgress("Exporting 12 photos", value: 64, detail: "8 of 12 · about 10 s", icon: .download)
                MetalProgress("Export paused", value: 64, state: .paused, detail: "8 of 12", icon: .download)
                MetalProgress("Couldn’t export: the disk is full", value: 64, state: .failed, detail: "8 of 12", icon: .download)
                MetalProgress("Exported 12 photos", value: 100, state: .complete, detail: "12 of 12", icon: .download)
                MetalProgress("Copy notes", value: 2, steps: 4, showValue: true)
                MetalProgress("Harbour walk.mov", value: 28, size: .compact, buffer: 61, detail: "0:42 of 2:30")
                MetalProgress("Uploading", value: 46, shape: .slim)
                HStack(spacing: 24) {
                    MetalProgress("Uploading harbour.jpg", value: 38, shape: .ring)
                    MetalProgress("Uploading harbour.jpg", value: 38, state: .failed, shape: .ring)
                    MetalProgress("Uploaded", value: 100, state: .complete, shape: .ring)
                }
            }
            .frame(width: 360)
            .padding(32)
            .environment(\.metalWaitFrozen, true)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("progress-\(colorway.rawValue)", view)
        }
    }
}
