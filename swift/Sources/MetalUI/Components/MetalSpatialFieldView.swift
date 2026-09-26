import SwiftUI

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
    public let object: CGRect
    public let carried: CGRect?
    public let targetID: String?

    public init(regions: [MetalSpatialFieldRegion], object: CGRect, carried: CGRect? = nil, targetID: String? = nil) {
        self.regions = regions
        self.object = object
        self.carried = carried
        self.targetID = targetID
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
            let object = scene.carried ?? scene.object
            let target = scene.regions.first(where: { $0.id == scene.targetID })?.frame
            let spacing = max(MetalSpatialField.markSpacing, sqrt(size.width * size.height / 12_000))
            guard spacing.isFinite && spacing > 0 else { return }
            let radius = MetalSpatialField.markRadius

            for y in stride(from: spacing / 2, to: size.height, by: spacing) {
                for x in stride(from: spacing / 2, to: size.width, by: spacing) {
                    let point = CGPoint(x: x, y: y)
                    if scene.regions.contains(where: { $0.frame.contains(point) }) { continue }
                    let distance = Self.distance(point, to: object)
                    if distance <= MetalSpatialField.clearance { continue }
                    let response = scene.carried == nil ? 0 : pow(max(0, 1 - (distance - MetalSpatialField.clearance) / MetalSpatialField.carryReach), 2)
                    let edge = target.map { max(0, 1 - Self.distance(point, to: $0) / MetalSpatialField.targetReach) * MetalSpatialField.targetOpacity } ?? 0
                    let opacity = min(1, MetalSpatialField.baseOpacity + response * MetalSpatialField.carryOpacity + edge)
                    var draw = point
                    if response > 0 {
                        let nearestX = min(max(x, object.minX), object.maxX)
                        let nearestY = min(max(y, object.minY), object.maxY)
                        draw.x += (x - nearestX) / distance * MetalSpatialField.push * response
                        draw.y += (y - nearestY) / distance * MetalSpatialField.push * response
                    }
                    let ink = edge > response ? colorway.tokens.spatialFieldTarget.color : colorway.tokens.spatialFieldMark.color
                    context.fill(Path(ellipseIn: CGRect(x: draw.x - radius, y: draw.y - radius, width: radius * 2, height: radius * 2)),
                                 with: .color(ink.opacity(opacity)))
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private static func distance(_ point: CGPoint, to rect: CGRect) -> CGFloat {
        let dx = max(max(rect.minX - point.x, 0), point.x - rect.maxX)
        let dy = max(max(rect.minY - point.y, 0), point.y - rect.maxY)
        return hypot(dx, dy)
    }
}
