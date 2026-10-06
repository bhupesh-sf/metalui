import SwiftUI

// Signature pad: a form field that captures a signature. Mirrors components/signature-pad
// (signature-pad.agent.md) from the signature-pad recipe, on borrowed looks: the field well (the paper),
// the rule's groove (the baseline) and the engraved label (the hint).
//   drawing   a DragGesture; the raw line is under the finger, its width from speed (SwiftUI's drag
//             reports no pressure), between minWidth and maxWidth, tapered at both ends
//   settle    on lift the levelled stroke cross-fades in over the raw one on the settle spring
//   typed     "Type instead": a text field on the baseline in the typed font; the keyboard and
//             VoiceOver path. Each mode keeps its own content; the value is the mode that shows
//   history   Undo and Redo (keys, ⌘Z / ⇧⌘Z); Clear is one step of it
//   read-only the mark on the paper, no keys, no hint
//   disabled  40 %
// Reduce Motion: the settle and the hint swap at once.

/// One point of a drawn stroke in the pad's box: x, y and the ink's width there.
public struct MetalSignaturePoint: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public var width: Double
    public init(_ x: Double, _ y: Double, width: Double) { self.x = x; self.y = y; self.width = width }
}

/// A signature: drawn strokes, or a typed name, in the box of the pad it was made on.
public struct MetalSignature: Equatable, Sendable {
    public enum Mark: Equatable, Sendable {
        case drawn([[MetalSignaturePoint]])
        case typed(String)
    }
    public var mark: Mark
    public var width: Double
    public var height: Double
    public init(_ mark: Mark, width: Double, height: Double) { self.mark = mark; self.width = width; self.height = height }

    /// Standalone SVG markup, as the web pad posts it: dark ink (the recipe's export ink) whatever the colorway.
    public func svg(ink: String? = nil) -> String {
        let fill = ink ?? MetalRecipes.signaturePad.text("export.ink") ?? "black"
        let open = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(fmt(width)) \(fmt(height))\" width=\"\(fmt(width))\" height=\"\(fmt(height))\">"
        switch mark {
        case .drawn(let strokes):
            let paths = strokes.map { "<path d=\"\(MetalSignatureInk.outlineSVG($0))\"/>" }.joined()
            return "\(open)<g fill=\"\(fill)\">\(paths)</g></svg>"
        case .typed(let name):
            let escaped = name.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;")
            let pad = MetalRecipes.signaturePad
            let size = height > pad.points("compact.height") ? "regular" : "compact"
            let x = pad.points("\(size).pad"), y = height - pad.points("\(size).baseline")
            return "\(open)<text x=\"\(fmt(x))\" y=\"\(fmt(y))\" fill=\"\(fill)\" font-family=\"sans-serif\" font-size=\"26\" font-weight=\"500\">\(escaped)</text></svg>"
        }
    }

    public var isEmpty: Bool {
        switch mark {
        case .drawn(let s): return s.isEmpty
        case .typed(let n): return n.trimmingCharacters(in: .whitespaces).isEmpty
        }
    }
}

private func fmt(_ v: Double) -> String { String(format: "%.1f", v).replacingOccurrences(of: ".0", with: "") }

/// The ink's outline and its settle, shared by the pad and the SVG export (the web's strokeOutline and settle).
enum MetalSignatureInk {
    static let taper: Double = 10

