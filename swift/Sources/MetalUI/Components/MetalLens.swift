import SwiftUI

/// A camera lens seen head-on: a knurled ring in the accent that turns (`turn`, degrees), a domed
/// glass dark at its centre and coated toward its rim, and an iris behind it closing to a polygon as
/// `iris` runs from 1 to 0. The twin of `Lens`.
public struct MetalLens: View {
    let iris: Double
    let turn: Double
    let ticks: Int
    let color: MetalOklch
    let diameter: Double
    let center: CGPoint
    let size: Double

    /// `diameter` is across the ring on the 400-unit canvas and `center` its centre (default: drawn by itself).
    public init(iris: Double = 0.6, turn: Double = 0, ticks: Int = 24, color: MetalOklch? = nil, diameter: Double = MetalGadgetTokens.lensAlone,
                center: CGPoint = CGPoint(x: 200, y: 200), size: Double = 96) {
        let warm = MetalGadgetFeelTokens.accentWarm
        self.iris = iris; self.turn = turn; self.ticks = ticks; self.diameter = diameter; self.center = center; self.size = size
        self.color = color ?? MetalOklch(L: warm.L, C: warm.C, H: warm.H)
    }

    /// The iris opening's corners (canvas units): a polygon of the blades' count, its radius between the
    /// iris's min and max of the dome's. The same rule as irisCorners in lens.ts.
    public static func irisCorners(_ c: CGPoint, dome: Double, iris: Double) -> [CGPoint] {
        let i = MetalGadgetTokens.lensIris, r = dome * (i.min + (i.max - i.min) * min(1, max(0, iris))), n = MetalGadgetTokens.lensBlades
        return (0..<n).map { k in point(c, r, 360 / Double(n) * Double(k)) }
    }
    static func point(_ c: CGPoint, _ r: Double, _ deg: Double) -> CGPoint {
        let a = (deg - 90) * .pi / 180
        return CGPoint(x: c.x + r * cos(a), y: c.y + r * sin(a))
    }

