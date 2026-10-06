import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI filters beside the web playground on metalui.dev (docs/captures/swift/filters-*.png): the invoice row
/// with a select, a number, a date range and a boolean, and Clear; and the sentence `describe` reads from it.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalFiltersCaptures
@MainActor
final class MetalFiltersCaptures: XCTestCase {
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

    private let fields = [
        MetalFilterField("status", label: "Status", type: .select, icon: .info,
                         options: [MetalFilterOption("live", label: "Paid"), MetalFilterOption("waiting", label: "Due"), MetalFilterOption("failed", label: "Overdue")]),
        MetalFilterField("amount", label: "Amount", type: .number, icon: .coin, unit: "€"),
        MetalFilterField("due", label: "Due", type: .date, icon: .calendar),
        MetalFilterField("reminded", label: "Reminded", type: .boolean, icon: .check),
    ]

    func testFilters() throws {
        let day = { (d: Int) in Calendar.current.date(from: DateComponents(year: 2026, month: 10, day: d))! }
        let conditions = [
            MetalFilterCondition(id: "s", field: "status", op: .is, options: ["waiting", "failed"]),
            MetalFilterCondition(id: "a", field: "amount", op: .gt, number: 1000),
            MetalFilterCondition(id: "d", field: "due", op: .between, day: day(1), lastDay: day(14)),
            MetalFilterCondition(id: "r", field: "reminded", op: .is, flag: false),
        ]
        // The rules both platforms share: "and", a select's words follow its count, dates as days.
        let rows: [[String: Any]] = [
            ["status": "waiting", "amount": 1200.0, "due": day(3), "reminded": false],
            ["status": "live", "amount": 1500.0, "due": day(3), "reminded": false],
            ["status": "failed", "amount": 900.0, "due": day(3), "reminded": false],
            ["status": "failed", "amount": 2000.0, "due": day(20), "reminded": false],
        ]
        XCTAssertEqual(MetalFilters.apply(conditions, to: rows, fields: fields) { $0[$1] }.count, 1)
        XCTAssertTrue(MetalFilters.describe(conditions, fields: fields).hasPrefix("Status is any of Due, Overdue and Amount more than 1,000 €"))
        for colorway in MetalColorway.allCases {
            let view = MetalFilters("Invoice filters", fields: fields, conditions: .constant(conditions))
                .frame(width: 560, alignment: .leading)
            try write("filters", colorway, view)
        }
    }
}
