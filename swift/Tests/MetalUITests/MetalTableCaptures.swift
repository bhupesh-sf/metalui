import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Table and Properties pages' SwiftUI twins: invoices in the cell kinds, and an invoice's details.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalTableCaptures
@MainActor
final class MetalTableCaptures: XCTestCase {
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

    private struct Invoice: Identifiable {
        let id: String
        let customer: String
        let items: Int
        let status: MetalLEDKind
        let owner: String
        let due: Date
        let amount: Double
        let change: Double
    }

    private static let now = Date(timeIntervalSince1970: 1_791_288_000)
    private static let words: [MetalLEDKind: String] = [.live: "Paid", .waiting: "Due", .failed: "Overdue", .off: "Draft"]
    private static let invoices: [Invoice] = [
        Invoice(id: "INV-2040", customer: "Northwind Studio", items: 1, status: .live, owner: "Ana Duarte", due: now.addingTimeInterval(-3 * 3600), amount: 120, change: 4.2),
        Invoice(id: "INV-2041", customer: "Atelier Sol", items: 2, status: .off, owner: "Omar Haddad", due: now.addingTimeInterval(2 * 86400), amount: 3239, change: 0),
        Invoice(id: "INV-2042", customer: "Harbour & Co", items: 3, status: .waiting, owner: "Lea Brandt", due: now.addingTimeInterval(-26 * 3600), amount: 1558, change: -12.8),
        Invoice(id: "INV-2043", customer: "Kite Labs", items: 4, status: .failed, owner: "Kenji Mori", due: now.addingTimeInterval(-5 * 86400), amount: 4677, change: 18.4),
    ]

    private var columns: [MetalTableColumn<Invoice>] {
        [
            MetalTableColumn("Customer") { .text($0.customer, detail: "\($0.id) · \($0.items) \($0.items == 1 ? "item" : "items")") },
            MetalTableColumn("Status", kind: .status, format: .init(words: Self.words)) { .status($0.status) },
            MetalTableColumn("Owner", kind: .person, priority: 2) { .people([$0.owner]) },
            MetalTableColumn("Due", kind: .date, priority: 2, sortable: true) { .date($0.due) },
            MetalTableColumn("Amount", kind: .currency, format: .init(currency: "EUR"), sortable: true) { .number($0.amount) },
            MetalTableColumn("Change", kind: .delta, format: .init(unit: "%", betterDown: true)) { .number($0.change) },
        ]
    }

    func testTable() {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: MetalSpace.s32) {
                MetalTable(Self.invoices, columns: columns, caption: "Invoices", selection: .constant(["INV-2042"]),
                           sort: MetalTableSort("Due"), opened: "INV-2041", filter: (total: 36, onClear: {}), now: Self.now)
                MetalTable([Invoice](), columns: columns, caption: "Archived", density: .compact, empty: "No invoices yet.", now: Self.now)
            }
            .frame(width: 720)
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("table-\(colorway.rawValue)", view)
        }
    }

    func testProperties() {
        for colorway in MetalColorway.allCases {
            let i = Self.invoices[2]
            let view = MetalProperties([
                MetalProperty("Invoice") { MetalTableCell(.code, .code(i.id)) },
                MetalProperty("Status") { MetalTableCell(.status, .status(i.status), format: .init(words: Self.words)) },
                MetalProperty("Owner") { MetalTableCell(.person, .people([i.owner])) },
                MetalProperty("Due") { MetalTableCell(.date, .date(i.due), format: .init(date: .datetime), now: Self.now) },
                MetalProperty("Amount (€)") { MetalTableCell(.currency, .number(i.amount)) },
                MetalProperty("Notes", text: nil),
            ])
            .frame(width: 360)
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("properties-\(colorway.rawValue)", view)
        }
    }
}
