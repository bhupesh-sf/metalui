# Spatial field

A decorative Part composed once by a containing Place. The Place supplies its displayed object and Region rectangles in the field's local coordinate system. It chooses the current target, applies the drop and supplies the committed scene. The field never performs hit testing, selects a target or changes placement.

## React

Create one `SpatialFieldController` per surface, render `SpatialFieldCanvas` beneath objects, call `setScene` with bounded visible Regions and stationary object footprints when displayed geometry changes, `setProjection` with the carried footprint and host-selected target, then `endProjection` on drop or cancellation. The small `object` scene key is a one-object shorthand. Keep the controller stable and give the canvas the full surface area. It coalesces pointer samples into one paint per animation frame, caches the stationary occupancy mask, caps raster work, and stops at rest or when hidden. Use `setEnabled(false)` during Place travel. The canvas is inert and hidden from accessibility.

## SwiftUI

Render one `MetalSpatialFieldView(scene:)` beneath a SwiftUI Place, or one `MetalSpatialFieldNSView` beneath an AppKit canvas. Pass `MetalSpatialFieldScene` with displayed Region frames, bounded stationary object frames, optional carried frame and target ID, all in local viewport points. The SwiftUI Canvas redraws only when the host changes its scene; the AppKit view redraws when `setScene` changes its geometry or colorway. Neither has an idle timer or hit target. The host may publish animated presentation frames, but the field must not own a second gesture loop.

## Look and behavior

The field keeps a quiet visible grid at rest. Marks clear Region paper and object footprints. A carried object displaces nearby marks; only the host-selected Region tints nearby marks. Bone and Graphite use the same geometry and generated `spatial-field` recipe. Reduced motion removes field recovery on React; the target and written Region rule remain semantic on both platforms. Standalone Region paper keeps its own local dot material.
