import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

@MainActor
final class MetalFanCaptures: XCTestCase {
    private enum Tool: Hashable { case select, write, region, pen, pencil, marker, line, arrow, rectangle, ellipse, eraser }
    // A row per kind: place; freehand (and the eraser that undoes it); shapes.
    private let tools: [MetalFanOption<Tool>] = [
        .init(.select, "Select", icon: .select, shortcut: "V", group: "place"),
        .init(.write, "Write", icon: .text, shortcut: "T", group: "place"),
        .init(.region, "Region", icon: .region, group: "place"),
        .init(.pen, "Pen", icon: .pen, shortcut: "P", group: "freehand"),
        .init(.pencil, "Pencil", icon: .draw, shortcut: "N", group: "freehand"),
        .init(.marker, "Marker", icon: .marker, shortcut: "M", group: "freehand"),
        .init(.eraser, "Eraser", icon: .eraser, shortcut: "E", group: "freehand"),
        .init(.line, "Line", icon: .line, shortcut: "L", group: "shapes"),
        .init(.arrow, "Arrow", icon: .arrow, shortcut: "A", group: "shapes"),
        .init(.rectangle, "Rectangle", icon: .rectangle, shortcut: "R", group: "shapes"),
        .init(.ellipse, "Ellipse", icon: .ellipse, shortcut: "O", group: "shapes"),
    ]

    func testCanvasFanSpecimens() throws {
        let directory = try XCTUnwrap(ProcessInfo.processInfo.environment["METALUI_CAPTURES"])
        for colorway in MetalColorway.allCases {
            for scene in ["rest", "picker", "picker-reduced", "ink", "text"] {
                let reduced = scene == "picker-reduced"
                let drawing = scene == "ink"
                let text = scene == "text"
                let view = VStack {
                    Spacer(minLength: 0)
                    MetalFan("Canvas tools", initialOpen: scene.hasPrefix("picker") ? .picker : scene == "rest" ? nil : .tray,
                             reduceMotion: reduced) {
                        if drawing { MetalFanLabel("Ink", icon: .palette) } else { MetalFanLabel(text ? "Text" : "Canvas") }
                        MetalFanPicker("Tool", value: .constant(drawing ? .pen : .select), options: tools)
                        if drawing {
                            MetalFanTray("Ink and width", icon: { MetalInkStroke(ink: .red, width: .regular) }) {
                                MetalInkPicks(value: .constant(.red))
                                MetalToolbarSeparator()
                                MetalWidthPicks(value: .constant(.regular), ink: .red)
                            }
                        } else {
                            MetalFanTray(text ? "Text actions" : "Canvas options", icon: { MetalIcon(.more, size: MetalRecipes.iconButton.points("tool.glyph")) }) {
                                if text {
                                    MetalIconButton("Tasks", icon: .task, variant: .tool) {}
                                    MetalIconButton("Summarise", icon: .document, variant: .tool) {}
                                    MetalIconButton("Gather", icon: .group, variant: .tool) {}
                                    MetalIconButton("Region", icon: .region, variant: .tool) {}
                                    MetalIconButton("Export", icon: .download, variant: .tool) {}
                                    MetalIconButton("Send away", icon: .sendAway, variant: .tool) {}
                                } else { MetalButton("Image", size: .compact) {}; MetalButton("Me", size: .compact) {} }
                            }
                        }
                        MetalIconButton("Search · ⌘K", icon: .search, variant: .tool) {}
                    }
                    Spacer().frame(height: 32)
                }
                .frame(width: 680, height: 520)
                .background((colorway == .bone ? MetalShared.page : MetalShared.pageDark).color)
                .metalColorway(colorway)
                let renderer = ImageRenderer(content: view)
                renderer.scale = 2
                let image = try XCTUnwrap(renderer.cgImage)
                let url = URL(fileURLWithPath: directory).appendingPathComponent("fan-\(scene)-\(colorway.rawValue).png")
                try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
                try XCTUnwrap(NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:])).write(to: url)
            }
        }
    }
}
