import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// The SwiftUI code block beside the web playground on metalui.dev (docs/captures/swift/code-block-*.png): a file
/// with lines 4–7 picked, a patch with two gutters, and a snippet with an error and its fix.
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCodeBlockCaptures
@MainActor
final class MetalCodeBlockCaptures: XCTestCase {
    private let poster = """
    import { print } from './press';

    export interface Poster {
      size: 'A2' | 'A3';
      stock: "matte" | "gloss"; // not both
      weight: number;
    }
    """

    private let patch = """
    @@ -9,5 +9,4 @@ export interface Poster {
     export async function run(poster: Poster) {
    -  const copies = 120;
    +  const copies = poster.size === 'A2' ? 80 : 120;
       await print(poster, { copies });
     }
    """

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

    func testCodeBlock() throws {
        let (lines, isPatch) = MetalCodeLine.lines(patch, lang: "diff", diff: nil, start: 1)
        XCTAssertTrue(isPatch)
        XCTAssertEqual(lines[2].old, 10)
        XCTAssertNil(lines[2].next)
        XCTAssertEqual(lines[3].next, 10)
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 20) {
                MetalCodeBlock(poster, lang: "ts", label: "poster.ts", selection: .constant(4...7), onReference: { _ in })
                MetalCodeBlock(patch, lang: "diff", label: "poster.ts", numbers: true)
                MetalCodeBlock("const poster: Poster = {\n  size: 'A1',\n  weight: 170,\n};", lang: "ts", look: .ghost, numbers: true, diagnostics: [
                    MetalCodeDiagnostic(line: 2, severity: .error, message: "'A1' is not a size.", action: "Fix with AI") {},
                    MetalCodeDiagnostic(line: 3, severity: .warning, message: "weight is unused."),
                ])
            }
            .frame(width: 520, alignment: .leading)
            try write("code-block", colorway, view)
        }
    }
}