    /// The outline's points: around the centre line, as wide as each point says, tapered at both ends.
    static func ring(_ pts: [MetalSignaturePoint]) -> [CGPoint]? {
        guard pts.count > 1 else { return nil }
        var lens: [Double] = [.zero]
        for i in 1..<pts.count { lens.append(lens[i - 1] + hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)) }
        let total = lens.last ?? .zero
        guard total >= 1 else { return nil }
        let t = min(taper, total / 2)
        var left: [CGPoint] = [], right: [CGPoint] = []
        for i in pts.indices {
            let a = pts[max(0, i - 1)], b = pts[min(pts.count - 1, i + 1)]
            var tx = b.x - a.x, ty = b.y - a.y
            let tl = max(hypot(tx, ty), .ulpOfOne)
            tx /= tl; ty /= tl
            let s = min(1, lens[i] / t), e = min(1, (total - lens[i]) / t)
            let r = max(0.3, pts[i].width / 2 * s * (2 - s) * (1 - pow(1 - e, 3)))
            left.append(CGPoint(x: pts[i].x - ty * r, y: pts[i].y + tx * r))
            right.append(CGPoint(x: pts[i].x + ty * r, y: pts[i].y - tx * r))
        }
        return left + right.reversed()
    }

    static func path(_ pts: [MetalSignaturePoint]) -> Path {
        var p = Path()
        guard let ring = ring(pts) else {
            if let d = pts.first {
                let r = max(0.5, d.width / 2)
                p.addEllipse(in: CGRect(x: d.x - r, y: d.y - r, width: 2 * r, height: 2 * r))
            }
            return p
        }
        p.move(to: ring[0])
        for i in 1..<ring.count {
            let a = ring[i], b = ring[(i + 1) % ring.count]
            p.addQuadCurve(to: CGPoint(x: (a.x + b.x) / 2, y: (a.y + b.y) / 2), control: a)
        }
        p.closeSubpath()
        return p
    }

    static func outlineSVG(_ pts: [MetalSignaturePoint]) -> String {
        guard let ring = ring(pts) else {
            guard let d = pts.first else { return "" }
            let r = max(0.5, d.width / 2)
            return "M\(fmt(d.x - r)) \(fmt(d.y))a\(fmt(r)) \(fmt(r)) 0 1 0 \(fmt(2 * r)) 0a\(fmt(r)) \(fmt(r)) 0 1 0 \(fmt(-2 * r)) 0Z"
        }
        var d = "M\(fmt(ring[0].x)) \(fmt(ring[0].y))"
        for i in 1..<ring.count {
            let a = ring[i], b = ring[(i + 1) % ring.count]
            d += "Q\(fmt(a.x)) \(fmt(a.y)) \(fmt((a.x + b.x) / 2)) \(fmt((a.y + b.y) / 2))"
        }
        return d + "Z"
    }

    /// The stroke levelled: each point a Gaussian average of its neighbours, the ends pinned.
    static func settle(_ pts: [MetalSignaturePoint]) -> [MetalSignaturePoint] {
        let weights: [Double] = [1, 0.8, 0.45, 0.17]
        let reach = weights.count - 1
        return pts.indices.map { i in
            if i == 0 || i == pts.count - 1 { return pts[i] }
            var x = 0.0, y = 0.0, w = 0.0, sum = 0.0
            for k in -reach...reach {
                let q = pts[min(pts.count - 1, max(0, i + k))], g = weights[abs(k)]
                x += q.x * g; y += q.y * g; w += q.width * g; sum += g
            }
            return MetalSignaturePoint(x / sum, y / sum, width: w / sum)
        }
    }
}

public enum MetalSignatureMode: Sendable { case draw, type }
public enum MetalSignaturePadSize: String, Sendable { case regular, compact }

/// A form field that captures a signature: draw it on the paper, or type your name.
public struct MetalSignaturePad: View {
    @Binding private var signature: MetalSignature?
    private let size: MetalSignaturePadSize
    private let hint: String
    private let minWidth: Double?
    private let maxWidth: Double?
    private let readOnly: Bool
    private let label: String

    @Environment(\.metalColorway) private var colorway
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @State private var mode: MetalSignatureMode
    @State private var history: [[[MetalSignaturePoint]]]
    @State private var at = 0
    @State private var typed: String
    @State private var live: [MetalSignaturePoint] = []
    @State private var lastSample: (point: CGPoint, time: Date, weight: Double)?
    /// The latest stroke's raw line, fading out while its levelled twin fades in.
    @State private var fresh: (index: Int, raw: [MetalSignaturePoint])?
    @State private var settled = true
    @State private var box: CGSize?
    @FocusState private var typing: Bool

    public init(signature: Binding<MetalSignature?>, mode: MetalSignatureMode = .draw, size: MetalSignaturePadSize = .regular,
                hint: String = "Sign here", minWidth: Double? = nil, maxWidth: Double? = nil, readOnly: Bool = false,
                label: String = "Signature") {
        _signature = signature
        self.size = size
        self.hint = hint
        self.minWidth = minWidth
        self.maxWidth = maxWidth
        self.readOnly = readOnly
        self.label = label
        let given = signature.wrappedValue
        var strokes: [[MetalSignaturePoint]] = []
        var name = ""
        if case .drawn(let s) = given?.mark { strokes = s }
        if case .typed(let n) = given?.mark { name = n }
        _history = State(initialValue: [strokes])
        _typed = State(initialValue: name)
        _mode = State(initialValue: name.isEmpty ? mode : .type)
        _box = State(initialValue: given.map { CGSize(width: $0.width, height: $0.height) })
    }

