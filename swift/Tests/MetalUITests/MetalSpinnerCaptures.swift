import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Spinner page's SwiftUI twin: each placement caught mid-wait, beside the web on metalui.dev.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalSpinnerCaptures
@MainActor
final class MetalSpinnerCaptures: XCTestCase {
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

    private func row(_ name: String, _ meta: String, phase: MetalWaitPhase, value: Double? = nil, ink: Color) -> some View {
        MetalRow(.option, waiting: phase == .shown || phase == .quiet) {
            MetalSpinner(label: "Archiving \(name)", phase: phase, value: value) { MetalIcon(.document, size: 14) }
                .frame(width: 14, height: 14)
                .foregroundStyle(ink)
        } text: { MetalRowText(name) } trail: {
            Text(meta).font(.metal(MetalType.meta)).foregroundStyle(ink)
        }
    }

    func testSpinnerPlacements() {
        for colorway in MetalColorway.allCases {
            let t = colorway.tokens
            let view = VStack(spacing: 24) {
                MetalSurface(.raise, radius: .card) { VStack(spacing: 4) {
                    row("Harbour survey.pdf", "Archiving…", phase: .shown, ink: t.ink2.color)
                    row("Tide tables 2026.csv", "Archived", phase: .done, ink: t.ink2.color)
                    row("harbour.jpg", "38 %", phase: .shown, value: 38, ink: t.ink2.color)
                }
                .padding(8)
                .frame(width: 400) }
                HStack(spacing: 32) {
                    MetalChip(.suggestion, waiting: true) {
                        MetalSpinner(size: .small, label: "Applying Travel", phase: .shown)
                        MetalChipText { Text("Travel") }
                    }
                    MetalAvatar(name: "Ana Rocha", waiting: true)
                }
                MetalCard("Harbour at dusk", description: "Lifting the subject…", waiting: true)
                    .frame(width: 300)
                MetalSurface(.raise, radius: .card) { ZStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pick up the prints on Thursday")
                        Text("Two copies of the plan, one folded for the car")
                    }
                    .font(.metal(MetalType.ui))
                    .foregroundStyle(t.ink.color)
                    .padding(20)
                    .frame(width: 400, alignment: .leading)
                    MetalSpinnerBar(phase: .shown)
                } }
                .clipShape(RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous))
                MetalStatusBadge("Syncing 3 notes", led: .waiting)
            }
            .padding(32)
            .environment(\.metalWaitFrozen, true)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("spinner-\(colorway.rawValue)", view)
        }
    }
}
