import SwiftUI
#if canImport(AppKit)
import AppKit
#elseif canImport(UIKit)
import UIKit
#endif

/// Geometry already presented by the containing Place, in the field's local points.
public struct MetalSpatialFieldRegion: Equatable, Sendable {
    public let id: String
    public let frame: CGRect

    public init(id: String, frame: CGRect) {
        self.id = id
        self.frame = frame
    }
}

/// The host chooses the target and commits placement. The field only paints its projection.
public struct MetalSpatialFieldScene: Equatable, Sendable {
    public let regions: [MetalSpatialFieldRegion]
    public let objects: [CGRect]
    public let object: CGRect?
    public let carried: CGRect?
    public let targetID: String?

    public init(regions: [MetalSpatialFieldRegion], objects: [CGRect] = [], object: CGRect? = nil,
                carried: CGRect? = nil, targetID: String? = nil) {
        self.regions = regions
        self.objects = objects
        self.object = object
        self.carried = carried
        self.targetID = targetID
    }
}

/// Shared geometry sampler for SwiftUI and AppKit renderers.
enum MetalSpatialFieldSamples {
    static func visit(scene: MetalSpatialFieldScene, size: CGSize, draw: (CGPoint, Double, Bool) -> Void) {
        guard size.width.isFinite, size.height.isFinite, size.width > 0, size.height > 0 else { return }
        let object = scene.carried
        let target = scene.regions.first(where: { $0.id == scene.targetID })?.frame
        let spacing = max(MetalSpatialField.markSpacing, sqrt(size.width * size.height / 12_000))
        guard spacing.isFinite && spacing > 0 else { return }
        let columns = Int(ceil(size.width / spacing)), rows = Int(ceil(size.height / spacing))
        guard columns > 0, rows > 0 else { return }
        var covered = [Bool](repeating: false, count: columns * rows)
        func cover(_ rect: CGRect, pad: CGFloat, region: Bool) {
            guard rect.minX.isFinite, rect.minY.isFinite, rect.maxX.isFinite, rect.maxY.isFinite else { return }
            let x0 = max(0, Int(ceil((rect.minX - pad) / spacing - 0.5)))
            let y0 = max(0, Int(ceil((rect.minY - pad) / spacing - 0.5)))
            let x1 = min(columns - 1, Int(floor((rect.maxX + pad) / spacing - 0.5)))
            let y1 = min(rows - 1, Int(floor((rect.maxY + pad) / spacing - 0.5)))
            guard x0 <= x1, y0 <= y1 else { return }
            for row in y0...y1 { for col in x0...x1 {
                let point = CGPoint(x: (CGFloat(col) + 0.5) * spacing, y: (CGFloat(row) + 0.5) * spacing)
                if region ? rect.contains(point) : distance(point, to: rect) <= pad { covered[row * columns + col] = true }
            } }
        }
        for region in scene.regions {
            cover(region.frame, pad: 0, region: true)
        }
        for rect in scene.objects {
            cover(rect, pad: MetalSpatialField.clearance, region: false)
        }
        if object == nil, let rest = scene.object {
            cover(rest, pad: MetalSpatialField.clearance, region: false)
        }

        for row in 0..<rows {
            let y = (CGFloat(row) + 0.5) * spacing
            for col in 0..<columns {
                if covered[row * columns + col] { continue }
                let x = (CGFloat(col) + 0.5) * spacing
                let point = CGPoint(x: x, y: y)
                let distanceToObject = object.map { distance(point, to: $0) } ?? .infinity
                if distanceToObject <= MetalSpatialField.clearance { continue }
                let response = object == nil ? 0 : pow(max(0, 1 - (distanceToObject - MetalSpatialField.clearance) / MetalSpatialField.carryReach), 2)
                let edge = target.map { max(0, 1 - self.distance(point, to: $0) / MetalSpatialField.targetReach) } ?? 0
                let opacity = min(1, MetalSpatialField.baseOpacity + response * MetalSpatialField.carryOpacity + edge * MetalSpatialField.targetOpacity)
                var position = point
                if response > 0, let object {
                    let nearestX = min(max(x, object.minX), object.maxX)
                    let nearestY = min(max(y, object.minY), object.maxY)
                    position.x += (x - nearestX) / distanceToObject * MetalSpatialField.push * response
                    position.y += (y - nearestY) / distanceToObject * MetalSpatialField.push * response
                }
                draw(position, opacity, edge > response)
            }
        }
    }

