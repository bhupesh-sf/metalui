import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI slider beside the web playground on metalui.dev (docs/captures/swift/slider-*.png):
/// at the minimum, part way and at the maximum, so the knob can be seen sitting flush inside the
/// groove's ends with the fill's end and the labelled ticks under its centre.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalSliderCaptures
@MainActor
final class MetalSliderCaptures: XCTestCase {
    private let ticks = [0, 0.25, 0.5, 0.75, 1].map { MetalSliderTick(at: $0, label: "\(Int($0 * 100))") }

    private func slider(_ value: Double) -> some View {
        MetalSlider(value: .constant(value), in: 0...100, step: 1, largeStep: 10,
                    ticks: ticks, label: "Amount", valueText: { "\(Int($0))" })
            .frame(width: 360, height: 48)
    }

    /// The kinds beside the web's Kinds, Vertical and Right to left sections
    /// (docs/captures/swift/slider-kinds-<colorway>.png): a range, detents, centred, ink, a vertical
    /// fader with ticks, and the same slider right to left.
    func testSliderKinds() throws {
        let percent = { (v: Double) in "\(Int(v))%" }
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 36) {
                VStack(spacing: 20) {
                    MetalSlider(range: .constant(40...160), in: 0...200, step: 5, largeStep: 25,
                                ticks: [0, 0.5, 1].map { MetalSliderTick(at: $0, label: "$\(Int($0 * 200))") },
                                showsValue: true, label: "Price", valueText: { "$\(Int($0))" })
                        .frame(width: 360, height: 48)
                    MetalSlider(value: .constant(2), in: 0...5, step: 1, largeStep: 1, detents: true, showsValue: true,
                                label: "Grid size", valueText: { "\([4, 8, 12, 16, 24, 32][Int($0)]) px" })
                        .frame(width: 360, height: 32)
                    MetalSlider(value: .constant(-20), in: -50...50, step: 1, largeStep: 10, origin: 0, showsValue: true,
                                label: "Balance", valueText: { $0 == 0 ? "C" : $0 < 0 ? "L\(Int(-$0))" : "R\(Int($0))" })
                        .frame(width: 360, height: 32)
                    MetalSlider(value: .constant(84), in: 0...240, step: 1, largeStep: 15, tone: .ink, showsValue: true,
                                label: "Position", valueText: { "\(Int($0) / 60):\(String(format: "%02d", Int($0) % 60))" })
                        .frame(width: 360, height: 32)
                    MetalSlider(value: .constant(100), in: 0...100, step: 1, largeStep: 10,
                                ticks: [0, 0.5, 1].map { MetalSliderTick(at: $0, label: "\(Int($0 * 100))") },
                                endIcon: .sun, showsValue: true, label: "Brightness", valueText: percent)
                        .frame(width: 360, height: 48)
                        .environment(\.layoutDirection, .rightToLeft)
                }
                MetalSlider(value: .constant(70), in: 0...100, step: 1, largeStep: 10,
                            ticks: [0, 0.5, 1].map { MetalSliderTick(at: $0, label: "\(Int($0 * 100))") },
                            orientation: .vertical, showsValue: true, label: "Voice", valueText: percent)
                    .frame(height: 200)
            }
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.cgImage)
            guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { continue }
            let url = URL(fileURLWithPath: dir).appendingPathComponent("slider-kinds-\(colorway.rawValue).png")
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
        }
    }

    func testSliderGeometry() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 20) {
                slider(0)
                slider(40)
                slider(100)
                // the playground's zoom: glyphs at the ends, the value beside it, in each size
                ForEach(MetalSliderSize.allCases, id: \.self) { size in
                    MetalSlider(value: .constant(100), in: 25...200, step: 5, largeStep: 25,
                                size: size, startIcon: .zoomOut, endIcon: .zoomIn, showsValue: true,
                                label: "Zoom", valueText: { "\(Int($0))%" })
                        .frame(width: 360, height: 32)
                }
                // disabled: the whole slider at 40 %
                MetalSlider(value: .constant(35), in: 0...100, step: 1, largeStep: 10, showsValue: true,
                            label: "Volume", valueText: { "\(Int($0))%" })
                    .frame(width: 360, height: 32)
                    .disabled(true)
            }
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            let renderer = ImageRenderer(content: view)
            renderer.scale = 2
            let image = try XCTUnwrap(renderer.cgImage)
            guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { continue }
            let url = URL(fileURLWithPath: dir).appendingPathComponent("slider-\(colorway.rawValue).png")
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
        }
    }
}
