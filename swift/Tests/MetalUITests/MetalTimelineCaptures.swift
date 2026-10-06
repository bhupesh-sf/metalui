import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Timeline page's SwiftUI twin: an order's status under the now marker, a pipeline that waits and
/// fails, and an activity feed with glyphs and dates on the left.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalTimelineCaptures
@MainActor
final class MetalTimelineCaptures: XCTestCase {
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

    func testTimeline() {
        let now = Date(timeIntervalSince1970: 1_791_300_000)
        let ago = { (s: TimeInterval) in now.addingTimeInterval(-s) }
        let order = [
            MetalTimelineEvent(id: "placed", "Order placed", description: "3 prints, €60", time: ago(183_600)),
            MetalTimelineEvent(id: "shipped", "Shipped", description: "CTT Expresso · RR 4312 PT", time: ago(86_400)),
            MetalTimelineEvent(id: "hub", "At the Porto hub", description: "Sorted for delivery", time: ago(10_800)),
            MetalTimelineEvent(id: "out", "Out for delivery", description: "Van 12, before 18:00", time: ago(1_500), state: .live),
            MetalTimelineEvent(id: "eta", "Expected delivery", description: "Thursday, before 18:00", time: now.addingTimeInterval(172_800), state: .planned),
        ]
        let pipeline = [
            MetalTimelineEvent(id: "checkout", "Checkout", duration: 22),
            MetalTimelineEvent(id: "install", "Install", duration: 38),
            MetalTimelineEvent(id: "test", "Test", description: "2 of 148 tests failed", duration: 53, state: .failed),
            MetalTimelineEvent(id: "approve", "Approval", description: "Needs an owner", state: .waiting),
            MetalTimelineEvent(id: "deploy", "Deploy to production", description: "metalui.dev", state: .planned),
        ]
        let feed = [
            MetalTimelineEvent(id: "f5", "Ana is editing", time: ago(60), state: .live, glyph: .pen),
            MetalTimelineEvent(id: "f4", "Rui tagged 6 notes", time: ago(720), glyph: .tag),
            MetalTimelineEvent(id: "f3", "Ana uploaded 3 photos", description: "Tram 28, Tiles", time: ago(7_200), glyph: .upload),
            MetalTimelineEvent(id: "f1", "Board created", time: ago(259_200), glyph: .document),
        ]
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: MetalSpace.s32) {
                MetalTimeline(order, label: "Order 4312", format: .datetime, now: now).frame(width: 400)
                MetalTimeline(pipeline, label: "Pipeline run", now: now).frame(width: 300)
                MetalTimeline(feed, label: "Board activity", now: now, timeSide: .start).frame(width: 320)
            }
            .padding(32)
            .frame(width: 1180, height: 400, alignment: .topLeading)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            .environment(\.metalWaitFrozen, true)
            capture("timeline-\(colorway.rawValue)", view)
        }
    }
}
