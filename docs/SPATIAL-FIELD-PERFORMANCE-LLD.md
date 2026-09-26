# Spatial field: performance-first low-level design

Status: **foundation, Region specimen, and Kamui web/native field adapters implemented and build-checked.** The adapters share the host's existing carry projection and target choice. Kamui web now shares one canvas geometry index across Region targeting, snap candidates, and field visibility; Region DOM virtualization remains open. Focused Region interactions and the Swift capture passed. The broader performance trace and release gates in this LLD remain separate follow-on work.

Owner correction, 2026-09-26: the optional field has a **visible, quiet grid at rest**. It clears Region paper and object footprints, then visibly yields to the carried object and reinforces the selected target. It still has no idle animation or frame loop. Earlier blank-rest statements below record the initial proposal and are superseded by this decision.

Prepared 2026-09-26. Covers MetalUI React/SwiftUI and Kamui web/native canvas. Extends [Spatial field and Region](SPATIAL-FIELD-REGION-LLD.md) and the [pinned source study](research/surface-field-source-study.md). Current source inspected at MetalUI `521c00aa1cd4e717ee46b5c25e3c960cc9ec7f65` and Kamui `017a0d8c3768575fb9c28d9ff7c426dad8c19b50`, including working-tree files. Kamui is actively edited; citations below describe this inspected state, not immutable contents of those commits. Recheck before implementation.

## 1. Decision and scope

Add a small, optional decorative spatial response, driven by the **same host projection that supplies Region target state**. One field belongs to one canvas surface; Regions never create field controllers or animation loops. The approved field has a quiet visible grid at rest. Existing Region paper remains local, with its 16-point recipe. The native Medium canvas's old 18-world-unit dot backdrop stays disabled.

Adopt upstream's separation of retained scene and transient gesture, footprint-based response, bounded invalidation, and sleep lifecycle. Do not adopt its runtime wholesale: the docs trial is React-only, uses different coordinates and defaults, and provides no Swift renderer or placement semantics.

First complete feature: two Regions, one rectangular object, one optional field responding to carry and the host-selected target, on the existing Region documentation page and a matching Swift specimen. This is preceded by foundation approval. Product integrations follow as separate reviewed slices; they are not bundled with foundation work.

Out of scope: new snap rules, changed Region membership, persistence/sync/undo architecture, animated ambient dots, pointer-following light, breathing, generic click ripples, multi-touch manipulation, rotation/nonrectangular silhouette masking, replacing object springs, changing material lighting, a new graphics engine, rewriting every existing gesture, or publishing/deploying either repository.

## 2. Current evidence and integration seams

Repository citations use absolute paths and verified one-based lines. They establish available seams and risks, not measured runtime costs.

| Area | Current source | Consequence |
|---|---|---|
| Layers and parity | [composition](/Users/vijaysingh/unlocalhosted/metalui/docs/COMPOSITION.md:11), [plan](/Users/vijaysingh/unlocalhosted/metalui/docs/PLAN.md:45) | Foundation rules first; decorative output is a Part, Region a Place. Same states and recipes on React/Swift. |
| Region semantic presentation | [React Region](/Users/vijaysingh/unlocalhosted/metalui/packages/metalui/src/blocks/region/region.tsx:143), [Swift Region](/Users/vijaysingh/unlocalhosted/metalui/swift/Sources/MetalUI/Components/MetalRegionView.swift:108) | Existing `over`/`.over` drives drop text; reuse that semantic transition. |
| Existing paper cost | [16-point token](/Users/vijaysingh/unlocalhosted/metalui/tokens/tokens.json:3559), [Swift dot loops](/Users/vijaysingh/unlocalhosted/metalui/swift/Sources/MetalUI/Components/MetalWell.swift:53) | Swift currently draws local dots with a Canvas per Region. Field must add no per-Region animation. Measure existing material cost separately. |
| External docs trial | [controller and scene](/Users/vijaysingh/unlocalhosted/metalui/apps/docs/src/ui/SurfaceFieldDemo.tsx:28), [theme refresh](/Users/vijaysingh/unlocalhosted/metalui/apps/docs/src/ui/SurfaceFieldDemo.tsx:83) | Reference only; DOM measurement and remount behavior are not the product bridge. |
| Web camera | [live/mounted camera](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/camera.ts:24), [transform/conversion](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/camera.ts:85) | Preserve direct world transform and committed mounting/LOD. Field consumes presented camera independently. |
| Web scene mounting | [ordinary block culling](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/World.tsx:40), [Region list](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/regions.tsx:77) | Ordinary blocks are bounded; Regions separately enumerate every Region. Many-Region support requires its own host culling slice. |
| Web gesture | [preview and target](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/interact.ts:184), [commit](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/interact.ts:234) | Feed the post-snap preview, not raw pointer geometry. No new field React state per move. |
| Web target and drop | [center/smallest-area target](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/regions.tsx:212), [post-drop analysis](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/regions.tsx:230) | Current preview scans structural Regions; final membership is recomputed. Decoration cannot make preview authoritative. |
| Web cancellation seam | [capture](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/interact.ts:42) | `pointercancel` invokes the same callback as `pointerup`; source-path risk of treating cancellation as commit. Reproduce and split end reasons before enabling the field. |
| Native camera | [present/commit](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViewport.swift:67), [GPU containers](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViews.swift:273) | Preserve bounds commits versus live GPU transforms. Do not send presented camera through the SwiftUI scene tree. |
| Native visibility | [spatial index](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasVirtualization.swift:10), [mount/keep](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasVirtualization.swift:86), [mount budget](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:568) | Query existing host index; share visible geometry. Do not build a second world index inside the field. |
| Native scene material | [disabled dots](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:332), [old backdrop](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViews.swift:382) | No resting dot field requirement. |
| Native gesture | [reflow and candidate](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Interaction/KamuiCanvasInteraction.swift:834), [finish](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Interaction/KamuiCanvasInteraction.swift:882), [cancel](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Interaction/KamuiCanvasInteraction.swift:1257) | Include projected Region reflow, not only moved object frames. Clear response on every cancellation route. |
| Native authority | [drop plan](/Users/vijaysingh/unlocalhosted/kamui/Sources/Medium/MediumRegionDrop.swift:12), [transactional apply](/Users/vijaysingh/unlocalhosted/kamui/Sources/Medium/MediumRegionDrop.swift:63) | Keep `CanvasStore.dispatch` and existing grouped operation. Publish acceptance only after host result. |
| Existing performance harness | [native live zoom](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Bench/CanvasBench.swift:200), [web timeline](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/e2e/timeline-performance.spec.ts:38) | Extend production-path traces. Existing native log labels p95 ≤8 ms / p99 ≤16 ms; turn thresholds into assertions where not already enforced. |

