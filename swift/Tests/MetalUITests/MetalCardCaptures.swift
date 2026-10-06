import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Card page's SwiftUI twin: a tray of trips with an empty slot, a stacked plate of sections, side
/// cards, a wall with status LEDs and latched choice cards, beside the web on metalui.dev.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCardCaptures
@MainActor
final class MetalCardCaptures: XCTestCase {
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

    private func cover(_ a: Color, _ b: Color) -> some View {
        LinearGradient(colors: [a, b], startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    func testCards() {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 24) {
                MetalCardFrame(.separated) {
                    MetalCard("Trip to Lisbon", description: "14 notes, 3 photos, a tram map.", selected: true,
                              action: MetalCardAction("More for Trip to Lisbon") {}, open: {}) {
                        cover(Color(red: 0.91, green: 0.79, blue: 0.63), Color(red: 0.76, green: 0.49, blue: 0.37))
                    } footer: {
                        MetalButton("Share", size: .compact) {}
                    }
                    MetalCard("Untitled trip", description: "Making the trip…", waiting: true, action: MetalCardAction("More for Untitled trip") {}, open: {})
                    MetalCardEmptySlot("New trip") {}
                }
                HStack(alignment: .top, spacing: 24) {
                    MetalCardFrame(.stacked) {
                        MetalCard("Profile", description: "Your name and picture.", open: {})
                        MetalCard("Devices", description: "Three devices, synced.", status: .live, statusLabel: "Syncing", open: {})
                        MetalCard("Storage", description: "4.2 GB of 10 GB used.")
                    }
                    MetalCardFrame(.separated, size: .compact, orientation: .horizontal) {
                        MetalCard("Harbour at dusk", description: "Photo · Lisbon", open: {}) {
                            cover(Color(red: 0.91, green: 0.79, blue: 0.63), Color(red: 0.76, green: 0.49, blue: 0.37))
                        }
                        MetalCard("Tram 28 timetable", description: "Refreshing…", waiting: true, open: {}) {
                            cover(Color(red: 0.91, green: 0.87, blue: 0.63), Color(red: 0.73, green: 0.63, blue: 0.31))
                        }
                    }
                }
                MetalCardFrame(.ghost, size: .compact) {
                    MetalCard("Sync", description: "Up 14 days", status: .live, action: MetalCardAction("More for Sync") {}, open: {})
                    MetalCard("Thumbnails", description: "Deploy failed at 09:12", status: .failed, statusLabel: "Deploy failed", action: MetalCardAction("More for Thumbnails") {}, open: {})
                    MetalCard("Backups", description: "Queued", status: .waiting, statusLabel: "Queued", action: MetalCardAction("More for Backups") {}, open: {})
                }
                MetalCardChoices(selection: .constant("team")) {
                    MetalCardFrame(.separated) {
                        MetalCardChoice("Solo", description: "One person, every canvas.", value: "solo")
                        MetalCardChoice("Team", description: "Up to ten, shared regions.", value: "team")
                        MetalCardChoice("Studio", description: "Unlimited, with history.", value: "studio")
                    }
                }
            }
            .frame(width: 680)
            .padding(32)
            .environment(\.metalWaitFrozen, true)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("card-\(colorway.rawValue)", view)
        }
    }
}