    private static func distance(_ point: CGPoint, to rect: CGRect) -> CGFloat {
        let dx = max(max(rect.minX - point.x, 0), point.x - rect.maxX)
        let dy = max(max(rect.minY - point.y, 0), point.y - rect.maxY)
        return hypot(dx, dy)
    }
}

/// One decorative field per Place. Canvas redraws on host scene changes and has no idle timer.
public struct MetalSpatialFieldView: View {
    public let scene: MetalSpatialFieldScene
    @Environment(\.metalColorway) private var colorway

    public init(scene: MetalSpatialFieldScene) {
        self.scene = scene
    }

    public var body: some View {
        Canvas(opaque: false) { context, size in
            let radius = MetalSpatialField.markRadius
            MetalSpatialFieldSamples.visit(scene: scene, size: size) { point, opacity, target in
                let ink = target ? colorway.tokens.spatialFieldTarget.color : colorway.tokens.spatialFieldMark.color
                context.fill(Path(ellipseIn: CGRect(x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2)),
                             with: .color(ink.opacity(opacity)))
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

extension MetalSpatialFieldSamples {
    /// The platform views' draw: the Canvas's marks into a Core Graphics context (y-down).
    static func draw(scene: MetalSpatialFieldScene, colorway: MetalColorway, in context: CGContext, bounds: CGRect) {
        context.clear(bounds)
        let radius = MetalSpatialField.markRadius
        let mark = color(colorway.tokens.spatialFieldMark)
        let target = color(colorway.tokens.spatialFieldTarget)
        visit(scene: scene, size: bounds.size) { point, opacity, isTarget in
            context.setFillColor(isTarget ? target : mark)
            context.setAlpha(opacity)
            context.fillEllipse(in: CGRect(x: point.x - radius, y: point.y - radius, width: radius * 2, height: radius * 2))
        }
        context.setAlpha(1)
    }

    private static func color(_ token: MetalRGBA) -> CGColor {
        CGColor(srgbRed: token.red / 255, green: token.green / 255, blue: token.blue / 255, alpha: token.alpha)
    }
}

#if canImport(AppKit)
/// AppKit canvas adapter for already projected viewport geometry without rebuilding SwiftUI.
@MainActor
public final class MetalSpatialFieldNSView: NSView {
    private var scene = MetalSpatialFieldScene(regions: [])
    private var colorway: MetalColorway = .bone

    public override var isFlipped: Bool { true }
    public override var isOpaque: Bool { false }

    public override init(frame: NSRect) {
        super.init(frame: frame)
        wantsLayer = true
        layerContentsRedrawPolicy = .onSetNeedsDisplay
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    public func setScene(_ scene: MetalSpatialFieldScene, colorway: MetalColorway) {
        self.scene = scene
        self.colorway = colorway
        needsDisplay = true
    }

    public override func setFrameSize(_ newSize: NSSize) {
        super.setFrameSize(newSize)
        needsDisplay = true
    }

    public override func hitTest(_ point: NSPoint) -> NSView? { nil }

    public override func draw(_ dirtyRect: NSRect) {
        guard let context = NSGraphicsContext.current?.cgContext else { return }
        MetalSpatialFieldSamples.draw(scene: scene, colorway: colorway, in: context, bounds: bounds)
    }
}
#elseif canImport(UIKit)
/// UIKit canvas adapter: the AppKit view's twin, for a UIKit canvas.
@MainActor
public final class MetalSpatialFieldUIView: UIView {
    private var scene = MetalSpatialFieldScene(regions: [])
    private var colorway: MetalColorway = .bone

    public override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
        isUserInteractionEnabled = false
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError() }

    public func setScene(_ scene: MetalSpatialFieldScene, colorway: MetalColorway) {
        self.scene = scene
        self.colorway = colorway
        setNeedsDisplay()
    }

    public override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        MetalSpatialFieldSamples.draw(scene: scene, colorway: colorway, in: context, bounds: bounds)
    }
}
#endif