    private var recipe: MetalObjectRecipe { MetalRecipes.signaturePad }
    private func metric(_ key: String) -> CGFloat { recipe.points("\(size.rawValue).\(key)") }
    private var strokes: [[MetalSignaturePoint]] { history[at] }
    private var isEmpty: Bool { mode == .draw ? strokes.isEmpty : typed.trimmingCharacters(in: .whitespaces).isEmpty }
    private var canUndo: Bool { mode == .draw && at > 0 }
    private var canRedo: Bool { mode == .draw && at < history.count - 1 }

    public var body: some View {
        VStack(alignment: .leading, spacing: recipe.points("self.gap")) {
            paper
            if !readOnly { keys }
        }
        .opacity(isEnabled ? .one : recipe.scalar("self.disabled"))
    }

    private var said: String {
        if mode == .type { return typed.isEmpty ? "empty" : "typed: \(typed)" }
        return strokes.isEmpty ? "empty" : "drawn, \(strokes.count) \(strokes.count == 1 ? "stroke" : "strokes")"
    }

    private var paper: some View {
        let t = colorway.tokens
        return GeometryReader { geo in
            let b = box ?? geo.size
            let k = min(geo.size.width / max(b.width, 1), geo.size.height / max(b.height, 1))
            let origin = CGPoint(x: (geo.size.width - b.width * k) / 2, y: (geo.size.height - b.height * k) / 2)
            ZStack(alignment: .topLeading) {
                MetalRule(.horizontal)
                    .padding(.horizontal, metric("pad"))
                    .offset(y: geo.size.height - metric("baseline"))
                    .accessibilityHidden(true)
                if !readOnly {
                    MetalLabel(hint, style: .engraved)
                        .offset(x: metric("pad"), y: geo.size.height - metric("baseline") + recipe.points("hint.gap"))
                        .opacity(isEmpty ? .one : .zero)
                        .animation(reduceMotion ? nil : MetalMotion.resolve(.settle, reduceMotion: false).animation, value: isEmpty)
                        .accessibilityHidden(true)
                }
                if mode == .draw {
                    ink(t.ink.color)
                        .scaleEffect(k, anchor: .topLeading)
                        .offset(x: origin.x, y: origin.y)
                        .contentShape(Rectangle())
                        .gesture(draw(origin: origin, scale: k, size: geo.size), including: isEnabled && !readOnly ? .all : .none)
                        .accessibilityElement()
                        .accessibilityLabel(label)
                        .accessibilityValue(said)
                        .accessibilityAddTraits(.isImage)
                } else {
                    // The name's baseline on the rule: the bottom of this frame is the baseline.
                    ZStack(alignment: .bottomLeading) {
                        typedName(t)
                            .alignmentGuide(.bottom) { $0[.firstTextBaseline] }
                    }
                    .padding(.horizontal, metric("pad"))
                    .frame(width: geo.size.width, height: geo.size.height - metric("baseline"), alignment: .bottomLeading)
                    .onChange(of: typed) { _, name in
                        if box == nil { box = geo.size }
                        publish(.typed(name), geo.size)
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
        }
        .frame(height: metric("height"))
        .clipShape(RoundedRectangle(cornerRadius: recipe.points("self.radius"), style: .continuous))
        .background { MetalWell(.field, radius: recipe.points("self.radius")) { Color.clear } }
    }

    /// The typed name: a field to type in, or the name itself when it can't change (read-only, disabled).
    @ViewBuilder private func typedName(_ t: MetalColorwayTokens) -> some View {
        if readOnly || !isEnabled {
            Text(typed).font(recipe.font("typed.font")).foregroundColor(t.ink.color).lineLimit(1)
                .accessibilityLabel("\(label), \(said)")
        } else {
            TextField("", text: $typed, prompt: Text("Type your full name").foregroundColor(t.ink3.color))
                .textFieldStyle(.plain)
                .font(recipe.font("typed.font"))
                .foregroundColor(t.ink.color)
                .focused($typing)
                .accessibilityLabel("\(label), type your full name")
        }
    }

    /// Every stroke but the fresh one in one Canvas; the fresh one as its raw and levelled twins, cross-fading.
    private func ink(_ color: Color) -> some View {
        let settledStrokes = strokes
        let freshIndex = fresh?.index
        return ZStack(alignment: .topLeading) {
            Canvas { ctx, _ in
                for (i, s) in settledStrokes.enumerated() where i != freshIndex { ctx.fill(MetalSignatureInk.path(s), with: .color(color)) }
                if !live.isEmpty { ctx.fill(MetalSignatureInk.path(live), with: .color(color)) }
            }
            if let fresh, fresh.index < settledStrokes.count {
                MetalSignatureInk.path(fresh.raw).fill(color).opacity(settled ? .zero : .one)
                MetalSignatureInk.path(settledStrokes[fresh.index]).fill(color).opacity(settled ? .one : .zero)
            }
        }
        .frame(width: box?.width, height: box?.height, alignment: .topLeading)
    }

    private func draw(origin: CGPoint, scale: CGFloat, size: CGSize) -> some Gesture {
        DragGesture(minimumDistance: .zero, coordinateSpace: .local)
            .onChanged { g in
                if box == nil { box = size }
                let p = CGPoint(x: (g.location.x - origin.x) / scale, y: (g.location.y - origin.y) / scale)
                let lo = minWidth ?? recipe.points("ink.min"), hi = maxWidth ?? recipe.points("ink.max")
                guard let last = lastSample else {
                    lastSample = (p, g.time, 0.6)
                    live = [MetalSignaturePoint(p.x, p.y, width: lo + (hi - lo) * 0.6)]
                    return
                }
                let dist = hypot(p.x - last.point.x, p.y - last.point.y)
                guard dist >= 0.5 else { return }
                // Speed thins the ink: full width at rest, the thinnest at ink.velocity px per ms; eased.
                let ms = max(1, g.time.timeIntervalSince(last.time) * 1000)
                let target = max(.zero, 1 - dist / ms / recipe.points("ink.velocity"))
                let w = last.weight + (target - last.weight) * 0.35
                lastSample = (p, g.time, w)
                live.append(MetalSignaturePoint(p.x, p.y, width: lo + (hi - lo) * w))
            }
            .onEnded { _ in
                let raw = live
                live = []
                lastSample = nil
                guard !raw.isEmpty else { return }
                push(strokes + [MetalSignatureInk.settle(raw)], size)
                fresh = (strokes.count - 1, raw)
                settled = false
                withAnimation(reduceMotion ? nil : MetalMotion.resolve(.settle, reduceMotion: false).animation) { settled = true }
            }
    }

    private var keys: some View {
        HStack(spacing: recipe.points("keys.gap")) {
            // Compact (initials) is narrow: its keys are glyphs, and Redo is the keyboard's.
            // The mode key changes meaning in place: its glyph replaces itself and its words turn, on settle.
            Group {
                if size == .compact {
                    MetalIconButton(mode == .draw ? "Type instead" : "Draw instead", icon: mode == .draw ? .text : .pen, action: toggle)
                } else {
                    MetalButton(mode == .draw ? "Type instead" : "Draw instead", size: .compact, action: toggle)
                }
            }
            .metalAnimation(.settle, value: mode)
            Spacer(minLength: .zero)
            if mode == .draw {
                MetalIconButton("Undo", icon: .undo) { go(at - 1) }
                    .disabled(!canUndo)
                    .keyboardShortcut("z", modifiers: .command)
                if size == .regular {
                    MetalIconButton("Redo", icon: .redo) { go(at + 1) }
                        .disabled(!canRedo)
                        .keyboardShortcut("z", modifiers: [.command, .shift])
                }
            }
            if size == .compact {
                MetalIconButton("Clear", icon: .eraser, action: clear).disabled(isEmpty)
            } else {
                MetalButton("Clear", size: .compact, action: clear).disabled(isEmpty)
            }
        }
    }

    private func toggle() {
        mode = mode == .draw ? .type : .draw
        if mode == .type { typing = true }
        publish(mode == .draw ? .drawn(strokes) : .typed(typed), box)
    }

    private func clear() {
        if mode == .draw { push([], box) } else { typed = "" }
    }

    private func go(_ index: Int) {
        guard history.indices.contains(index) else { return }
        at = index
        fresh = nil
        publish(.drawn(strokes), box)
    }

    private func push(_ next: [[MetalSignaturePoint]], _ size: CGSize?) {
        history = Array(history.prefix(at + 1)) + [next]
        at = history.count - 1
        fresh = nil
        publish(.drawn(next), size)
    }

    private func publish(_ mark: MetalSignature.Mark, _ size: CGSize?) {
        guard let size else { signature = nil; return }
        let next = MetalSignature(mark, width: size.width, height: size.height)
        signature = next.isEmpty ? nil : next
    }
}
