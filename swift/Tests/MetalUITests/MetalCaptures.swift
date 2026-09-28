import AppKit
import SwiftUI
import XCTest
@testable import MetalUI

/// SwiftUI captures that sit beside the web specimens on metalui.dev (PLAN parity gate b).
/// Each renders through `ImageRenderer`; set `METALUI_CAPTURES` to a directory to write PNGs:
///
///     METALUI_CAPTURES=docs/captures/swift swift test --filter MetalCaptures
@MainActor
final class MetalCaptures: XCTestCase {
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

    /// A busy backdrop for frost to melt: the same stripes and orange block the docs page uses.
    private struct BusyBackdrop: View {
        var body: some View {
            ZStack(alignment: .topLeading) {
                HStack(spacing: 0) {
                    ForEach(0..<18, id: \.self) { i in
                        Rectangle().fill(i.isMultiple(of: 2) ? Color(white: 0.12) : Color(white: 0.92)).frame(width: 14)
                    }
                }
                RoundedRectangle(cornerRadius: 18).fill(LinearGradient(colors: [Color(red: 1, green: 0.48, blue: 0.3), Color(red: 0.91, green: 0.33, blue: 0.16)], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 96, height: 72).offset(x: 150, y: 20)
                Text("Frost melts what is behind").font(.metal(MetalType.title)).foregroundStyle(.black).offset(x: 12, y: 100)
            }
            .frame(width: 252, height: 140, alignment: .topLeading)
            .clipped()
        }
    }

    private func frostBench(_ colorway: MetalColorway) -> some View {
        HStack(spacing: 24) {
            ForEach(MetalFrost.allCases, id: \.self) { frost in
                VStack(spacing: 10) {
                    ZStack {
                        BusyBackdrop()
                        Text(frost.rawValue.uppercased())
                            .font(.metal(MetalType.label))
                            .tracking(MetalType.label.trackingPoints)
                            .foregroundStyle(frost == .graphite ? MetalTokens.graphite.ink2.color : colorway.tokens.ink2.color)
                            .frame(width: 180, height: 56)
                            .metalFrost(frost, in: RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous))
                    }
                }
            }
        }
        .padding(32)
        .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
        .metalColorway(colorway)
    }

