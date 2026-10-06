import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI calendar beside the web playground on metalui.dev (docs/captures/swift/calendar-*.png): a chosen
/// day with marks; a range stretched across two months; quarters chosen as a range; week numbers from Sunday.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCalendarCaptures
@MainActor
final class MetalCalendarCaptures: XCTestCase {
    private func write<V: View>(_ name: String, _ colorway: MetalColorway, _ view: V) throws {
        let framed = view
            .padding(28)
            .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
            .metalColorway(colorway)
            .environment(\.locale, Locale(identifier: "en_GB"))
        let renderer = ImageRenderer(content: framed)
        renderer.scale = 2
        let image = try XCTUnwrap(renderer.cgImage)
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name)-\(colorway.rawValue).png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
    }

    private func day(_ y: Int, _ m: Int, _ d: Int) -> Date {
        Calendar(identifier: .gregorian).date(from: DateComponents(year: y, month: m, day: d))!
    }

    func testCalendar() throws {
        let sep = day(2026, 9, 1)
        let marks: (Date) -> MetalDayMark? = { d in
            let c = Calendar(identifier: .gregorian).dateComponents([.month, .day], from: d)
            guard c.month == 9 else { return nil }
            return switch c.day ?? 0 {
            case 8: MetalDayMark("Review")
            case 14: MetalDayMark("Invoice due", tone: .amber)
            case 21: MetalDayMark("Backup failed", tone: .red)
            default: nil
            }
        }
        let range = MetalDateRange(start: day(2026, 10, 5), end: day(2026, 10, 12))
        let quarters = MetalDateRange(start: day(2026, 4, 1), end: day(2026, 9, 30))
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 28) {
                HStack(alignment: .top, spacing: 40) {
                    MetalCalendar("Trip day", selection: .constant(Date?.some(day(2026, 9, 15))), month: .constant(sep), marks: marks)
                    MetalCalendar("Stay", selection: .constant(Optional(range)), months: 2, month: .constant(sep))
                }
                HStack(alignment: .top, spacing: 40) {
                    MetalCalendar("Reporting period", selection: .constant(Optional(quarters)), period: .quarter, month: .constant(sep))
                    MetalCalendar("Sprint day", selection: .constant(Date?.none), weekStartsOn: 0, weekNumbers: true, month: .constant(sep))
                    MetalCalendar("Shoot days", selection: .constant(Set([day(2026, 9, 3), day(2026, 9, 17)])), month: .constant(sep))
                }
            }
            try write("calendar", colorway, view)
        }
    }
}
