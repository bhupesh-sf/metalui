import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI time picker beside the web playground on metalui.dev (docs/captures/swift/time-picker-*.png): the
/// field with a typed time read back, and the slot plate (opening hours, a booked lunch, 09:30 chosen) drawn in place
/// (its grid without the scroll view, which an ImageRenderer can't draw).
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalTimePickerCaptures
@MainActor
final class MetalTimePickerCaptures: XCTestCase {
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

    func testTimePicker() throws {
        let math = MetalTimeMath(granularity: .minute, min: "09:00", max: "17:30")
        let show = { (n: Int?) in n.map { String(format: "%02d:%02d", $0 / 3600, $0 / 60 % 60) } ?? "" }
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Start").font(.metal(MetalType.ui))
                    MetalField("Start", text: .constant("230p"), size: .regular, suffix: "WEST", clear: true) {
                        MetalFieldKey("Choose a time", icon: .clock) {}
                    }
                    .snapshot(focused: true)
                    Text("2:30 in the afternoon").font(.metal(MetalType.readout))
                }
                .frame(width: 240, alignment: .leading)
                MetalTimeSlots(label: "Start", slots: math.slots(step: 30, from: nil), chosen: 9 * 3600 + 1800, near: 10 * 3600, from: nil,
                               show: show, iso: math.iso, isUnavailable: { $0 >= "12:00" && $0 < "13:00" }, choose: { _ in }, scrolls: false)
                    .fixedSize()
            }
            try write("time-picker", colorway, view)
        }
    }
}