Native preview excludes prior membership while web preview uses the smallest enclosing structural Region. Equal-area overlap tie behavior is not explicitly shared. The adapter must expose those facts and compare preview with final result; the field must not silently impose one platform's policy on the other. Resolve shared preview policy in the host/core integration gate.

## Kamui base canvas principles

**Kamui supplies the base canvas architecture.** Surface Field supplies examples of decorative response within that architecture. MetalUI should promote the contracts already exercised by Kamui, not create a parallel canvas, scene store, camera, layout engine, hit router or mount scheduler.

| Source-level principle | Reusable MetalUI contract | Decisions retained by Kamui |
|---|---|---|
| **Displayed geometry is a projection, not stored geometry.** [CanvasLayoutProjection](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasLayoutProjection.swift:4) produces timeline/grouped positions and collapsed/expanded stack frames without rewriting free-canvas geometry; [stack projection](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasLayoutProjection.swift:57) preserves anchor identity. | Field reads the host's displayed baseline plus presentation overrides. A layout-mode change is a new scene revision even when persistent document revision is unchanged. Hidden stack members produce no independent footprint. | Layout modes, stacking/group identity, timeline axes, grouping labels, original stored positions and persistence. MetalUI never runs these layouts again. |
| **One camera, two update phases.** [CanvasViewport.present/commit](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViewport.swift:67) applies GPU preview, then commits bounds and content zoom; [camera math](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasCameraMath.swift:4) deliberately leaves AppKit hit testing, IME and caret geometry to the bounds system. | Accept both presented and committed cameras and a phase. Paint against presented transform, refresh detail/visibility against host commits. Never cause a camera commit. | Sticky zoom, min/max scale, timeline horizontal pan, device camera persistence, overscan commit threshold and gesture policy. |
| **One world mapping, explicit rendering layers.** [CanvasViews tree](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViews.swift:4) separates backdrop/LOD, live world, viewport overlays, instruments and chrome; [web WorldLayer](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/Stage.tsx:126) applies one transform. | Field declares its coordinate space and stacking slot; consumes that one mapping. Optical viewport rendering is permitted, but it cannot install another world transform or intercept input. | World layer order, marker ink placement, terminal overlays, selection precedence, board travel and chrome. |
| **Stable IDs and semantic diffs drive minimal work.** [CanvasSceneDiff](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasSceneDiff.swift:7) distinguishes insert/remove/move/resize/content/attributes/reorder; [scene apply](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:452) updates index and mounted views before notifying observers. | Geometry/visibility/order changes invalidate field support. Content-only changes do nothing unless measured footprint or visual environment changes. Scene revision and object ID remain independent of mounted view. | `CanvasItem`, widget adapters, content structure, replica IDs, transaction and undo types. Current diff construction and dictionary rebuilding remain O(N) on a scene apply; do not label them constant-time. |
| **Invalidation is coalesced by reason.** [invalidation flags](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:135), [flush](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:297). | Field mirrors this discipline with geometry/camera/environment/projection/visibility dirty reasons and one pending paint. A camera frame does not masquerade as a model change. | Scene observation and flush timing. Existing scene notifications stay the feed; no additional store observer that repeats `sync()` or analysis. |
| **Visibility has hysteresis and focus exceptions.** [index and mount/keep](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasVirtualization.swift:86), [LOD hysteresis](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasVirtualization.swift:143), [pinning](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:579). | Host supplies visible geometry, guard bounds and pinned identities. Field samples only bounded support, while eligibility remains independent of mounting. | Shared-core thresholds, live-view cap, focus/edit pinning and spatial index. Web camera already delays mounted-camera changes; web Region list still lacks this complete path. |
| **Presentation frames are an independent overlay.** [worldFrame and setPresentationFrames](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:903) override displayed scene frames; [content hug](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:939) can also own an override without a gesture. | Separate presentation-frame deltas from gesture semantics. A geometry override does not imply carrying or target eligibility. Clearing a gesture must not erase unrelated content-owned presentation. | Ownership arbitration between gesture and content, clearing on commit, Region reflow, text measurement. |
| **Expensive work has a bounded pass, not a pointer-time obligation.** [4 ms mount budget](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:94), [pool/rebind](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:628), [LOD queue](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:727). | Field has a fixed resource budget, reusable buffers and cancellation-aware pending work. Optional field work yields before host interaction/mount work. | Reuse kinds, pool limit, widget creation, 2 ms idle/1 ms live silhouette raster budgets. Do not copy these numerical policies into MetalUI as universal defaults. |
| **Interaction model owns gesture intent; scene owns presentation.** [CanvasInteractionModel](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Interaction/CanvasInteractionModel.swift:4), [move model](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Interaction/CanvasInteractionModel.swift:112), [presented-camera input](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:885). | Renderer receives post-snap projected frames and explicit lifecycle/target events. World geometry and screen-constant optical distances remain distinct. | Hit-band priority, selection modifiers, gesture threshold, snapping, stack/Region intent and persistent command. |
| **Far appearance already crosses the library boundary.** [native silhouette rendering](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:697) uses `MetalBlockSilhouette`, including Region, while host core chooses LOD thresholds. | This is the model for adoption: MetalUI supplies appearance from generic state; Kamui chooses when and where. | Which items get live views/layers and when cached silhouettes refresh. Native `updateLODLayers` currently creates layers for all queried IDs ([source](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasScene.swift:670)); its cardinality is not governed by the live-view cap. Measure this baseline separately. |

