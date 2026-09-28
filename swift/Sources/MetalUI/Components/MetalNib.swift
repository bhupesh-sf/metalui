import SwiftUI

/// A pen nib seen from above: brass, narrowing to its tip, with a slit and a breather hole, its tip
/// wet with ink in the accent. Its origin is its tip; `angle` turns it about the tip. The twin of `Nib`.
public struct MetalNib: View {
    let angle: Double
    let ink: MetalOklch
    let tip: CGPoint
    let dims: (Double, Double)
    let size: Double

    /// `tip` and `dims` ([length, width]) are on the 400-unit canvas (default: drawn by itself).
    public init(angle: Double = 0, ink: MetalOklch? = nil, tip: CGPoint? = nil, dims: (Double, Double)? = nil, size: Double = 96) {
        let warm = MetalGadgetFeelTokens.accentWarm, native = MetalGadgetTokens.partSizes["nib"] ?? (70, 20)
        let L = MetalGadgetTokens.nibAlone, d = dims ?? (L, L * native.1 / native.0)
        self.angle = angle; self.size = size; self.dims = d
        self.ink = ink ?? MetalOklch(L: warm.L, C: warm.C, H: warm.H)
        self.tip = tip ?? CGPoint(x: 200, y: 200 + d.0 / 2)
    }

    /// The nib's outline, pointing down at its tip (0, 0) with its body up the canvas: the same curve as
    /// nibOutline in nib.ts.
    static func outline(_ L: Double, _ W: Double) -> Path {
        let s = MetalGadgetTokens.nibShoulder, sy = -L * s.at, hw = W * s.width / 2, base = -L, r = hw * 0.35
        return Path { p in
            p.move(to: .zero)
            p.addCurve(to: CGPoint(x: hw, y: sy), control1: CGPoint(x: hw * 0.15, y: sy * 0.3), control2: CGPoint(x: hw, y: sy * 0.7))
            p.addLine(to: CGPoint(x: hw, y: base + r))
            p.addQuadCurve(to: CGPoint(x: hw - r, y: base), control: CGPoint(x: hw, y: base))
            p.addLine(to: CGPoint(x: -hw + r, y: base))
            p.addQuadCurve(to: CGPoint(x: -hw, y: base + r), control: CGPoint(x: -hw, y: base))
            p.addLine(to: CGPoint(x: -hw, y: sy))
            p.addCurve(to: .zero, control1: CGPoint(x: -hw, y: sy * 0.7), control2: CGPoint(x: -hw * 0.15, y: sy * 0.3))
            p.closeSubpath()
        }
    }

    public var body: some View {
        let unit = size / MetalGadgetTokens.canvas, (L, W) = dims, brass = MetalGadgetTokens.beeperBrass
        let place = { (dx: Double, dy: Double) in
            CGAffineTransform(scaleX: unit, y: unit).translatedBy(x: tip.x + dx, y: tip.y + dy).rotated(by: angle * .pi / 180)
        }
        let shape = Self.outline(L, W), sh = MetalGadgetTokens.nibShadow, wet = MetalGadgetTokens.nibWet, hole = MetalGadgetTokens.nibHole
        let crown = MetalPigment.color(lightness: min(1, brass.L + MetalGadgetTokens.nibCrown), chroma: brass.C, hue: brass.H)
        let metal = MetalPigment.color(lightness: brass.L, chroma: brass.C, hue: brass.H)
        let deep = MetalPigment.color(lightness: brass.L - MetalGadgetTokens.nibCrown, chroma: brass.C, hue: brass.H)
        let nib = shape.applying(place(0, 0)), box = nib.boundingRect
        let cut = MetalGadgetTokens.nibCut
        let dark = Color(.sRGB, red: 20 / 255, green: 16 / 255, blue: 12 / 255)
        ZStack(alignment: .topLeading) {
            shape.applying(place(W * sh.dx, W * sh.dy)).fill(MetalGadgetLighting.shadow.opacity(sh.alpha)).blur(radius: W * sh.blur * unit)
            nib.fill(LinearGradient(stops: [.init(color: deep, location: 0), .init(color: crown, location: 0.35), .init(color: metal, location: 0.6), .init(color: deep, location: 1)],
                                    startPoint: UnitPoint(x: box.minX / size, y: 0.5), endPoint: UnitPoint(x: box.maxX / size, y: 0.5)))
            Path(CGRect(x: -W, y: -L * wet.share, width: 2 * W, height: L * wet.share)).applying(place(0, 0))
                .fill(MetalPigment.color(lightness: ink.L, chroma: ink.C, hue: ink.H).opacity(wet.alpha)).clipShape(nib)
            Path { p in p.move(to: .zero); p.addLine(to: CGPoint(x: 0, y: -L * MetalGadgetTokens.nibSlit)) }.applying(place(0, 0))
                .stroke(dark.opacity(cut.slit), lineWidth: W * cut.width * unit)
            Path(ellipseIn: CGRect(x: -W * hole.radius, y: -L * hole.at - W * hole.radius, width: 2 * W * hole.radius, height: 2 * W * hole.radius)).applying(place(0, 0))
                .fill(dark.opacity(cut.hole))
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel(angle == 0 ? "nib" : "nib, turned \(Int(angle.rounded()))°")
    }
}
