import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI stepper beside the web playground on metalui.dev (docs/captures/swift/stepper-*.png): a checkout
/// on Payment with Shipping's problem said; a vertical setup with its panel under the current step.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalStepperCaptures
@MainActor
final class MetalStepperCaptures: XCTestCase {
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

    func testStepper() throws {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 32) {
                MetalStepper([
                    MetalStep("Cart", description: "3 prints"),
                    MetalStep("Shipping", error: "Add an address"),
                    MetalStep("Payment", description: "Card ending 4242"),
                    MetalStep("Review"),
                ], current: .constant(2), linear: false) { _ in
                    Text("Name on card: Ana Duarte").font(.metal(MetalType.ui))
                }
                MetalStepper([
                    MetalStep("Sign in", description: "ana@example.com"),
                    MetalStep("This device", description: "Name it for the others"),
                    MetalStep("Folders", description: "What to keep in step"),
                ], current: .constant(1), linear: false, orientation: .vertical) { _ in
                    Text("Ana's studio Mac").font(.metal(MetalType.ui))
                }
            }
            .frame(width: 520, alignment: .leading)
            try write("stepper", colorway, view)
        }
    }
}
