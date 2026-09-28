import SwiftUI

/// The fader or knob cap a person moves: a face on its darker side wall, grip ribs or a pointer
/// groove, and its own shadow. Pressed, the face sinks toward the body and the shadow draws in, on
/// the release spring (at once with Reduce Motion). The SwiftUI twin of `Cap` (parts/cap.ts).
public struct MetalCap: View {
    public enum Shape: String, Sendable { case fader, knob, rocker }
    public enum Layer: Sendable { case both, body, shadow }
    let shape: Shape
    let ribs: Int
    let color: MetalOklch
    let material: MetalSoundMaterial
    let pressed: Bool
    let size: Double
    let layer: Layer
    let accent: Bool
    /// A rocker's tilt: -1 off (its lower end pressed) to 1 on.
    let tilt: Double
    @Environment(\.metalColorway) private var colorway
    @Environment(\.displayScale) private var displayScale
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(shape: Shape = .fader, ribs: Int = MetalGadgetTokens.capRibs, accent: Bool = false, material: MetalSoundMaterial = .clay,
                color: MetalOklch? = nil, pressed: Bool = false, tilt: Double = -1, size: Double = 96, layer: Layer = .both) {
        self.tilt = tilt
        let warm = MetalGadgetFeelTokens.accentWarm, hue = MetalSoundMaterial.clay.finish.sampleHue
        self.shape = shape; self.ribs = ribs; self.accent = accent; self.material = material; self.pressed = pressed; self.size = size; self.layer = layer
        self.color = color ?? (accent ? MetalOklch(L: warm.L, C: warm.C, H: warm.H)
            : material == .ceramic ? MetalOklch(L: MetalGadgetTokens.capCeramic.L, C: MetalGadgetTokens.capCeramic.C, H: hue)
            : MetalOklch(L: MetalGadgetTokens.plugFaceClay, C: MetalGadgetTokens.plugFaceChroma, H: hue))
    }

    /// The face on the 400-unit canvas, as the React Part draws it alone.
    private var face: CGRect {
        let c = MetalGadgetTokens.canvas / 2, sizes = MetalGadgetTokens.partSizes["cap"] ?? (60, 44)
        let rs = MetalGadgetTokens.capRockerSize
        let W0 = MetalGadgetTokens.capAlone, H = shape == .rocker ? W0 * rs.height / rs.width : W0 * sizes.1 / sizes.0, W = shape == .knob ? H : W0
        return CGRect(x: c - W / 2, y: c - H / 2, width: W, height: H)
    }
    /// Every length on a cap is at the Part's own size (60 × 44); a bigger cap scales them all.
    private var k: Double { shape == .rocker ? face.width / (MetalGadgetTokens.partSizes["cap"]?.0 ?? face.width) : face.height / (MetalGadgetTokens.partSizes["cap"]?.1 ?? face.height) }
    private var radius: Double { shape == .knob ? face.height / 2 : min(MetalGadgetTokens.capRadius * k, face.height / 2) }

    public var body: some View {
        if shape == .rocker { rocker } else { cap }
    }

    /// A rocker's overlays for its tilt, the same rule as rockerLook in cap.ts: the half facing the light
    /// lightens, the other darkens, the fold deepens, the shadow moves toward the raised end.
    static func rockerLook(_ tilt: Double, k: Double) -> (topLit: Double, topShade: Double, bottomLit: Double, bottomShade: Double, hinge: Double, shadowDy: Double) {
        let R = MetalGadgetTokens.capRocker, t = max(-1, min(1, tilt)), a = abs(t)
        return (t > 0 ? R.light * a : 0, t < 0 ? R.shade * a : 0, t < 0 ? R.light * a : 0, t > 0 ? R.shade * a : 0, R.hinge * (0.3 + 0.7 * a), R.shift * k * t)
    }