    /// Foundations › Materials › Gadget materials: seven materials at weights .1, .5 and .9.
    private func gadgetMaterialSheet(_ colorway: MetalColorway) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            ForEach(MetalSoundMaterial.allCases, id: \.self) { material in
                HStack(spacing: 16) {
                    Text(material.rawValue.capitalized)
                        .font(.metal(MetalType.title))
                        .foregroundStyle(colorway.tokens.ink.color)
                        .frame(width: 120, alignment: .leading)
                    HStack(spacing: 8) {
                        ForEach([0.1, 0.5, 0.9], id: \.self) { weight in
                            MetalMaterialSpecimen(material, weight: weight, size: 132)
                        }
                    }
                }
            }
        }
        .padding(32)
        .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
        .metalColorway(colorway)
    }

    /// Foundations › Gadgets › The worked set: the eleven placements, resolved by MetalGadgetModel.
    func testGadgetWorkedSet() {
        let set: [(String, MetalGadgetPlacement)] = [
            ("Settings", .init(job: .tune, feel: .init(v: 0.6, a: 0.5, w: 0.3))),
            ("Shortcuts", .init(job: .command, feel: .init(v: 0.8, a: 0.8, w: 0.1))),
            ("Sync", .init(job: .link, feel: .init(v: 0.7, a: 0.8, w: 0.4), station: 195, material: .stone)),
            ("Storage", .init(job: .keep, feel: .init(v: 0.6, a: 0.2, w: 0.4), station: 140)),
            ("Account", .init(job: .identify, feel: .init(v: 0.6, a: 0.2, w: 0.9))),
            ("Trash", .init(job: .destroy, feel: .init(v: 0.3, a: 0.4, w: 0.9))),
            ("Capture", .init(job: .take, feel: .init(v: 0.8, a: 0.9, w: 0.2))),
            ("Search", .init(job: .find, feel: .init(v: 0.7, a: 0.8, w: 0.1))),
            ("Share", .init(job: .link, feel: .init(v: 0.8, a: 0.7, w: 0.6), station: 230)),
            ("Memory", .init(job: .keep, feel: .init(v: 0.7, a: 0.3, w: 0.3), station: 300, material: .resin)),
            ("Draw", .init(job: .make, feel: .init(v: 0.9, a: 0.9, w: 0.1), material: .ceramic)),
        ]
        for colorway in MetalColorway.allCases {
            let view = LazyVGrid(columns: Array(repeating: GridItem(.fixed(112), spacing: 12), count: 6), spacing: 12) {
                ForEach(set, id: \.0) { name, placement in
                    let r = MetalGadgetModel.resolve(placement)
                    VStack(spacing: 4) {
                        MetalMaterialSpecimen(r.material, lightness: r.body.L, chroma: r.body.C, hue: r.body.H, size: 104)
                        Text(name).font(.metal(MetalType.ui)).foregroundStyle(colorway.tokens.ink.color)
                        Text("\(r.job.rawValue) · \(r.material.rawValue)").font(.metal(MetalType.readout)).foregroundStyle(colorway.tokens.ink3.color)
                    }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("gadgets-worked-set-\(colorway.rawValue)", view)
        }
    }

    /// Parts › LED: every kind at each gesture, caught at a moment that shows the gesture's shape.
    func testLedGestures() {
        let kinds: [MetalLEDKind] = [.live, .waiting, .failed, .link, .off]
        let moments: [(MetalLampGesture, Double)] = [(.steady, 1), (.flicker, 0.22), (.breathe, 0), (.blink2, 0.3), (.rise, 0.25)]
        for colorway in MetalColorway.allCases {
            let view = Grid(horizontalSpacing: 28, verticalSpacing: 16) {
                GridRow {
                    Text("")
                    ForEach(moments, id: \.0) { g, _ in Text(g.rawValue.uppercased()).font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.engrave.color) }
                }
                ForEach(kinds, id: \.recipeState) { kind in
                    GridRow {
                        Text(kind.recipeState.uppercased()).font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.engrave.color)
                        ForEach(moments, id: \.0) { g, p in MetalLED(kind, diameter: 10, gesture: g, phase: p) }
                    }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("led-gestures-\(colorway.rawValue)", view)
        }
    }

    /// Parts › Dot display: each px colour as a 3 × 3 block with its unlit ring, in a field well.
    func testDotDisplay() {
        let block: [UInt8] = (0..<25).map { i in i % 5 > 0 && i % 5 < 4 && i > 4 && i < 20 ? 1 : 0 }
        let colours = MetalDotColour.allCases.filter { $0 != .off }
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 16) {
                ForEach(colours, id: \.self) { c in
                    VStack(spacing: 6) {
                        MetalWell(.field, radius: 12) {
                            MetalDotDisplay(cols: 5, rows: 5, dots: block, inks: [MetalDotInk(.off), MetalDotInk(c)])
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        Text(c.rawValue.uppercased()).font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.engrave.color)
                    }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("dot-display-\(colorway.rawValue)", view)
        }
    }

    /// Parts › Slab: every cut kind on the slab materials, the way the docs sheet shows them.
    func testSlab() {
        let cuts: [(String, [MetalSlabCut])] = [
            ("slots", [72, 124, 176].map { MetalSlabCut(.slot, at: ($0 * 1.0 + 56, 200), size: (18, 212)) }),
            ("holes", [MetalSlabCut(.hole, at: (140, 150), size: (40, 40)), MetalSlabCut(.hole, at: (260, 150), size: (40, 40)), MetalSlabCut(.hole, at: (200, 262), size: (26, 26))]),
            ("tray", [MetalSlabCut(.tray, at: (200, 218), size: (268, 164))]),
            ("well", [MetalSlabCut(.well, at: (200, 200), size: (220, 220))]),
        ]
        let materials: [MetalSoundMaterial] = [.clay, .stone, .ceramic, .rubber, .metal, .resin]
        for colorway in MetalColorway.allCases {
            let view = Grid(horizontalSpacing: 14, verticalSpacing: 14) {
                ForEach(materials, id: \.self) { m in
                    GridRow { ForEach(cuts, id: \.0) { _, c in MetalSlab(m, cuts: c, size: 120) } }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("slab-\(colorway.rawValue)", view)
        }
    }

    /// Parts › Jack: dark and lit.
    func testJack() {
        let lits: [MetalJack.Lit?] = [nil, .live, .link, .waiting, .failed]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) { ForEach(0..<lits.count, id: \.self) { i in MetalJack(lit: lits[i], size: 112) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("jack-\(colorway.rawValue)", view)
        }
    }

    func testPlug() {
        let stubs: [MetalPlug.Stub] = [.none, .up, .left, .right]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) { ForEach(0..<stubs.count, id: \.self) { i in MetalPlug(accent: i % 2 == 1, stub: stubs[i], size: 112) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("plug-\(colorway.rawValue)", view)
        }
    }

    func testCable() {
        let ends: [(Double, Double)] = [(60, 340), (90, 310), (150, 250)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                ForEach(0..<ends.count, id: \.self) { i in
                    MetalCable(from: CGPoint(x: ends[i].0, y: 150), to: CGPoint(x: ends[i].1, y: 150), length: 280, size: 180)
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("cable-\(colorway.rawValue)", view)
        }
    }

    func testBeeper() {
        let looks: [(Int, MetalSoundMaterial)] = [(3, .metal), (5, .metal), (7, .metal), (5, .clay)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) { ForEach(0..<looks.count, id: \.self) { i in MetalBeeper(slots: looks[i].0, material: looks[i].1, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("beeper-\(colorway.rawValue)", view)
        }
    }

    func testGadgetPatchBay() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/patch-bay.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        let states = ["rest", "connected", "syncing", "done", "failed"]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(states, id: \.self) { s in MetalGadget(spec: spec, state: s, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-patch-bay-\(colorway.rawValue)", view)
        }
    }

    func testCap() {
        let looks: [MetalCap] = [MetalCap(size: 120), MetalCap(material: .ceramic, size: 120), MetalCap(accent: true, size: 120),
                                 MetalCap(ribs: 5, size: 120), MetalCap(shape: .knob, material: .ceramic, size: 120), MetalCap(shape: .knob, accent: true, size: 120),
                                 MetalCap(shape: .rocker, accent: true, tilt: -1, size: 120), MetalCap(shape: .rocker, accent: true, tilt: 1, size: 120)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) { ForEach(0..<looks.count, id: \.self) { i in looks[i] } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("cap-\(colorway.rawValue)", view)
        }
    }

    func testGadgetFaderBank() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/fader-bank.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) {
                MetalGadget(spec: spec, state: "rest", size: 128)
                MetalGadget(spec: spec, state: "on", size: 128)
                MetalGadget(spec: spec, state: "changed", size: 128)
                MetalGadget(spec: spec, state: "on", value: 1, size: 128)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("gadget-fader-bank-\(colorway.rawValue)", view)
        }
    }

    func testKey() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalKey(glyph: "⌘", size: 128); MetalKey(glyph: "K", accent: true, size: 128)
                MetalKey(glyph: "⇧", material: .ceramic, size: 128); MetalKey(glyph: "↩", size: 128)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("key-\(colorway.rawValue)", view)
        }
    }

    func testGadgetKeycapChord() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/keycap-chord.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(["rest", "ready", "chord"], id: \.self) { s in MetalGadget(spec: spec, state: s, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-keycap-chord-\(colorway.rawValue)", view)
        }
    }

    func testBezel() {
        let search = MetalGadgetModel.resolve(MetalGadgetPlacement(job: .find, feel: MetalGadgetFeel(v: 0.7, a: 0.8, w: 0.1)))
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalBezel(.stone, color: search.body, glass: search.face, size: 180)
                MetalBezel(.metal, size: 180)
                MetalBezel(.clay, opening: .square, rings: false, size: 180)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("bezel-\(colorway.rawValue)", view)
        }
    }

    func testBacklight() {
        let search = MetalGadgetModel.resolve(MetalGadgetPlacement(job: .find, feel: MetalGadgetFeel(v: 0.7, a: 0.8, w: 0.1)))
        let blips = [CGPoint(x: 148, y: 150), CGPoint(x: 262, y: 228), CGPoint(x: 182, y: 272)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalBezel(.stone, color: search.body, glass: search.face, size: 180) { MetalBacklight(.glow, color: .signal("live"), size: 180) }
                MetalBezel(.stone, color: search.body, glass: search.face, size: 180) { MetalBacklight(.beam, color: .glass(search.face), heading: 40, size: 180) }
                MetalBezel(.stone, color: search.body, glass: search.face, size: 180) {
                    ForEach(0..<blips.count, id: \.self) { i in MetalBacklight(.dot, color: .glass(search.face), at: blips[i], size: 180) }
                }
                MetalBezel(.metal, size: 180) { MetalBacklight(.glow, color: .accent, size: 180) }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("backlight-\(colorway.rawValue)", view)
        }
    }

    func testGadgetScope() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/scope.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(["rest", "found", "nothing"], id: \.self) { s in MetalGadget(spec: spec, state: s, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-scope-\(colorway.rawValue)", view)
        }
    }

    func testDrum() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalDrum(value: 0, size: 120); MetalDrum(value: 7, size: 120); MetalDrum(value: 9.5, size: 120)
                MetalDrum(value: 3, accent: true, size: 120); MetalDrum(value: 4, face: .clay, size: 120)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("drum-\(colorway.rawValue)", view)
        }
    }

    func testGadgetCounterDrum() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/counter-drum.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual(spec.description("counting", value: 12), "Streak: 12 days")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(["rest", "counting", "rolled-over"], id: \.self) { s in MetalGadget(spec: spec, state: s, value: 12, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-counter-drum-\(colorway.rawValue)", view)
        }
    }

    func testNeedle() {
        let today = MetalGadgetModel.resolve(MetalGadgetPlacement(job: .signal, feel: MetalGadgetFeel(v: 0.6, a: 0.5, w: 0.45), material: .metal))
        let looks: [(Double, Double, Int, Double?)] = [(0.2, 120, 9, 0.75), (0.5, 120, 9, 0.75), (0.9, 120, 9, 0.75), (0.35, 150, 13, nil)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                ForEach(0..<looks.count, id: \.self) { i in
                    MetalBezel(.metal, color: today.body, glass: today.face, rings: false, size: 180) {
                        MetalNeedle(value: looks[i].0, arc: looks[i].1, ticks: looks[i].2, threshold: looks[i].3, color: today.accent, glass: today.face, size: 180)
                    }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("needle-\(colorway.rawValue)", view)
        }
    }

    func testGadgetNeedleGauge() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/needle-gauge.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual(spec.derivedState("rest", value: 24), "rest")
        XCTAssertEqual(spec.derivedState("rest", value: 34), "over")
        XCTAssertEqual(spec.description("rest", value: 24), "Today: 24 of 40 min")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach([8.0, 24, 34, 40], id: \.self) { v in MetalGadget(spec: spec, value: v, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-needle-gauge-\(colorway.rawValue)", view)
        }
    }

    func testGadgetCellGrid() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/cell-grid.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual([0, 0.4, 1].map { spec.derivedState("filling", value: $0) }, ["rest", "filling", "full"])
        XCTAssertEqual(spec.derivedState("first-run", value: 0), "first-run")
        XCTAssertEqual(spec.driveTargets(0.4, state: "first-run"), [1])
        XCTAssertEqual(spec.description("filling", value: 0.4), "Memory: 40% kept")
        let looks: [(Double, String?)] = [(0, nil), (0.4, nil), (0.75, nil), (1, nil), (0, "first-run")]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(0..<looks.count, id: \.self) { i in MetalGadget(spec: spec, state: looks[i].1, value: looks[i].0, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-cell-grid-\(colorway.rawValue)", view)
        }
    }

    func testGadgetLiddedBin() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/lidded-bin.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual(spec.driveDefault, 0)
        XCTAssertEqual([0.0, 1].map { spec.derivedState("rest", value: $0) }, ["rest", "armed"])
        XCTAssertEqual(spec.derivedState("emptied", value: 1), "emptied")
        XCTAssertEqual(spec.driveTargets(1, state: "armed")[0], 18.0 / 70, accuracy: 1e-9)
        XCTAssertEqual(spec.description("armed", value: 1), "Trash: armed, ready to empty")
        let looks: [(Double, String?)] = [(0, nil), (1, nil), (0, "emptied")]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(0..<looks.count, id: \.self) { i in MetalGadget(spec: spec, state: looks[i].1, value: looks[i].0, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-lidded-bin-\(colorway.rawValue)", view)
        }
    }

    func testGadgetDrawer() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/drawer.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual([0.4, 1].map { spec.derivedState("rest", value: $0) }, ["rest", "full"])
        XCTAssertEqual(spec.derivedState("open", value: 1), "open")
        XCTAssertEqual(spec.description("full", value: 1), "Storage: 100% full, too full to close")
        let looks: [(Double, String?)] = [(0.4, nil), (0.4, "open"), (1, nil)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(0..<looks.count, id: \.self) { i in MetalGadget(spec: spec, state: looks[i].1, value: looks[i].0, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-drawer-\(colorway.rawValue)", view)
        }
    }

    func testGadgetShutterLens() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/shutter-lens.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual(spec.driveTargets(0.5), [0.5])
        XCTAssertEqual(spec.description("taken"), "Capture: taken")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach([String?.none, "taken"], id: \.self) { s in MetalGadget(spec: spec, state: s, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-shutter-lens-\(colorway.rawValue)", view)
        }
    }

    func testGadgetRocker() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/rocker.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual([0.0, 1].map { spec.derivedState("rest", value: $0) }, ["rest", "on"])
        XCTAssertEqual(spec.driveTargets(1), [1])
        XCTAssertEqual(spec.description("on", value: 1), "Sound, on")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach([0.0, 1], id: \.self) { v in MetalGadget(spec: spec, value: v, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-rocker-\(colorway.rawValue)", view)
        }
    }

    func testGadgetThumbwheel() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/thumbwheel.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual(spec.mechanism.detents, 30)
        XCTAssertEqual([0.0, -3, -12].map { spec.derivedState("rest", value: $0) }, ["rest", "past", "far"])
        XCTAssertEqual(spec.driveTargets(-3), [0.9])
        XCTAssertEqual(spec.description("past", value: -3), "When, in the past")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach([0.0, -3, -12], id: \.self) { v in MetalGadget(spec: spec, value: v, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-thumbwheel-\(colorway.rawValue)", view)
        }
    }

    func testGadgetGlassBadge() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/glass-badge.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual([0.0, 1].map { spec.derivedState("rest", value: $0) }, ["rest", "signed-in"])
        XCTAssertEqual(spec.derivedState("expired", value: 1), "expired")
        XCTAssertEqual(spec.driveTargets(1), [1])
        XCTAssertEqual(spec.description("signed-in", value: 1), "Account, signed in")
        let looks: [(Double, String?)] = [(0, nil), (1, nil), (1, "expired")]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach(0..<looks.count, id: \.self) { i in MetalGadget(spec: spec, state: looks[i].1, value: looks[i].0, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-glass-badge-\(colorway.rawValue)", view)
        }
    }

    func testGadgetInkWell() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures/ink-well.gadget.json")
        let spec = try MetalGadgetSpec.decode(Data(contentsOf: url))
        XCTAssertEqual([0.0, 1].map { spec.derivedState("rest", value: $0) }, ["rest", "writing"])
        XCTAssertEqual(spec.description("writing", value: 1), "Draw, writing")
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 20) { ForEach([0.0, 1], id: \.self) { v in MetalGadget(spec: spec, value: v, size: 128) } }
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-ink-well-\(colorway.rawValue)", view)
        }
    }

    func testReadingRig() throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures")
        let catalog = try ["needle-gauge", "counter-drum"].reduce(into: [String: MetalGadgetSpec]()) { $0[$1] = try MetalGadgetSpec.decode(Data(contentsOf: dir.appendingPathComponent("\($1).gadget.json"))) }
        let spec = try MetalRigSpec.decode(Data(contentsOf: dir.appendingPathComponent("reading.rig.json")))
        for colorway in MetalColorway.allCases {
            let view = MetalRig(spec: spec, catalog: catalog, width: 560)
                .padding(32)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("gadget-reading-rig-\(colorway.rawValue)", view)
        }
    }

    func testRigs() throws {
        let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("packages/metalui/src/gadgets/fixtures")
        let names = try FileManager.default.contentsOfDirectory(atPath: dir.path).filter { $0.hasSuffix(".gadget.json") }
        let catalog = try names.reduce(into: [String: MetalGadgetSpec]()) { out, f in let g = try MetalGadgetSpec.decode(Data(contentsOf: dir.appendingPathComponent(f))); out[g.name] = g }
        for (name, id) in [("sync-health", "sync"), ("storage", "storage"), ("capture", "capture"), ("canvas-status", "canvas"), ("settings", "settings")] {
            let spec = try MetalRigSpec.decode(Data(contentsOf: dir.appendingPathComponent("\(name).rig.json")))
            for colorway in MetalColorway.allCases {
                let view = MetalRig(spec: spec, catalog: catalog, width: spec.grid[0] == 3 ? 720 : 520)
                    .padding(32)
                    .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                    .metalColorway(colorway)
                capture("rig-\(id)-\(colorway.rawValue)", view)
            }
        }
    }

    func testCell() {
        let looks: [(Int, Int, Double)] = [(4, 4, 0), (4, 4, 6.5), (4, 4, 16), (3, 2, 4)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                ForEach(0..<looks.count, id: \.self) { i in MetalCell(cols: looks[i].0, rows: looks[i].1, lit: looks[i].2, size: 180) }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("cell-\(colorway.rawValue)", view)
        }
    }

    func testLid() {
        let looks: [(Double, Bool, MetalLid.Hinge)] = [(0, false, .back), (18, false, .back), (70, false, .back), (18, true, .back), (40, true, .left)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                ForEach(0..<looks.count, id: \.self) { i in MetalLid(open: looks[i].0, armed: looks[i].1, hinge: looks[i].2, size: 160) }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("lid-\(colorway.rawValue)", view)
        }
    }

    func testPull() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalPull(style: .bar, size: 200)
                MetalPull(style: .recess, size: 200)
                MetalPull(style: .bar, front: MetalOklch(L: 0.62, C: 0.05, H: 140), size: 200)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("pull-\(colorway.rawValue)", view)
        }
    }

    func testLens() {
        let looks: [(Double, Double, Int)] = [(1, 0, 24), (0.6, 0, 24), (0.1, 0, 24), (0.6, 45, 12)]
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                ForEach(0..<looks.count, id: \.self) { i in MetalLens(iris: looks[i].0, turn: looks[i].1, ticks: looks[i].2, size: 180) }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("lens-\(colorway.rawValue)", view)
        }
    }

    func testNib() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalNib(size: 180)
                MetalNib(angle: -20, size: 180)
                MetalNib(angle: 20, ink: MetalOklch(L: 0.32, C: 0.08, H: 265), size: 180)
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("nib-\(colorway.rawValue)", view)
        }
    }

    func testGadgetMaterials() {
        for colorway in MetalColorway.allCases {
            capture("gadget-materials-\(colorway.rawValue)", gadgetMaterialSheet(colorway))
        }
    }

    func testFrost() {
        for colorway in MetalColorway.allCases {
            capture("frost-\(colorway.rawValue)", frostBench(colorway))
        }
    }

    private func iconSheet(_ colorway: MetalColorway) -> some View {
        let columns = Array(repeating: GridItem(.fixed(44), spacing: 8), count: 16)
        return VStack(alignment: .leading, spacing: 20) {
            Text("PRODUCT · \(MetalIconName.allCases.count) · 24 AND 16").font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.engrave.color)
            LazyVGrid(columns: columns, alignment: .leading, spacing: 10) {
                ForEach(MetalIconName.allCases, id: \.self) { icon in
                    VStack(spacing: 6) { MetalIcon(icon, size: 24); MetalIcon(icon, size: 16) }
                }
            }
            Text("LIFE · \(MetalLifeIconName.allCases.count) · 24 AND 16, TINTED WHERE THE MANIFEST SAYS").font(.metal(MetalType.label)).foregroundStyle(colorway.tokens.engrave.color)
            LazyVGrid(columns: columns, alignment: .leading, spacing: 10) {
                ForEach(MetalLifeIconName.allCases, id: \.self) { icon in
                    VStack(spacing: 6) { MetalLifeIcon(icon, size: 24); MetalLifeIcon(icon, size: 16) }
                }
            }
        }
        .foregroundStyle(colorway.tokens.icon.color)
        .padding(28)
        .frame(width: 16 * 52 + 56, alignment: .leading)
        .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
        .metalColorway(colorway)
    }

    func testIcons() {
        for colorway in MetalColorway.allCases {
            capture("icons-\(colorway.rawValue)", iconSheet(colorway))
        }
    }

    private func selectionSheet(_ colorway: MetalColorway) -> some View {
        let object = RoundedRectangle(cornerRadius: MetalRadius.plate, style: .continuous)
        return HStack(alignment: .top, spacing: 40) {
            Color.clear.frame(width: 150, height: 88).metalRecipe(MetalRecipe(fill: colorway.tokens.btnBg, shadows: colorway.tokens.raiseSm), in: object)
                .metalSelectionFrame(.selected, radius: MetalRadius.plate)
            Color.clear.frame(width: 150, height: 88).metalRecipe(MetalRecipe(fill: colorway.tokens.btnBg, shadows: colorway.tokens.raiseSm), in: object)
                .metalSelectionFrame(.selected, mode: .writing, radius: MetalRadius.plate, handles: .text)
            Color.clear.frame(width: 150, height: 88).metalRecipe(MetalRecipe(fill: colorway.tokens.btnBg, shadows: colorway.tokens.raiseSm), in: object)
                .metalSelectionFrame(.selected, variant: .lite, radius: MetalRadius.plate, readout: false)
            Color.clear.frame(width: 150, height: 88).metalRecipe(MetalRecipe(fill: colorway.tokens.btnBg, shadows: colorway.tokens.raiseSm), in: object)
                .metalSelectionFrame(.selected, variant: .lite, radius: MetalRadius.plate, count: 3)
        }
        .padding(.horizontal, 32)
        .padding(.top, 32)
        .padding(.bottom, 64)
        .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
        .metalColorway(colorway)
    }

    func testSelectionFrame() {
        for colorway in MetalColorway.allCases {
            capture("selection-frame-\(colorway.rawValue)", selectionSheet(colorway))
        }
    }

    /// A world-space alignment across three objects, at a non-unit canvas zoom.
    private func snapGuidesSheet(_ colorway: MetalColorway) -> some View {
        let scale: CGFloat = 1.25
        let guides = [
            MetalSnapGuide(axis: .horizontal, position: 40, start: 45, end: 320, kind: .edge),
            MetalSnapGuide(axis: .vertical, position: 100, start: 40, end: 210, kind: .center),
        ]
        let world = ZStack(alignment: .topLeading) {
            colorway.tokens.s.color
            RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous)
                .fill(colorway.tokens.sHi.color)
                .frame(width: 110, height: 78)
                .position(x: 100, y: 79)
            RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous)
                .fill(colorway.tokens.sHi.color)
                .frame(width: 110, height: 78)
                .position(x: 265, y: 79)
            RoundedRectangle(cornerRadius: MetalRadius.card, style: .continuous)
                .fill(colorway.tokens.sHi.color)
                .frame(width: 110, height: 60)
                .position(x: 100, y: 180)
            MetalSnapGuides(guides: guides, scale: scale)
        }
        .frame(width: 360, height: 230)
        .scaleEffect(scale, anchor: .topLeading)
        .frame(width: 450, height: 287.5, alignment: .topLeading)

        return world
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
    }

    func testSnapGuides() {
        for colorway in MetalColorway.allCases {
            capture("snap-guides-\(colorway.rawValue)", snapGuidesSheet(colorway))
        }
    }

    private func cueSheet(_ colorway: MetalColorway) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 24) {
                MetalDimple(isOn: .constant(false), label: "rest")
                MetalDimple(isOn: .constant(true), label: "checked")
                MetalDimple(isOn: .constant(false), doing: true, label: "doing")
                MetalDimple(isOn: .constant(false), ghost: true, label: "ghost")
                MetalCueUrgency()
            }
            (Text("Send ") + Text("tomorrow 4pm").metalCue(.date, colorway: colorway) + Text(", ") + Text("1h30").metalCue(.duration, colorway: colorway)
                + Text(" for ") + Text("$40").metalCue(.amount, colorway: colorway) + Text(", slept ") + Text("6h").metalCue(.measurement, colorway: colorway)
                + Text(" in ") + Text("#FF6B3D").metalCue(.hex, colorway: colorway, hex: MetalShared.orange))
                .font(.metal(MetalType.content))
                .foregroundColor(colorway.tokens.ink.color)
            HStack(spacing: 8) {
                MetalCueTag("#poster")
                MetalCueTag("#studio", derived: true)
                MetalCueURLPill(host: "figma.com") {}
                MetalCueInferred("fri")
                MetalCueLife(.coffee)
            }
        }
        .padding(28)
        .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
        .metalColorway(colorway)
    }

    func testCues() {
        for colorway in MetalColorway.allCases {
            capture("cue-\(colorway.rawValue)", cueSheet(colorway))
        }
    }

    func testSuggestionChip() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 24) {
                MetalSuggestionChip(label: "Task?", confidence: 0.72, onAccept: {}, onDismiss: {})
                MetalSuggestionChip(label: "Track as sleep?", confidence: 0.64, hostHovered: true, onAccept: {}, onDismiss: {})
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("suggestion-chip-\(colorway.rawValue)", view)
        }
    }

    func testHoverEngraving() {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 16) {
                MetalHoverEngraving(kind: "LOG", details: ["07:40", "SLEEP 6 H", "ALSO TIRED"], status: (.live, "RECOGNIZED ✓"))
                MetalHoverEngraving(kind: "TASK", details: ["TOMORROW 16:00"], tags: ["poster"], status: (.live, "RECOGNIZED ✓"))
                MetalHoverEngraving(kind: "LUNCH? 0.71", status: (.waiting, "RECOGNIZING…"))
                MetalHoverEngraving(kind: "NOT SENT", details: ["LOOKS LIKE A SECRET"], status: (.off, "KEPT ON THIS MAC"))
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("hover-engraving-\(colorway.rawValue)", view)
        }
    }

    func testProvenanceTooltip() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 16) {
                MetalProvenanceTooltip(source: "Rule", detail: ["Date parser"])
                MetalProvenanceTooltip(source: "Recognizer", detail: ["0.82"])
                MetalProvenanceTooltip(source: "You")
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("provenance-tooltip-\(colorway.rawValue)", view)
        }
    }

    func testRegion() {
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 20) {
                MetalRegionView(name: "friday", rule: "dates them friday", count: 2).frame(width: 200, height: 140)
                MetalRegionView(name: "Done", rule: "marks tasks done", dropRule: "drop to mark tasks done", state: .over).frame(width: 200, height: 140)
                MetalRegionView(name: "#poster", rule: "tags them #poster", state: .dim).frame(width: 200, height: 140)
                MetalRegionView(name: "Ideas", rule: "from amber folder", hue: .amber).frame(width: 200, height: 140)
                MetalRegionView(name: "open tasks", rule: "lens · live", lens: true) {
                    VStack(spacing: 2) {
                        MetalRegionRow("Send the poster", meta: "FRI") { MetalDimple(isOn: .constant(false), label: "Send the poster") }
                        MetalRegionRow("Call the printer", checked: true) { MetalDimple(isOn: .constant(true), label: "Call the printer") }
                    }
                }.frame(width: 260, height: 160)
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("region-\(colorway.rawValue)", view)
        }
    }

    /// Visual integration specimen: generated foundation values with real Region and Surface views.
    func testSpatialFieldFoundation() {
        let carried = CGRect(x: 302, y: 148, width: 118, height: 38)
        let atRest = CGRect(x: 265, y: 188, width: 118, height: 38)
        let first = CGRect(x: 22, y: 20, width: 280, height: 180)
        let target = CGRect(x: 348, y: 20, width: 280, height: 180)
        for colorway in MetalColorway.allCases {
            for state in ["rest", "carry", "target"] {
                let scene = MetalSpatialFieldScene(
                    regions: [MetalSpatialFieldRegion(id: "todo", frame: first), MetalSpatialFieldRegion(id: "done", frame: target)],
                    object: atRest, carried: state == "rest" ? nil : carried, targetID: state == "target" ? "done" : nil
                )
                let specimen = ZStack(alignment: .topLeading) {
                    MetalSpatialFieldView(scene: scene)
                    MetalRegionView(name: "To do", rule: "makes tasks").frame(width: 280, height: 180).offset(x: 22, y: 20)
                    MetalRegionView(name: "Done", rule: "marks tasks done", dropRule: "drop to mark tasks done",
                                    state: state == "target" ? .over : .rest)
                        .frame(width: 280, height: 180).offset(x: 348, y: 20)
                    MetalSurface(.raiseLite, radius: .card) {
                        Text("send the poster").font(.metal(MetalType.content)).foregroundStyle(colorway.tokens.ink.color)
                            .padding(.horizontal, 14).padding(.vertical, 8)
                    }
                    .offset(x: state == "rest" ? 265 : carried.minX, y: state == "rest" ? 188 : carried.minY)
                }
                .frame(width: 660, height: 240)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
                capture("spatial-field-\(state)-\(colorway.rawValue)", specimen)
            }
        }
    }

    func testSelect() {
        for colorway in MetalColorway.allCases {
            let options = [
                MetalSelectOption("red", label: "Red"),
                MetalSelectOption("green", label: "Green"),
                MetalSelectOption("blue", label: "Blue", disabled: true),
            ]
            let view = HStack(spacing: 20) {
                MetalSelect("Colour", selection: .constant("green"), options: options)
                MetalSelect("Colour", selection: .constant(nil), options: options,
                            placeholder: "Choose colour", size: .compact, invalid: true)
                MetalSelect("Colour", selection: .constant("red"), options: options).disabled(true)
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("select-\(colorway.rawValue)", view)
            let list = MetalSelect("Colour", selection: .constant("green"), groups: [
                MetalSelectGroup("WARM", options: [options[0]]),
                MetalSelectGroup("COOL", options: Array(options.dropFirst())),
            ]).specimenList
                .padding(28)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("select-list-\(colorway.rawValue)", list)
        }
    }

    func testTabs() {
        for colorway in MetalColorway.allCases {
            let options = [MetalTab("react", title: "React"), MetalTab("swift", title: "SwiftUI")]
            let view = VStack(alignment: .leading, spacing: 20) {
                MetalTabs("Examples", selection: .constant("react"), options: options) { value in
                    Text("\(value) component example").font(.metal(MetalType.ui))
                }
                MetalTabs("Examples", selection: .constant("swift"), options: options, size: .compact) { value in
                    Text("\(value) component example").font(.metal(MetalType.ui))
                }
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("tabs-\(colorway.rawValue)", view)
        }
    }

    func testSegmented() {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 20) {
                MetalSegmented("Colorway", selection: .constant("bone"), options: [("bone", "Bone"), ("graphite", "Graphite")])
                MetalSegmented("View", selection: .constant("list"), options: [("place", "place"), ("list", "list"), ("table", "table"), ("timeline", "timeline"), ("gallery", "gallery")], size: .compact)
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("segmented-\(colorway.rawValue)", view)
        }
    }

    func testLensBar() {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 20) {
                MetalLensBar(query: "open tasks about the poster", count: 6, source: MetalLensSource("LOCAL"), mode: .constant(.list), onPin: {}, onClose: {})
                MetalLensBar(query: "lunch this week", source: MetalLensSource("ASKING", waiting: true), mode: .constant(.place), onPin: {}, onClose: {})
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("lens-bar-\(colorway.rawValue)", view)
        }
    }

    func testMemoryScrubber() {
        let end = Date(timeIntervalSince1970: 1_790_000_000)
        let start = end.addingTimeInterval(-6 * 86400)
        let marks = (0..<20).map { start.addingTimeInterval(Double($0) * 6 * 86400 / 20 + 3600) }
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 24) {
                MetalMemoryScrubber(range: start...end, selection: .constant(nil), marks: marks)
                MetalMemoryScrubber(range: start...end, selection: .constant(end.addingTimeInterval(-2.4 * 86400)), marks: marks)
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("memory-scrubber-\(colorway.rawValue)", view)
        }
    }

    func testPastBanner() {
        for colorway in MetalColorway.allCases {
            let view = MetalPastBanner(moment: "viewing Tue 23 Sep · 14:10") {}
                .padding(28)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("past-banner-\(colorway.rawValue)", view)
        }
    }

    func testToolStrip() {
        for colorway in MetalColorway.allCases {
            let view = MetalToolStrip(label: "3 blocks", items: ["Tasks", "Summarise", "Gather", "Region", "Export"].map { MetalToolStripItem($0) {} } + [MetalToolStripItem("Send away", destructive: true) {}])
                .padding(28)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("tool-strip-\(colorway.rawValue)", view)
        }
    }

    func testSizeReadout() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 16) {
                MetalSizeReadout(size: CGSize(width: 320, height: 214))
                MetalSizeReadout(size: CGSize(width: 540, height: 180), count: 3)
                MetalSizeReadout(size: CGSize(width: 130, height: 215), copied: "PNG")
                MetalSizeReadout(value: "100 %")
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("size-readout-\(colorway.rawValue)", view)
        }
    }

    func testKbd() {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 16) {
                HStack(spacing: 6) { MetalKbd("⌘"); MetalKbd("K"); MetalKbd("⇧"); MetalKbd("↩"); MetalKbd("⎋") }
                HStack(spacing: 6) { MetalKbd("↑", size: .small); MetalKbd("↓", size: .small); MetalKbd("⌘K", surface: .strip); MetalKbd("⌘Z", surface: .sunk) }
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("kbd-\(colorway.rawValue)", view)
        }
    }

    func testStatus() {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 20) {
                HStack(spacing: 24) { MetalLED(.live); MetalLED(.waiting); MetalLED(.failed); MetalLED(.link); MetalLED(.off) }
                HStack(spacing: 12) {
                MetalStatusBadge("Recognizer live", led: .live)
                MetalStatusBadge("Recognizer offline", led: .waiting)
                MetalStatusBadge("Recognizer · no connection", led: .failed)
                }
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("status-\(colorway.rawValue)", view)
        }
    }

    func testToast() {
        for colorway in MetalColorway.allCases {
            let view = VStack(spacing: 16) {
                MetalToast(MetalToastModel("Moved 3 blocks", undo: {}))
                MetalToast(MetalToastModel("Pinned as a live region", sub: "it updates as you write", tone: .success))
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("toast-\(colorway.rawValue)", view)
        }
    }

    func testToolbar() {
        for colorway in MetalColorway.allCases {
            let tools = { (variant: MetalToolbar<AnyView>.Variant) in
                MetalToolbar("Tools", variant: variant) {
                    AnyView(Group {
                        MetalToolButton("Select", icon: .select, latched: true) {}
                        MetalToolButton("Write", icon: .text) {}
                        MetalToolButton("Region", icon: .region) {}
                        MetalToolButton("Ink", icon: .draw) {}
                        MetalToolbarSeparator()
                        MetalToolButton("Undo", icon: .undo) {}
                    })
                }
            }
            let view = VStack(spacing: 20) { tools(.graphite); tools(.frost) }
                .padding(28)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("toolbar-\(colorway.rawValue)", view)
        }
    }
    func testCommandPalette() {
        let items: [MetalCommandPaletteItem] = [
            .init(id: "lens", label: "See “poster”", section: "LENS", icon: .search, hint: .readout("RULES")),
            .init(id: "tag", label: "#poster", section: "LENSES", icon: .tag),
            .init(id: "f1", label: "the font on the train poster was a condensed grotesk", section: "BLOCKS", icon: .document, hint: .readoutKey("8:52", "↩")),
            .init(id: "f2", label: "poster refs from the studio", section: "BLOCKS", icon: .document, hint: .readout("9:10")),
            .init(id: "undo", label: "Undo", section: "ACTIONS", icon: .undo, hint: .key("⌘Z")),
            .init(id: "clear", label: "Clear the poster board", section: "ACTIONS", icon: .trash, danger: true),
        ]
        for colorway in MetalColorway.allCases {
            let view = MetalCommandPalette(query: .constant("poster"), items: items, filter: false, status: "NATURAL LANGUAGE RECOGNITION", onRun: { _, _ in }, onClose: {})
                .environment(\.metalSnapshot, true)
                .padding(28)
                .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
                .metalColorway(colorway)
            capture("command-palette-\(colorway.rawValue)", view)
        }
    }
    func testTooltip() {
        for colorway in MetalColorway.allCases {
            let view = HStack(spacing: 40) {
                MetalToolbar("Tools", variant: .graphite) {
                    MetalToolButton("Select", icon: .select, latched: true) {}.metalTooltipChip("Select", shortcut: "V")
                    MetalToolButton("Undo", icon: .undo) {}
                }
                MetalToolbar("Tools", variant: .frost) {
                    MetalToolButton("Region", icon: .region) {}
                    MetalToolButton("Undo", icon: .undo) {}.metalTooltipChip("Undo", shortcut: "⌘Z")
                }
            }
            .padding(.horizontal, 28).padding(.top, 60).padding(.bottom, 28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("tooltip-\(colorway.rawValue)", view)
        }
    }
    func testMenu() {
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 28) {
                MetalMenuPanel(heading: "Note · task by recognizer 0.82", items: [
                    MetalMenuItem("Not a Task") {},
                    MetalMenuItem("Reset Corrections") {},
                    MetalMenuItem("Recognize Again") {},
                    .separator,
                    MetalMenuItem("Gather Similar", icon: .search) {},
                ], onClose: {})
                MetalMenuPanel(items: [
                    MetalMenuItem("Duplicate", icon: .duplicate, shortcut: "⌘D") {},
                    MetalMenuItem("Pin", icon: .pin, shortcut: "⇧P") {},
                    MetalMenuItem("Share", icon: .share, disabled: true) {},
                    .separator,
                    MetalMenuItem("Delete", icon: .trash, shortcut: "⌫", danger: true) {},
                ], onClose: {})
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("menu-\(colorway.rawValue)", view)
        }
    }
    func testButton() {
        for colorway in MetalColorway.allCases {
            let view = VStack(alignment: .leading, spacing: 18) {
                HStack(spacing: 12) {
                    MetalButton("Cancel") {}
                    MetalButton("New Canvas", cap: .primary) {}
                    MetalButton("Delete", cap: .destructive, action: {}) { MetalIcon(.trash, size: 16) }
                }
                HStack(spacing: 10) {
                    MetalButton("seed a sample day", size: .compact) {}
                    MetalButton("Open", size: .compact, action: {}) { MetalIcon(.search, size: 14) }
                    MetalButton("Keep", cap: .primary, size: .compact) {}
                }
            }
            .padding(28)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("button-\(colorway.rawValue)", view)
        }
    }

    func testDialog() {
        for colorway in MetalColorway.allCases {
            let view = MetalDialogPopup("Create canvas", popup: {
                Text("Give the canvas a name before placing your work.")
                    .font(.metal(MetalType.content))
                    .foregroundStyle(colorway.tokens.ink2.color)
            }, actions: {
                MetalButton("Cancel") {}
                MetalButton("Create", cap: .primary) {}
            })
            .padding(MetalRecipes.dialog.points("self.pad"))
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("dialog-\(colorway.rawValue)", view)
        }
    }

    func testWeather() {
        let hours: [MetalWeatherHour] = [
            .init(label: "Now", hour: 9, kind: .clear, temp: "19°", accessibilityLabel: "Now, 19°"),
            .init(label: "12", hour: 12, kind: .partly, temp: "24°", accessibilityLabel: "12, 24°"),
            .init(label: "15", hour: 15, kind: .drizzle, temp: "22°", accessibilityLabel: "15, 22°"),
            .init(label: "18", hour: 18, kind: .cloud, temp: "20°", accessibilityLabel: "18, 20°"),
            .init(label: "21", hour: 21, kind: .clear, temp: "17°", accessibilityLabel: "21, 17°"),
            .init(label: "00", hour: 0, kind: .partly, temp: "15°", accessibilityLabel: "00, 15°")
        ]
        let days: [MetalWeatherDay] = [
            .init(name: "Today", kind: .rain, low: 14, high: 24, accessibilityLabel: "Today: low 14°, high 24°"),
            .init(name: "Sun", kind: .partly, low: 15, high: 23, accessibilityLabel: "Sun: low 15°, high 23°"),
            .init(name: "Mon", kind: .clear, low: 16, high: 26, accessibilityLabel: "Mon: low 16°, high 26°"),
            .init(name: "Tue", kind: .heat, low: 17, high: 28, accessibilityLabel: "Tue: low 17°, high 28°"),
            .init(name: "Wed", kind: .cloud, low: 16, high: 25, accessibilityLabel: "Wed: low 16°, high 25°"),
            .init(name: "Thu", kind: .storm, low: 14, high: 20, accessibilityLabel: "Thu: low 14°, high 20°"),
            .init(name: "Fri", kind: .snow, low: 10, high: 15, accessibilityLabel: "Fri: low 10°, high 15°")
        ]
        let tiles: [(MetalWeatherKind, String, String, String, Double)] = [
            (.clear, "Clear", "21°", "Dry", 9), (.partly, "Partly", "20°", "Rain 10%", 13),
            (.rain, "Rain", "14°", "Rain 80%", 10), (.storm, "Thunder", "16°", "Rain 90%", 16),
            (.snow, "Snow", "-3°", "Snow 60%", 11), (.sleet, "Sleet", "1°", "Rain 70%", 8),
            (.mist, "Mist", "9°", "Vis 800 m", 7.6), (.windy, "Windy", "15°", "42 km/h", 14),
            (.clear, "Clear", "12°", "Moon", 23)
        ]
        for colorway in MetalColorway.allCases {
            let view = HStack(alignment: .top, spacing: 32) {
                MetalWeather(place: "Lisbon", summary: "Sunny now · partly cloudy from 11:00", clock: "09:00",
                             hour: 9, sky: .of(.clear), condition: "Sunny", temp: "19°",
                             readout: "Feels 18° · Rain 0% · 9 km/h", skyLabel: "Lisbon: Sunny, 19°",
                             hours: hours, days: days, now: 19, tick: 0)
                LazyVGrid(columns: Array(repeating: GridItem(.fixed(MetalRecipes.weather.points("tile.size")), spacing: 10), count: 3), spacing: 10) {
                    ForEach(tiles.indices, id: \.self) { i in
                        let tile = tiles[i]
                        MetalWeatherTile(sky: .of(tile.0), hour: tile.4, temp: tile.2, name: tile.1, meta: tile.3,
                                         tick: i * 5, accessibilityLabel: "\(tile.1), \(tile.2)")
                    }
                }
            }
            .padding(32)
            .background(colorway == .bone ? MetalShared.page.color : MetalShared.pageDark.color)
            .metalColorway(colorway)
            capture("weather-\(colorway.rawValue)", view)
        }
    }

    /// The Swift sky draws the web's weatherScene dot for dot (scripts/weather-fixtures.mjs).
    func testWeatherSkyMatchesWeb() throws {
        struct Fixture: Decodable {
            struct Cloud: Decodable { let x: Double, y: Double, size: Double, dark: Bool? }
            struct Sky: Decodable {
                let clouds: [Cloud]?, overcast: Bool?, rain: Double?, snow: Double?, thunder: Bool?
                let mist: Double?, wind: Double?, windFrom: Int?, heat: Double?, birds: Int?, moonPhase: Double?
            }
            struct Frame: Decodable {
                let kind: String, sky: Sky?, hour: Double, tick: Int, cols: Int, rows: Int, horizon: Int
                let dots: [UInt8]
            }
            let layers: [String]
            let cases: [Frame]
        }
        let file = try XCTUnwrap(Bundle.module.url(forResource: "weather", withExtension: "json", subdirectory: "Fixtures"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: file))
        XCTAssertEqual(fixture.layers.count, MetalWeatherScene.Layer.allCases.count)
        XCTAssertEqual(fixture.cases.count, 128)
        for frame in fixture.cases {
            let sky: MetalWeatherSky
            if let own = frame.sky {
                sky = MetalWeatherSky(clouds: (own.clouds ?? []).map { .init(x: $0.x, y: $0.y, size: $0.size, dark: $0.dark ?? false) },
                                      overcast: own.overcast ?? false, rain: own.rain ?? 0, snow: own.snow ?? 0,
                                      thunder: own.thunder ?? false, mist: own.mist ?? 0, wind: own.wind ?? 0,
                                      windFrom: own.windFrom ?? 1, heat: own.heat ?? 0, birds: own.birds ?? 0,
                                      moonPhase: own.moonPhase)
            } else {
                sky = .of(try XCTUnwrap(MetalWeatherKind(rawValue: frame.kind)))
            }
            let actual = MetalWeatherScene.dots(cols: frame.cols, rows: frame.rows, horizon: frame.horizon,
                                                hour: frame.hour, sky: sky, tick: frame.tick)
            XCTAssertEqual(actual, frame.dots, "\(frame.kind) at \(frame.hour), tick \(frame.tick), \(frame.cols) × \(frame.rows)")
        }
    }
}
