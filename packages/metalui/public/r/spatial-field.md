# Spatial field

A decorative Part composed once by a containing Place. The Place supplies its displayed object and Region rectangles in the field's local coordinate system. It chooses the current target, applies the drop and supplies the committed scene. The field never performs hit testing, selects a target or changes placement.

## React

Create one `SpatialFieldController` per surface, render `SpatialFieldCanvas` beneath objects, call `setScene` when displayed geometry changes, `setProjection` with the carried footprint and host-selected target, then `endProjection` on drop or cancellation. Keep the controller stable and give the canvas the full surface area. It coalesces pointer samples into one paint per animation frame, caps raster work, and stops at rest or when hidden. The canvas is inert and hidden from accessibility.

## SwiftUI

Render one `MetalSpatialFieldView(scene:)` beneath the Place's content. Pass `MetalSpatialFieldScene` with displayed Region frames, committed object frame, optional carried frame and target ID. SwiftUI Canvas redraws only when the host changes that scene; it has no idle timer. It is inert and hidden from accessibility. The host may publish animated presentation frames, but the field must not own a second gesture loop.

## Look and behavior

The field keeps a quiet visible grid at rest. Marks clear Region paper and object footprints. A carried object displaces nearby marks; only the host-selected Region tints nearby marks. Bone and Graphite use the same geometry and generated `spatial-field` recipe. Reduced motion removes field recovery on React; the target and written Region rule remain semantic on both platforms. Standalone Region paper keeps its own local dot material.
