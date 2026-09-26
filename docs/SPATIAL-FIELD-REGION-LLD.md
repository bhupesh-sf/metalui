# Spatial field and Region

Status: foundation proposal for owner review. No runtime implementation yet.

## Why this belongs to MetalUI

`Region` is a Place: it owns area, names what happens to objects placed there, and remains after the gesture. Its current well has a local 16 px dot pattern from `well.region-dot`. Each Region restarts that pattern at its own origin. The Region page's board tracks a block and target separately, using the pointer position for the drop hit. The field trial on the Selection Frame page is an external React renderer, confined to documentation. None of these pieces gives MetalUI one account of the work surface, contained objects and active target.

Surface Field demonstrates useful spatial responses: a field can yield to object footprints and reinforce a destination. MetalUI should make those responses part of its own Place system, using its token, motion and React/Swift contracts. The external trial is a visual reference, not the product implementation.

## Layer placement

| Layer | Responsibility |
| --- | --- |
| Foundations | Dot geometry, world phase, inks, exclusion distance, target response, timing and reduced-motion rules in `tokens/tokens.json`. Existing `well.region-dot` values seed the geometry; one value has one source. |
| Part | A decorative field renderer. It paints no background or hit target, receives a spatial snapshot, and stays hidden from accessibility. One renderer per work surface. |
| Place | A canvas surface composes the field, Regions and objects. It owns the shared coordinate system and supplies scene/gesture snapshots. `Region` remains a Place within it; it does not create its own animation loop. |
| Instrument | Selection frame, snap guides and carried-object cues remain transient. The field responds to their actual gesture state; it never pretends to be a guide or a ruler. |

The same dots should continue across the canvas and its Regions. A standalone Region keeps a static token-generated dot fallback. Inside a canvas surface, its local pattern yields to the shared field. Region's material fill, edge and header stay its own. The shared field is a floor response and does not change the fixed upper-left light that shades materials.

## One source for state

The host already knows object positions, region geometry and what a drop would do. One spatial snapshot must drive Region's `over` state, its rule text, the carried footprint, the field's clearance and the eventual commit. It must not derive the field from DOM scanning or a second global pointer listener.

```ts
type SpatialSnapshot = {
  viewport: { x: number; y: number; zoom: number };
  regions: Array<{ id: string; rect: Rect; radius: number; state: 'rest' | 'dim' | 'past' }>;
  objects: Array<{ id: string; rect: Rect; radius: number; regionId: string | null }>;
  gesture: null | {
    objectId: string;
    footprint: Rect;
    targetId: string | null;
    phase: 'carry' | 'commit' | 'cancel';
  };
};
```

`Rect` uses CSS points in the canvas coordinate system. The canvas module transforms these once for rendering. React may submit active gestures through an instance-owned controller to avoid re-rendering the tree on every pointer frame; Swift receives the same semantic snapshot. The public interface exposes the snapshot and no drawing knobs. An app can therefore replace the renderer without changing placement semantics.

## Causal response

1. **Rest:** one quiet, phase-aligned field. Region wells retain their material depth; dots read as one floor beneath them. No wandering light or perpetual breathing.
2. **Carry:** the moving object's actual footprint stays clear. Dots recover behind it and gather subtly at its edge. Input remains direct; the object never chases the pointer through a spring.
3. **Target:** the Region that would accept the object gains a bounded field response at its edge. Its existing green well state and written drop rule change from the same `targetId`. Colour never carries the meaning alone.
4. **Commit:** the object lands on the existing object spring, the Region count/rule updates, and the field settles to the new geometry. A cancelled gesture restores the previous scene without a success pulse.
5. **Reduced motion:** static dots and immediate geometry/state changes; Region's text and contrast still communicate the target. No ambient loop. Hide/pause the renderer when its canvas is offscreen or the document is hidden.

For a drop, use the carried object's centre within an inset Region, with a small entry/exit tolerance so a pointer grazing a boundary does not flicker the target. Compute the target once in the host. The same target controls preview and commit; releasing elsewhere leaves placement unchanged.

## React and Swift parity

- Generate field values for CSS/Canvas2D and SwiftUI `Canvas` from the same tokens. Compare static rest, carry and target specimens in Bone and Graphite at the same size and scale.
- Renderer works in canvas coordinates, respects device scale, clips to its host and caps work for dense scenes. One field instance covers multiple Regions.
- Dynamic updates invalidate only changed areas or run a short frame sequence for a gesture/settle. Rest has no animation loop.
- Decorative output is `aria-hidden` on web and accessibility-hidden on Swift. Region group name, drop rule, keyboard target choice and count remain semantic.
- An object may be rectangular in the first slice; radius is explicit. Irregular shapes are unsupported until an authored shape contract exists.

## First feature slice and review gates

1. **Foundation review:** settle tokens and the rest/carry/target visual specimen. Use the existing 16 px Region dot geometry as the starting grid; approve its world phase, inks, edge clearance and response strength in both colorways before adding a public renderer.
2. **One Place:** implement one shared field in the Region board. Two Regions and one block use one spatial snapshot. The field, Region over text, count and placement must agree while dragging, dropping, cancelling and using the keyboard. Fix the board's current 624 px content overflow at a 310 px viewport as part of this same feature slice.
3. **Parity gate:** React and Swift specimens for the same snapshot; reduced motion, reduced transparency and increased contrast; one Playwright end-to-end Region slice; browser interaction in both colorways and narrow layout. Run the repo's build gates and report unrelated baseline failures separately.

After this slice proves the contract, other Places may compose the same field. Do not spread it across existing controls or add one renderer per Region.
