import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Chart page's SwiftUI twin: a usage trend with a missing day, orders by region in grouped bars, and
/// the failed state.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalChartCaptures
@MainActor
final class MetalChartCaptures: XCTestCase {
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

    func testChart() {
        let days = (1...30).map { "\($0) Sep" }
        func wave(_ i: Int, _ base: Double, _ grow: Double) -> Double {
            (base + grow * Double(i) + (i % 7 >= 5 ? -0.35 : 0.12) * base + (i >= 15 ? base * 0.3 : 0) + Double((i * 37) % 11) * base * 0.02).rounded()
        }
        let september: [Double?] = (0..<30).map { $0 == 21 ? nil : wave($0, 1200, 18) }
        let august: [Double?] = (0..<30).map { wave($0, 1050, 6) }
        let k = { (v: Double) in String(format: "%.1f k", v / 1000) }
        let usage = [MetalChartSeries(id: "sep", "September", values: september, signal: true),
                     MetalChartSeries(id: "aug", "August", values: august)]
        let regions = ["Lisbon", "Porto", "Madrid", "Paris", "Berlin"]
        let quarters = [MetalChartSeries(id: "q2", "Q2", values: [412, 268, 355, 498, 301]),
                        MetalChartSeries(id: "q3", "Q3", values: [468, 254, 402, 520, 377], signal: true)]
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: MetalSpace.s32) {
                MetalChart(usage, categories: days, label: "API requests per day", kind: .line, format: k).frame(width: 520)
                MetalChart(quarters, categories: regions, label: "Orders by region", kind: .bar).frame(width: 360)
                MetalChart(quarters, categories: regions, label: "Orders by region", kind: .bar, error: "Couldn’t load the orders.").frame(width: 240)
            }
            .padding(32)
            .frame(width: 1240, height: 330, alignment: .topLeading)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            .transaction { $0.disablesAnimations = true }
            capture("chart-\(colorway.rawValue)", view)
        }
    }
}