    public var body: some View {
        let unit = size / MetalGadgetTokens.canvas, native = (MetalGadgetTokens.partSizes["lens"]?.0 ?? 184) / 2
        let R = diameter / 2, k = R / native, ring = MetalGadgetTokens.lensRing * k, inner = R - ring, dome = inner - MetalGadgetTokens.lensBevel * k
        let d = MetalGadgetTokens.lensDome, g = MetalGadgetTokens.lensGrip, sh = MetalGadgetTokens.lensShadow, m = MetalGadgetTokens.jackMetal
        let c = CGPoint(x: center.x * unit, y: center.y * unit), s = { (x: Double) in x * unit }
        let lit = MetalPigment.color(lightness: min(1, color.L + 0.1), chroma: color.C, hue: color.H)
        let deep = MetalPigment.color(lightness: color.L - 0.1, chroma: color.C, hue: color.H)
        let corners = Self.irisCorners(center, dome: dome, iris: iris)
        let seams = Path { p in
            for (i, v) in corners.enumerated() {
                let nv = corners[(i + 1) % corners.count], len = hypot(nv.x - v.x, nv.y - v.y), ux = (nv.x - v.x) / len, uy = (nv.y - v.y) / len
                let px = v.x - center.x, py = v.y - center.y, b = px * ux + py * uy, t = b + (b * b - (px * px + py * py - dome * dome)).squareRoot()
                p.move(to: CGPoint(x: s(v.x), y: s(v.y))); p.addLine(to: CGPoint(x: s(v.x - ux * t), y: s(v.y - uy * t)))
            }
        }
        let gl = MetalGadgetTokens.lensGlare, tg = MetalGadgetTokens.lensGlint
        // Diameters, drawn: the lens, the bevel's circle, the dome, the glare and the glint.
        let across = s(R + R), bevelAcross = s(inner + inner - MetalGadgetTokens.lensBevel * k), domeAcross = s(dome + dome)
        let glareAcross = domeAcross * gl.radius, glintAcross = domeAcross * tg.radius
        ZStack(alignment: .topLeading) {
            Circle().fill(MetalGadgetLighting.shadow.opacity(sh.alpha)).frame(width: across, height: across).blur(radius: s(R * sh.blur))
                .position(x: s(center.x + R * sh.dx), y: s(center.y + R * sh.dy))
            // The ring and its grip lines turn together.
            ZStack(alignment: .topLeading) {
                Path { p in p.addEllipse(in: CGRect(x: c.x - s(R), y: c.y - s(R), width: s(2 * R), height: s(2 * R))); p.addEllipse(in: CGRect(x: c.x - s(inner), y: c.y - s(inner), width: s(2 * inner), height: s(2 * inner))) }
                    .fill(LinearGradient(colors: [lit, MetalPigment.color(lightness: color.L, chroma: color.C, hue: color.H), deep],
                                         startPoint: UnitPoint(x: (center.x - R) / MetalGadgetTokens.canvas, y: (center.y - R) / MetalGadgetTokens.canvas),
                                         endPoint: UnitPoint(x: (center.x + R) / MetalGadgetTokens.canvas, y: (center.y + R) / MetalGadgetTokens.canvas)),
                          style: FillStyle(eoFill: true))
                Path { p in
                    for i in 0..<ticks {
                        let deg = 360 / Double(ticks) * Double(i)
                        let a = Self.point(center, R - ring * g.length, deg), b = Self.point(center, R - 1.5 * k, deg)
                        p.move(to: CGPoint(x: s(a.x), y: s(a.y))); p.addLine(to: CGPoint(x: s(b.x), y: s(b.y)))
                    }
                }
                .stroke(deep, style: StrokeStyle(lineWidth: s(2.2 * k), lineCap: .round)).opacity(g.alpha)
            }
            .frame(width: size, height: size, alignment: .topLeading)
            .rotationEffect(.degrees(turn), anchor: UnitPoint(x: center.x / MetalGadgetTokens.canvas, y: center.y / MetalGadgetTokens.canvas))
            Circle().stroke(MetalPigment.color(lightness: m.L, chroma: m.C, hue: m.H), lineWidth: s(MetalGadgetTokens.lensBevel * k))
                .frame(width: bevelAcross, height: bevelAcross).position(c)
            Circle().fill(RadialGradient(stops: [.init(color: MetalPigment.color(lightness: d.centreL, chroma: 0.02, hue: d.hue), location: 0),
                                                 .init(color: MetalPigment.color(lightness: (d.centreL + d.rimL) / 2, chroma: d.rimC / 2, hue: d.hue), location: 0.7),
                                                 .init(color: MetalPigment.color(lightness: d.rimL, chroma: d.rimC, hue: d.hue), location: 1)],
                                         center: .center, startRadius: 0, endRadius: s(dome)))
                .frame(width: domeAcross, height: domeAcross).position(c)
            // The iris: blades over the glass with the polygon open between them, and their seams.
            Path { p in
                p.addEllipse(in: CGRect(x: c.x - s(dome), y: c.y - s(dome), width: s(2 * dome), height: s(2 * dome)))
                p.addLines(corners.map { CGPoint(x: s($0.x), y: s($0.y)) }); p.closeSubpath()
            }
            .fill(MetalPigment.color(lightness: MetalGadgetTokens.lensBlade, chroma: 0.01, hue: d.hue), style: FillStyle(eoFill: true))
            seams.stroke(.black.opacity(MetalGadgetTokens.lensSeam), lineWidth: s(k))
            Circle().fill(RadialGradient(colors: [.white.opacity(gl.alpha), .clear], center: .center, startRadius: 0, endRadius: s(dome * gl.radius)))
                .frame(width: glareAcross, height: glareAcross)
                .position(x: s(center.x - dome + 2 * dome * gl.x), y: s(center.y - dome + 2 * dome * gl.y))
            Circle().fill(.white.opacity(tg.alpha)).frame(width: glintAcross, height: glintAcross)
                .position(x: s(center.x - dome + 2 * dome * tg.x), y: s(center.y - dome + 2 * dome * tg.y))
        }
        .frame(width: size, height: size, alignment: .topLeading)
        .accessibilityElement()
        .accessibilityLabel("lens, iris \(Int((iris * 100).rounded()))% open")
    }
}
