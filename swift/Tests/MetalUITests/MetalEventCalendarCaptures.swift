import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Event calendar page's SwiftUI twin: a studio's week by hours and its month.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalEventCalendarCaptures
@MainActor
final class MetalEventCalendarCaptures: XCTestCase {
    // ImageRenderer draws a ScrollView empty: host it in a window and cache its display instead.
    private func write<V: View>(_ name: String, _ view: V) throws {
        let host = NSHostingView(rootView: view)
        host.frame = NSRect(origin: .zero, size: host.fittingSize)
        let window = NSWindow(contentRect: host.frame, styleMask: .borderless, backing: .buffered, defer: false)
        window.contentView = host
        host.layoutSubtreeIfNeeded()
        RunLoop.main.run(until: Date().addingTimeInterval(0.3))
        let rep = try XCTUnwrap(host.bitmapImageRepForCachingDisplay(in: host.bounds))
        host.cacheDisplay(in: host.bounds, to: rep)
        let image = try XCTUnwrap(rep.cgImage)
        guard let dir = ProcessInfo.processInfo.environment["METALUI_CAPTURES"] else { return }
        let url = URL(fileURLWithPath: dir).appendingPathComponent("\(name).png")
        try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
    }

    func testEventCalendar() throws {
        var cal = Calendar(identifier: .gregorian)
        cal.firstWeekday = 2
        let monday = cal.date(from: DateComponents(year: 2026, month: 10, day: 5))!
        let at = { (day: Int, h: Int, m: Int) in cal.date(byAdding: .minute, value: (day * 24 + h) * 60 + m, to: monday)! }
        let studio = MetalRGBA(138, 127, 181, 1.0), client = MetalRGBA(192, 138, 100, 1.0), away = MetalRGBA(111, 158, 154, 1.0)
        let events = [
            MetalCalendarEvent(id: "standup", title: "Stand-up", start: at(0, 9, 30), end: at(0, 9, 45), color: studio),
            MetalCalendarEvent(id: "install", title: "Window install", start: at(0, 15, 0), end: at(0, 17, 0), color: client),
            MetalCalendarEvent(id: "review", title: "Design review", start: at(1, 10, 0), end: at(1, 11, 0), color: studio),
            MetalCalendarEvent(id: "proofs", title: "Print proofs", start: at(1, 10, 30), end: at(1, 12, 0), color: client),
            MetalCalendarEvent(id: "lunch", title: "Lunch with Ana", start: at(2, 12, 30), end: at(2, 13, 30)),
            MetalCalendarEvent(id: "fair", title: "Book fair", start: at(2, 0, 0), end: at(4, 0, 0), allDay: true, color: away),
            MetalCalendarEvent(id: "press", title: "Press run: catalogue", start: at(3, 13, 0), end: at(3, 16, 0), color: client, disabled: true),
            MetalCalendarEvent(id: "call", title: "Call with Rita", start: at(3, 9, 0), end: at(3, 9, 30)),
            MetalCalendarEvent(id: "train", title: "Night train to Porto", start: at(5, 22, 0), end: at(6, 7, 0), color: away),
        ]
        for colorway in MetalColorway.allCases {
            for view in [MetalEventCalendarView.month, .week] {
                let shown = MetalEventCalendar(events: .constant(events), view: .constant(view), date: .constant(at(1, 0, 0)),
                                               dayStart: 8, dayEnd: 18, now: at(1, 11, 20))
                    .frame(width: 960, height: view == .month ? 860 : 640)
                    .padding(32)
                    .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                    .environment(\.calendar, cal)
                    .environment(\.locale, Locale(identifier: "en_GB"))
                    .metalColorway(colorway)
                try write("event-calendar-\(view.rawValue)-\(colorway.rawValue)", shown)
            }
        }
    }
}