The minimum new native seam is additive: extend `CanvasSceneObserver` with a read-only displayed-geometry batch/visibility revision and presentation-delta notification, backed by the scene's existing `itemsByID`, `index`, `presentationFrames` and order. Camera comes from `CanvasCameraObserver`; do not add a polling loop. Host keeps ownership of these data structures. The field receives projected values, not references through which it can mutate them.

One subtle query rule follows from current code: `setPresentationFrames` changes mounted/LOD frames without changing the committed index. Therefore a visible query must union indexed displayed-baseline hits with the bounded active presentation overrides, then resolve `worldFrame(of:)`. Otherwise a dragged object entering the viewport from outside the indexed query disappears from field geometry. Content-hug overrides require the same treatment. Do not update the persistent scene/index per pointer merely to solve this.

## 3. Upstream evidence versus proposed behavior

Pinned upstream: `89fbf61440a03f057652383bd78aa597d9b41e25`. The source study validates these source paths; no upstream browser benchmark was run for this LLD.

- [Controller retention and transient channels](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/controller.ts#L12-L95): retains scene/camera, does not replay gesture footprints. Proposed here: generation-scoped identity, patch revisions and explicit terminal acknowledgements.
- [Coordinate contract](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/docs/API.md#L41-L53): root-border-box scene rectangles and viewport gesture rectangles. Proposed here: all geometry in world units, one adapter conversion.
- [Camera lattice](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/viewport.ts#L166-L205): decorative zoom parallax. Proposed here: no lattice in default recipe; any future world lattice uses physical world phase, not parallax that could resemble snapping.
- [Dirty cell painting](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/SurfaceField.tsx#L1319-L1369), [idle/settlement](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/SurfaceField.tsx#L2170-L2263): source demonstrates sparse work and sleeping. Budgets below are proposed acceptance limits, not upstream measurements.
- [Alpha optimization caveat](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/SurfaceField.tsx#L787-L815): a cached path altered faint alpha. Tile/bitmap caching here requires direct-render parity checks.
- [Scene callback](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/SurfaceField.tsx#L2543-L2557) and [wake guard](https://github.com/angelolibero/surface-field/blob/89fbf61440a03f057652383bd78aa597d9b41e25/src/SurfaceField.tsx#L2321-L2343): source study identifies possible reduced-motion stale repaint; inference, not an observed bug. New scheduler must distinguish one-shot paint from animation continuation.

## 4. Ownership and invariants

Host owns document/board identity, layout projection, displayed geometry, presentation-frame ownership, containment, z-order, input/capture, camera, selection, target eligibility, keyboard navigation, drop transaction, undo, counts and announcements. In this document, “committed scene” means the stable displayed layout baseline accepted by the scene shell; it is not necessarily persistent free-canvas geometry. Field scene revisions describe that displayed baseline, independently of persistent document revisions. MetalUI owns field rendering, token interpretation and private bounded render caches. A renderer never writes host state, queries the DOM for objects, walks app stores or chooses a target.

Required invariants:

1. Exactly one field controller per visible canvas surface. Multiple windows have independent controllers; multiple Regions share one controller. At most one active gesture per controller in v1.
2. Persistent object IDs never derive from array position, mounted view identity or geometry. Scope every message by `{sceneId, generation}`; a board switch increments generation and invalidates all old callbacks.
3. Committed scene survives renderer detach within the same host lifetime. Gesture state does not survive detach, board switch, lost capture, Escape, tool replacement or host destruction.
4. Field, Region `over`, and spoken target consume the same host-produced `projectionRevision` and `targetId`. Only target transitions may notify semantic React/SwiftUI subscribers.
5. Final success requires host acknowledgement containing resulting scene revision and actual accepted target(s). A pointer release alone never emits success.
6. Direct manipulation has no smoothing or input delay. Only decorative recovery may settle; cancel has no success cue.
7. Geometry updates repaint even with reduced motion, no active gesture, hidden-to-visible recovery or zero ambient activity.
8. Visibility/LOD may reduce decoration, never eligibility, focus, committed membership or accessible meaning.
9. Work and memory depend on visible response support, not total world area or Region count. No field image of the entire world.

## 5. Coordinate contract

Use top-left, x-right, y-down world rectangles `{x,y,width,height,radius}`. Geometry values are finite Float64/Double; width/height ≥0, zoom >0, radius clamped to half minimum dimension. Unsupported geometry is rejected at adapter boundary with a diagnostic counter; it must not poison a paint pass.

For camera translation `t` in viewport points and scale `z`:

```
viewportPoint = worldPoint * z + t
worldPoint    = (viewportPoint - t) / z
viewportRadius = worldRadius * z
bitmapPoint   = viewportPoint * effectiveDPR
```

Web adapter maps `{x,y,z}` directly to `{tx,ty,zoom}`. At z=1 use the **actual rounded translation** from `cameraTransform`, so object and field cannot diverge by subpixel rounding. Pointer coordinates first subtract the cached stage content-origin in client coordinates. Refresh that origin through layout/scroll/resize notification; never read `getBoundingClientRect` for every object on every move. A scaled/rotated ancestor requires an explicit inverse transform from the host; first slice supports translation-only ancestor layout.

Native adapter receives the camera's existing world/viewport transform. With native offset `o`, `t = -o*z`; use its committed rounding and presented transform, not an independently reconstructed camera. AppKit flipped coordinates are normalized at this boundary once. Field sits in an **identity viewport overlay** behind content/interaction chrome. It uses presented camera and is not additionally transformed by the world container. This avoids double scaling and keeps optical widths constant through live zoom.

Optical clearance, edge band width and AA padding are screen points; object radius and footprint size are world units. Hit tolerance remains host-owned. During a simultaneous pan/zoom and carry, recalculate the world pointer from the current presented camera and preserved grab offset. A delta divided only by the latest zoom is insufficient across changing cameras. Commit consumes the final input sample synchronously, even if an earlier decorative RAF is pending.

## 6. Data contract and update ordering

Names below are proposed API shape. Keep private until the first feature passes review.

```ts
type Scope = { sceneId: string; generation: number };
type Geometry = {
  id: string; kind: 'object' | 'region';
  rect: { x: number; y: number; width: number; height: number };
  radius: number; parentId: string | null; paintOrder: number;
  visibility: 'rest' | 'dim' | 'past';
};
type ScenePatch = Scope & {
  baseRevision: number; revision: number;
  upsert: readonly Geometry[]; remove: readonly string[];
};
type Projection = Scope & {
  gestureId: number; sequence: number; sceneRevision: number;
  projectionRevision: number;
  phase: 'carry' | 'pendingCommit';
  frames: readonly Geometry[]; // changed presentation frames, including reflow
  targetId: string | null;    // candidate chosen by host; never inferred here
};
type Viewport = Scope & {
  revision: number; phase: 'present' | 'commit';
  tx: number; ty: number; zoom: number; // presented mapping
  committed: { tx: number; ty: number; zoom: number; revision: number };
  width: number; height: number; deviceScale: number;
};
type EndGesture = Scope & {
  gestureId: number; sequence: number;
  outcome: 'cancel' | 'accepted' | 'rejected';
  committedRevision: number;
  acceptedTargetIds: readonly string[];
};
```

Presentation geometry has an additional host channel, independent of `Projection`: `setPresentationFrames({scope, revision, ownerToken, upsert, clear})`. An owner token scopes release, so clearing gesture overrides cannot remove a text-hug override. The host resolves overlapping owners and emits the effective frames; MetalUI never invents priority between them. `Projection.frames` references those same effective frames at `projectionRevision` and adds carry/target meaning, rather than supplying an alternative layout. Native content-hug updates use this channel even at rest. Environment/layout changes may repaint without any gesture.

Controller operations: `reset(scope, sceneRevision, geometry)`, `applyScene(patch)`, `setViewport(viewport)`, `setVisibleGeometry(revision, geometry)`, `setProjection(projection)`, `endGesture(result)`, `setEnvironment(environment)`, `attach(surface)`, `detach()`, `dispose()`. Swift equivalents use `Metal` prefixes and `@MainActor` controller methods. Environment includes resolved token revision, colorway, reduced motion/transparency, contrast, surface visibility and app/document activity.

The **existing host scene**, not field or adapter, retains the full displayed scene/index. The adapter is a projection feed over that scene, not a second scene service. Controller retains only current visible geometry and active projection plus revisions. `reset` can seed a small standalone specimen; production adapter passes a visible seed and applies only relevant patches. A standalone specimen supplies its own tiny displayed-geometry list through the same feed; it does not introduce a second controller mode or a generic layout/index implementation. For production, visibility replacement supplies the entire bounded current visible set; scene revision still refers to host's whole scene.

On a normal pointer sample:

1. Host converts input, computes snapped/presented frames and target once, updates direct object presentation.
2. Host publishes latest camera and projection with matching scope. Semantic subscribers are notified only if target/phase changed; geometry goes to the instance controller.
3. Field overwrites its pending projection slot, unions dirty support, schedules at most one RAF/display callback. Repeated pointer events do not allocate a queue.
4. At frame callback, consume coherent latest scene, camera, environment and projection; project geometry once; paint latest state.

Scene patches must match `baseRevision`; a gap requests a bounded visible snapshot from host. Old revisions and old gesture sequences are ignored. Geometry deletion invalidates old support and cancels a projection if its carried object no longer exists. Remote target changes cause host revalidation before further eligibility presentation; field cannot keep a deleted Region highlighted.

`pendingCommit` keeps final footprint until the host supplies committed geometry or failure. An accepted result waits for its `committedRevision` before clearing transient geometry; the adapter normally publishes scene and result in one transaction. A bounded 250 ms visual pending deadline clears decorative target feedback if acknowledgement stalls, without inventing success or cancelling host work. On rejection/cancel, immediately remove target response and restore current committed scene. Terminal messages cannot be coalesced away by later move messages. A remounted renderer paints committed state only; host explicitly reattaches an active gesture if still valid.

Multi-object transfers may have several final destinations. V1 shows one preview target for the lead object as current host behavior does, and no generalized success pulse. Future per-object destinations require a reviewed semantic contract; `acceptedTargetIds` permits honest reconciliation now.

## 7. Scheduling and raster strategy

Use Canvas2D on web; use a dedicated native view with CALayer-backed raster output and CoreGraphics drawing, exposed through stable `NSViewRepresentable` and `UIViewRepresentable` coordinators. SwiftUI receives semantic transitions, not per-pointer geometry. MetalUI's native wrapper must support macOS 14 and iOS 17; Kamui's AppKit canvas uses the same controller/drawing kernel without embedding an extra SwiftUI scene tree.

First recipe: bounded edge response around carried rounded rectangle and eligible target, clipped away from carried interior, with no resting lattice. Compare a sparse dot-edge response against the blank baseline during foundation review; numeric visual constants require approval and then live in `tokens/tokens.json`, generated to both platforms. Performance caps need one versioned source that generates or mechanically checks both language implementations, with parity fixtures; visual values must not hide in that policy.

Scheduler state: `idle`, `paintPending`, `settling`, `suspended`, `disposed`.

- `invalidate` schedules a one-shot paint whenever visible, independently of reduced-motion/animation flags.
- Continue frames only for an active changed projection or approved finite recovery. An unmoving held object has no heartbeat. Proposed maximum decorative recovery: 180 ms; reduced motion makes it zero.
- Hidden document/window, fully offscreen surface, zero size or inactive scene cancels callbacks and drops transient animation history. Retain latest state and one full-dirty flag. On return paint latest snapshot once; never replay elapsed frames.
- Web uses one RAF and one host visibility subscription. Native consumes host frame scheduling when available; the standalone wrapper otherwise owns one display-synchronized callback while dirty/settling, stopped otherwise. A scene that already supplies a frame callback must not gain a second parallel display loop. Native layer updates disable implicit Core Animation actions.
- Disposal disconnects observers, unregisters callbacks, releases bitmap/tile caches and invalidates generation. No process-global pointer listeners owned by the Part.

Native strategy deliberately avoids a new animated SwiftUI `Canvas` per Region. Do not rely on undocumented CALayer backing-store dirty preservation: own a bounded bitmap/tile store, clear and redraw affected tiles, then update layer contents. First slice may use a single small viewport bitmap with full redraw if it meets measured budget; production dirty tiles are gated on measured need. Native copy/upload bytes must be profiled separately from CPU dirty drawing. No claim that `setNeedsDisplay(in:)` alone proves partial GPU work.

### Dirty support

For every changed shape, union **old and new** screen bounds, expanded by maximum effect radius + AA padding. Union old/new target edge bands and any Region reflow. Removing a shape dirties its old support. Intersect with viewport, snap outward to physical pixels, then map to 128-screen-point tiles. Each dirty tile clears to transparent and redraws every intersecting contributor in stable `paintOrder`; repainting only the moved item would erase neighboring effects or leave alpha trails.

The blank-rest recipe needs no retained full background layer. Sparse edge marks are generated only inside active supports. If a later approved lattice exists, identify cells by stable world integer coordinates, derive paint deterministically and cache only visible cells. Never scan every dot against every object: query host geometry once for visible support, then use a bounded screen-tile contributor map. That map is a render cache, not another authoritative world index.

Full repaint triggers: camera change, viewport resize, effective DPR change, theme/token/accessibility change, scope/reset/recovery, paint-order/containment changes affecting occlusion, dirty tiles >35% of viewport or >64 disjoint rectangles. A camera change may redraw the small active response, but must not rerasterize host objects or force mounting. Reuse the latest visible set until its guard margin is exhausted; then host refreshes it. Input must never wait for full-scene indexing.

Sparse/full parity gate: identical semantic snapshot painted through both paths must agree within raster AA tolerance and preserve mean alpha. Pixel equivalence is tested within each platform; cross-platform review checks geometry, optical weight and timing rather than requiring byte-identical antialiasing.

### Bounded resources

Proposed defaults, to validate before release:

- Effective DPR = `min(deviceScale, 2, sqrt(8_000_000 / (width*height)))`, with positive finite dimensions. Allow below 1 on huge windows; field is decoration. Allocate at most 8 million physical pixels per full backing surface, at most two surfaces, approximately 64 MB RGBA total, plus ≤8 MB geometry/tile cache. Count actual platform row alignment and GPU copies in measurement; lower the pixel cap or use tiles if extra native backing copies break the owned-memory gate.
- At most 4,096 visible geometry records in the field cache and 256 directly represented projected frames. Larger carries use a host-supplied union footprint for decoration only; host still manipulates all objects. Do not silently truncate objects into false empty areas.
- At most 12,000 sparse marks in a frame; coarsen decorative sample spacing with stable identity when threshold exceeded. At extreme zoom, omit fine marks and retain a simple target edge response. First slice may have far fewer marks.
- Above geometry/overlap capacity, degrade to active footprint + target outline without background occupancy effects. Region text and existing `over` remain authoritative. Never drop the target because a cache is full.
- Reuse arrays/typed buffers, cached paths and tile scratch storage. No full scene serialization, JSON equality, per-mark objects, new gradients per mark, or growing frame history during gesture.
- Large/overlapping Regions must not be inserted into unbounded numbers of tile bins. Cap bins per contributor; keep a bounded large-shape list. If too many overlap, use outline-only fallback. This also protects a host spatial index's pathological rectangle path.

## 8. Host integration and many-Region behavior

### MetalUI

Proposed source locations after foundation approval:

- `tokens/tokens.json`: approved spatial response recipe only; run generators.
- `packages/metalui/src/components/spatial-field/`: private controller, Canvas2D renderer, React Part, agent guide and `meta.json` with `layer: part`, `kind: custom` and drawing reason.
- `swift/Sources/MetalUI/Components/MetalSpatialField.swift`: semantic types/controller, platform wrapper and drawing kernel; split private renderer files if necessary.
- Existing `apps/docs/src/pages/components/Region.tsx`: extend the real Region interaction specimen, not a new throwaway demo page. DialKit exposes approved values; direct manipulation remains the specimen's teaching interaction.

`Region` API remains semantic. Do not require every Region consumer to install a controller. A containing Place may compose the Part and pass its host projection. Standalone Region paper remains unchanged.

### Kamui web

Mount one viewport field inside `#board-travel-current`, immediately before `WorldLayer` and outside its `#world` transform. [Stage](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/Stage.tsx:89) puts children inside [BoardTravel](/Users/vijaysingh/unlocalhosted/kamui/web/apps/kamui/src/canvas/BoardTravel.tsx:113), whose current wrapper adds a board-travel translation. Field and world inherit that translation exactly once. On travel start, clear/suspend decoration; on arrival reset scene generation and visible feed before enabling it. Do not paint a second field in neighbour preview or let old-board feedback linger. This keeps the field below Region/object content and above the blank surface. Subscribe imperatively to presented camera, adapter geometry changes and gesture lifecycle. Existing gesture code may still have unrelated React subscriptions; claim specifically **zero additional per-pointer React renders caused by field integration**, verified by profiling. Do not claim to have removed all host renders.

Expose a read-only spatial feed from the existing web displayed-geometry path and measured-size changes. In the current free canvas this often matches replica geometry; any layout/stack projection must be applied by the host first, exactly as native `CanvasLayoutProjection` does. If an existing suitable index is found during implementation, extend it; otherwise add one host-owned index and use it for Region visibility and preview candidates. Do not append a second field-only scan over `World` or `Regions`. Update changed IDs incrementally; full seed occurs on board load, outside gesture path.

Many-Region slice: apply mount/keep overscan and LOD to `Regions`, with stable IDs and pinning for keyboard focus, rename/edit, active target, carried Regions and accessibility navigation. Offscreen Regions still exist in host index and eligibility queries. During continuous zoom freeze material/label LOD, transform live views directly, commit detail at gesture end. In dense overview, draw lightweight Region boundaries instead of mounting all paper/header subtrees; focused/target Region remains full semantic UI. Share host mount budget rather than introducing a field-owned competing cap. A complete keyboard Region navigator must reveal/pin offscreen choices so virtualization does not remove access.

Current target scanning and equal-area tie semantics remain a host concern. Replace scans only after recording behavior fixtures, including smallest eligible Region, nesting, past/lens states, moved Regions and exclusions. A renderer cap cannot cap target search results. Correctness first; if overlap makes host search expensive, report it separately from field cost.

### Kamui native

Reuse `CanvasSpatialIndex`, `CanvasVirtualization`, existing presentation-frame overrides and `CanvasViewport` notifications. Subscribe through `CanvasSceneObserver` after `apply` and add an effective-presentation delta hook to `setPresentationFrames`. Export the bounded displayed geometry from `itemsByID`/index plus active overrides, preserving displayed stack identities and order; do not inspect all `NSView`s, read raw store geometry, repeat `CanvasLayoutProjection.make`, or copy `activeItems` per field frame. Insert one passthrough field view into `CanvasRootView` above the page/board preview and immediately below `zoomContainer`, using root viewport bounds ([construction order](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/CanvasViews.swift:242)). Do not put it inside `zoomContainer` or `overlayContainer`; both already apply live transforms. Its hit test always returns nil. Clear/suspend it during board travel and board-grid mode, then reset/repaint against the arriving scene; the field does not reproduce board-travel physics. Respect native mounted/focused pinning and existing LOD policy. Camera-only interaction changes no SwiftUI field environment or scene identity.

Adapt `updateMove` after snapping/reflow, `finishMove` after the actual plan/apply path, and `cancelGesture`/board travel for teardown. Current target preview and `MediumRegionDrop.plan` are separate paths; compare them and publish actual result. Do not run the whole drop plan, text rewriting or Region reflow twice merely to feed decoration.

Many visible paper wells already cost work. First measure baseline. If paper dominates, make a separate MetalWell material slice that caches a 16-point tile keyed by resolved recipe, colorway, scale and accessibility settings, clips at local Region origin, and compares against direct Canvas output. Do not pool field loops or change paper phase to solve that cost. Cache proposal requires both React/Swift material review; it is not a prerequisite for the first field specimen.

## 9. Accessibility and semantic parity

Field is noninteractive, `pointer-events:none`, `aria-hidden` and native accessibility-hidden. Existing Region groups, drop text, labels, focus rings and counts carry meaning. Keyboard movement/select-target/drop uses exactly the host projection channel used by pointer movement. Target announcements occur on target changes, not every geometry frame; cancellation restores focus and announces no success.

Live reduced-motion changes stop recovery immediately and repaint latest state once. Theme changes, including ancestor colorway switches, enter through `setEnvironment`; do not watch only document-root class. Reduced transparency uses opaque approved marks/edge treatment; increased contrast may suppress decorative marks while preserving semantic target styling. Every preference change invalidates current raster and local caches even when idle.

Parity fixtures contain scope, scene revision, camera, environment, committed geometry, ordered projection/end events and expected target/count/phase. Both platforms replay identical semantic fixtures: rest, carry, no target, target, pending, accepted, rejected, cancel, deleted target, hidden resume, board switch and remount. Same semantics are mandatory; raster backend differences are acceptable only after optical review.

## 10. Budgets and proof

All numbers below are **proposed acceptance gates**, not measured results. Record baseline with field disabled and enabled on the same build/device/workload. Existing failing host budgets remain visible; a fast decorative layer does not prove the whole canvas is fast. The field budget is a ceiling within remaining frame time, not an extra 2 ms entitlement on top of a full host budget. Native mount (4 ms) and live LOD raster (1 ms) can already consume much of an 8 ms target; admission must consider their measured aggregate and degrade optional field detail first.

Reference profiles: 1440×900 points, DPR 2, 60 Hz Apple Silicon Mac; repeat on 120 Hz hardware when available and a representative supported iOS device for MetalUI wrapper. Record exact hardware, OS/browser versions, refresh rate, thermal/power state, resolution, source revision and dirty diff. Web Chromium and Safari both required for release; Chromium/CDP is automated measurement lane.

| Metric | Acceptance target |
|---|---|
| Input handler field publication | p95 ≤0.25 ms, no synchronous layout read or full-scene scan |
| Added field frame CPU (projection + paint) | p95 ≤2 ms, p99 ≤4 ms at reference size, including full repaint during zoom |
| Regression against field-off production baseline | whole-frame p95 increase ≤2 ms and missed-interval increase ≤0.5 percentage points; native camera-only commit count and mounted-view count unchanged by field; all absolute gates still apply |
| Whole interactive frame work at 60 Hz | preserve native existing p95 ≤8 ms / p99 ≤16 ms target; web p95 ≤16 ms; report each platform separately |
| Input-to-visible presentation | p95 ≤2 display intervals; field/Region cue no more than one interval behind carried object; collect compositor/presentation evidence |
| Missed frame intervals | <1% >1.5× refresh interval over 30 s steady gesture; compare field-off baseline |
| Idle/offscreen | zero field RAF/display callbacks, raster draws and periodic timers after recovery ends; zero for a 30 s hidden interval |
| Reduced motion update | latest geometry visible by next scheduled display, zero continued animation callbacks |
| Field memory | ≤72 MB owned backing/cache at maximum reference allocation, ≤2 MB retained growth after 100 carry/cancel cycles and GC/quiescence |
| React/SwiftUI churn | zero field-induced per-pointer component/body updates; target transition updates limited to affected semantic UI |
| Scene mount/resize | no field task >8 ms; heavy allocation staged outside direct input; log visible first-paint latency separately |
| Native GPU/raster | incremental field cost ≤2 ms p95 on reference trace where GPU timing available; record upload/copy bytes and fallback if not measurable |

120 Hz doubles cadence, not budgets available to other UI: target field p95 ≤1 ms. If unavailable or not met, document limitation; lower sample density/quality before introducing delayed input. Quality degradation is deterministic by geometry/viewport thresholds, not unstable frame-to-frame oscillation. Optional adaptive degradation requires hysteresis and a separate review.

### Workload matrix

1. Two Regions/one object: 30 s move between targets, cancel, keyboard drop, change target at final pointer sample, then 30 s idle. This is first-slice gate.
2. Existing production-path 1,000-block native bench, mirrored web content: typical text/image/ink mix and 20 Regions; 1/16/256-object carries; long pan and zoom 0.25–3 with repeated direction changes.
3. Dense 10,000-object board, 1,000 Regions total, approximately 100 visible; traverse overscan boundaries. Separately put 1,000 overlapping Regions in viewport to prove bounded decoration and honest host eligibility costs.
4. Several large Regions covering viewport, nested Regions and reflowing target; cross overlap at fractional and negative coordinates. Include huge world coordinates and tiny projected rectangles.
5. Cancel via Escape, pointercancel, lost capture, window deactivation, target deletion, board switch, unmount; cancel during zoom and while commit is pending. No stale cue, sync event, undo entry or leaked frame callback from cancellation.
6. Layout projection: timeline/grouped/collapsed and expanded stacks, switch modes while idle and cancel before mode change during carry; field follows displayed frames, store free-canvas geometry stays unchanged. Include content-hug presentation without gesture and a carried frame crossing the index query boundary.
7. Both colorways; live preference/theme changes; hidden/offscreen resume; DPR change between displays; resize; two surfaces/windows with reused object IDs. First surface must not influence second.

Use deterministic seeded fixtures and scripted gestures, warm up once, capture five 30 s runs and report p50/p95/p99 plus worst run. Exclude build/startup from gesture timings, but measure first allocation separately. Log `sceneRevision`, `gestureId`, sample sequence and presentation sequence for causality; no user content in traces.

Extend [CanvasBench](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Bench/CanvasBench.swift:6) and [FrameDriver](/Users/vijaysingh/unlocalhosted/kamui/Sources/Canvas/Bench/CanvasBenchSupport.swift:79) for native scenarios; use Instruments Time Profiler, Core Animation and Allocations to separate CPU drawing, compositor hitches and memory. `CATransaction.flush` duration is not input-to-photon proof. Use presented-frame timestamps where available and a high-frame-rate capture for physical latency spot checks.

Extend existing web performance integration harness with browser traces, RAF intervals, long-task observation and sampled CDP `TaskDuration`; the latter alone is not per-frame or visible latency. React Profiler verifies render churn in a separate diagnostic run; do not compare profiler-instrumented wall time with release baseline. Browser paint/compositor tracing verifies when pixels appear. Run one live browser at a time.

Only integration/e2e feature tests. Add sparse-versus-full screenshot replay to the Region interaction slice, plus native replay through the real wrapper/view. Test final pixel clearing on cancel and theme round-trip; deterministic snapshots at settled state avoid timing flakes. No unit tests. This document adds no tests or runtime code.

## 11. Atomic rollout and review gates

**G0 — this LLD.** Review ownership, coordinates, budgets, blank-rest policy, candidate-versus-acceptance semantics and API lifetime. Recheck dirty source and resolve referenced seams before coding. Stop for foundation review; implementation permission does not imply visual foundation approval.

**G1 — one foundation slice.** First trace one existing Kamui gesture from displayed layout through scene diff, effective presentation frames, two-phase camera and final command; approve the generic feed shape against this trace before changing MetalUI tokens. Author only spatial response values/rules and matched static React/Swift specimens: blank canvas plus local Region paper, carry footprint, eligible target. Compare optional subdued field at equal scale in Bone/Graphite, zoom and accessibility modes. Approve appearance, support radius, finite timing, density limits and no-success-on-cancel. Generate tokens normally. No product adoption or public Part in this slice.

**G2 — one Region feature slice.** Build one private field Part/controller and one two-Region/one-object interaction using the contract above, React and Swift together. State fixtures, integration/e2e proof, cancellation, keyboard, idle and target timing gates required. First small renderer may use full redraw if measured limits pass. Only then stabilize public names, guide, metadata and registry output. Owner reviews handled specimen before expansion.

**G3 — native reference adapter slice.** Connect the existing Kamui scene-observer feed, effective presentation deltas and camera phases. Prove no extra layout projection, scene scan, camera commit or mount pass; replay free canvas, timeline, grouped and collapsed/expanded stack geometry. Verify native production bench and same semantic fixtures. No native-only visual tuning.

**G4 — web host adapter slice.** Connect production Stage, presented camera and post-snap projection. Correct cancellation end reasons in the touched feature path and reconcile preview/final result. Verify web budget and semantic parity. Keep field opt-in until gate passes.

**G5 — bounded scale slice.** Address web many-Region mounting/candidate lookup, then native material caching only if its independent baseline shows need. These are separate atomic changes, each reviewed before the next. Dirty-tile optimization is likewise justified by a measured bottleneck and sparse/full image parity. Do not claim dense-scene support before this gate passes.

For each implemented slice: focused integration/e2e checks once after coherent work, then required repository build/generation gates once before completion; report unrelated baseline failures separately. Visual changes require real browser/native interaction in both colorways and reduced motion. Commit coherent reviewed chunks; no push, tag, package publish or deploy without explicit request.

## 12. Tradeoffs and release blockers

- A viewport raster redraws on camera motion but keeps optical distance exact and avoids coupling to host world layout. If its measured zoom cost exceeds budget, reduce marks or use a bounded path layer; do not transform optical widths incorrectly to hide work.
- Dirty tiles reduce CPU painting but can add allocation/copy/compositing cost, especially on native. Keep full redraw as a correctness oracle and retain whichever measured path meets budgets with simpler ownership.
- Region culling improves scale but threatens focus and target visibility. Host pinning/navigation and semantic-only eligibility must ship in the same Region-culling slice.
- Perceptual parity can fail despite shared tokens because Canvas2D/CoreGraphics alpha differ. Cache only after faint-mark parity and theme round-trip review.
- Current cancellation and preview/final-target differences are risks visible in source, not runtime-verified bugs. Product enabling is blocked until feature integration proves these routes.
- Host geometry may be stale after asynchronous text layout. Measured-size revisions must invalidate scene/index and revalidate target; retain latest known frame rather than forcing synchronous layout during pointer movement.
- Existing native spatial index uses sets and pathological-rectangle fallback; it is useful infrastructure, not proof that every huge/overlapping Region query is bounded. Dense overlap traces must include host work.
- A field improves spatial comprehension only if the user can correctly identify destination and resulting rule faster/with fewer errors. Owner review should compare field on/off through real carries, not accept motion because it is attractive. Remove the response if it adds cost without clarity.

Release blockers: unresolved coordinate divergence, different target semantics without explicit host decision, stale cancellation pixels, reduced-motion stale scene, per-pointer UI tree updates attributable to field, periodic idle work, unbounded allocations, failed dense-scene gate, or missing React/Swift semantic and optical review.