    private var rocker: some View {
        let unit = size / MetalGadgetTokens.canvas, f = face, r = radius, W = f.width, H = f.height, look = Self.rockerLook(tilt, k: k)
        let sh = MetalGadgetTokens.capShadow, gi = MetalGadgetTokens.capGrooveInk, g = MetalGadgetTokens.capGroove, ps = MetalGadgetTokens.capPointerScale
        let groove = MetalPigment.color(lightness: max(gi.floor, color.L - gi.drop), chroma: min(gi.max, color.C * gi.gain + gi.add), hue: color.H)
        let outline = RoundedRectangle(cornerRadius: r * unit, style: .continuous), glyph = H * MetalGadgetTokens.capRocker.glyph
        let halfH = H / 2 * unit
        return ZStack(alignment: .topLeading) {
            if layer != .body {
                outline.fill(MetalGadgetLighting.shadow.opacity(sh.alpha)).frame(width: W * unit, height: H * unit).blur(radius: W * sh.blur * unit)
                    .position(x: (f.midX + W * sh.dx) * unit, y: (f.midY + W * sh.dy + look.shadowDy) * unit)
            }
            if layer != .shadow {
                outline.fill(MetalPigment.color(lightness: color.L - MetalGadgetTokens.capSideDrop, chroma: color.C, hue: color.H))
                    .frame(width: W * unit, height: H * unit).position(x: f.midX * unit, y: (f.midY + MetalGadgetTokens.capSide * k) * unit)
                if let image = MetalGadgetLighting.surface(CGPath(roundedRect: f, cornerWidth: r, cornerHeight: r, transform: nil), key: "cap-rocker",
                                                           material: material, lightness: color.L, chroma: color.C, hue: color.H,
                                                           size: size, scale: max(1, displayScale), colorway: colorway) {
                    Image(decorative: image, scale: max(1, displayScale)).frame(width: size, height: size)
                }
                VStack(spacing: 0) {
                    ZStack { Color.white.opacity(look.topLit); Color.black.opacity(look.topShade) }.frame(height: halfH)
                    ZStack { Color.white.opacity(look.bottomLit); Color.black.opacity(look.bottomShade) }.frame(height: halfH)
                }
                .frame(width: W * unit, height: H * unit).clipShape(outline).position(x: f.midX * unit, y: f.midY * unit)
                Path { p in p.move(to: CGPoint(x: (f.minX + r / 2) * unit, y: f.midY * unit)); p.addLine(to: CGPoint(x: (f.maxX - r / 2) * unit, y: f.midY * unit)) }
                    .stroke(groove.opacity(look.hinge), lineWidth: g.width * k * unit)
                Path { p in p.move(to: CGPoint(x: f.midX * unit, y: (f.midY - H / 4 - glyph / 2) * unit)); p.addLine(to: CGPoint(x: f.midX * unit, y: (f.midY - H / 4 + glyph / 2) * unit)) }
                    .stroke(groove.opacity(g.alpha * ps), style: StrokeStyle(lineWidth: g.width * ps * k * unit, lineCap: .round))
                Circle().stroke(groove.opacity(g.alpha * ps), lineWidth: g.width * ps * k * unit)
                    .frame(width: glyph * unit, height: glyph * unit).position(x: f.midX * unit, y: (f.midY + H / 4) * unit)
            }
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel("rocker cap, \(tilt > 0 ? "on" : "off")")
    }

    private var cap: some View {
        let unit = size / MetalGadgetTokens.canvas, f = face, r = radius, H = f.height
        let sh = MetalGadgetTokens.capShadow, sink = pressed ? MetalGadgetTokens.capPress * k : 0, near = pressed ? MetalGadgetTokens.capPressShadow : 1
        let gi = MetalGadgetTokens.capGrooveInk, ei = MetalGadgetTokens.capEdgeInk
        let groove = MetalPigment.color(lightness: max(gi.floor, color.L - gi.drop), chroma: min(gi.max, color.C * gi.gain + gi.add), hue: color.H)
        let edge = MetalPigment.color(lightness: min(1, color.L + ei.lift), chroma: color.C * ei.chroma, hue: color.H)
        let outline = RoundedRectangle(cornerRadius: r * unit, style: .continuous)
        return ZStack(alignment: .topLeading) {
            if layer != .body {
                outline.fill(MetalGadgetLighting.shadow.opacity(sh.alpha))
                    .frame(width: f.width * unit, height: H * unit).blur(radius: H * sh.blur * unit)
                    .position(x: (f.midX + H * sh.dx * near) * unit, y: (f.midY + H * sh.dy * near) * unit)
            }
            if layer != .shadow {
                outline.fill(MetalPigment.color(lightness: color.L - MetalGadgetTokens.capSideDrop, chroma: color.C, hue: color.H))
                    .frame(width: f.width * unit, height: H * unit)
                    .position(x: f.midX * unit, y: (f.midY + MetalGadgetTokens.capSide * k) * unit)
                ZStack(alignment: .topLeading) {
                    if let image = MetalGadgetLighting.surface(CGPath(roundedRect: f, cornerWidth: r, cornerHeight: r, transform: nil), key: "cap-\(shape.rawValue)",
                                                               material: material, lightness: color.L, chroma: color.C, hue: color.H,
                                                               size: size, scale: max(1, displayScale), colorway: colorway) {
                        Image(decorative: image, scale: max(1, displayScale)).frame(width: size, height: size)
                    }
                    marks(unit: unit, groove: groove, edge: edge)
                }
                .offset(y: sink * unit)
            }
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .animation(reduceMotion ? nil : MetalGadgetTokens.capPressSpring.animation, value: pressed)
        .accessibilityElement()
        .accessibilityLabel("\(shape.rawValue) cap\(accent ? " (accent)" : "")")
    }

    @ViewBuilder private func marks(unit: Double, groove: Color, edge: Color) -> some View {
        let f = face, k = self.k, e = MetalGadgetTokens.capEdge, g = MetalGadgetTokens.capGroove
        if shape == .fader {
            let half = f.width * MetalGadgetTokens.capSpan / 2
            let ys = (0..<ribs).map { f.midY + (Double($0) - Double(ribs - 1) / 2) * MetalGadgetTokens.capPitch * k }
            Path { p in for y in ys { p.move(to: CGPoint(x: (f.midX - half) * unit, y: y * unit)); p.addLine(to: CGPoint(x: (f.midX + half) * unit, y: y * unit)) } }
                .stroke(groove.opacity(g.alpha), style: StrokeStyle(lineWidth: g.width * k * unit, lineCap: .round))
            Path { p in for y in ys { p.move(to: CGPoint(x: (f.midX - half) * unit, y: (y + e.dy * k) * unit)); p.addLine(to: CGPoint(x: (f.midX + half) * unit, y: (y + e.dy * k) * unit)) } }
                .stroke(edge.opacity(e.alpha), style: StrokeStyle(lineWidth: e.width * k * unit, lineCap: .round))
        } else {
            let r = radius, pt = MetalGadgetTokens.capPointer, scale = MetalGadgetTokens.capPointerScale
            Path { p in p.move(to: CGPoint(x: f.midX * unit, y: (f.midY - r * pt.to) * unit)); p.addLine(to: CGPoint(x: f.midX * unit, y: (f.midY - r * pt.from) * unit)) }
                .stroke(groove.opacity(g.alpha * scale), style: StrokeStyle(lineWidth: g.width * scale * k * unit, lineCap: .round))
            Path { p in
                p.move(to: CGPoint(x: (f.midX + e.dy * k / 2) * unit, y: (f.midY - r * pt.to + e.dy * k) * unit))
                p.addLine(to: CGPoint(x: (f.midX + e.dy * k / 2) * unit, y: (f.midY - r * pt.from + e.dy * k) * unit))
            }
            .stroke(edge.opacity(e.alpha), style: StrokeStyle(lineWidth: e.width * k * unit, lineCap: .round))
        }
    }
}
