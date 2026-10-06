import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The Tree page's SwiftUI twin: a project's files with a selected row, the opened rail, a disabled row,
/// an empty folder and a level that failed to load; and a compact team with several selected.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalTreeCaptures
@MainActor
final class MetalTreeCaptures: XCTestCase {
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

    private static let project: [MetalTreeItem] = [
        MetalTreeItem("brief", "Brief", children: [
            MetalTreeItem("goals", "Goals.md", icon: .document),
            MetalTreeItem("budget", "Budget.xlsx", icon: .document, disabled: true, trail: "Locked"),
        ]),
        MetalTreeItem("design", "Design", children: [
            MetalTreeItem("screens", "Screens", children: [
                MetalTreeItem("home", "Home.fig", icon: .image),
                MetalTreeItem("search", "Search.fig", icon: .image),
            ]),
            MetalTreeItem("tokens", "Tokens.json", icon: .document),
            MetalTreeItem("archive", "Archive", children: []),
        ]),
        MetalTreeItem("photos", "Photos", hasChildren: true, trail: "3"),
        MetalTreeItem("notes", "Notes.md", icon: .document),
    ]

    private static let team: [MetalTreeItem] = [
        MetalTreeItem("eng", "Engineering", icon: .settings, children: [
            MetalTreeItem("ana", "Ana Duarte", icon: .person),
            MetalTreeItem("kenji", "Kenji Mori", icon: .person),
            MetalTreeItem("lea", "Lea Brandt", icon: .person),
        ]),
    ]

    func testTree() {
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: MetalSpace.s32) {
                MetalTree("Project files", items: Self.project, selection: .constant(["tokens"]),
                          expanded: .constant(["brief", "design", "screens", "archive"]), opened: "goals")
                    .frame(width: 300)
                MetalTree("Team", items: Self.team, size: .compact, selectionMode: .multiple,
                          selection: .constant(["ana", "kenji"]), expanded: .constant(["eng"]))
                    .frame(width: 260)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("tree-\(colorway.rawValue)", view)
        }
    }
}
