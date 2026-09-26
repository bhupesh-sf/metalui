# Spatial field and Region

Status: foundation proposal for owner review. No runtime implementation yet.

Source audit: [Surface Field source study](research/surface-field-source-study.md), pinned to the docs-only trial's upstream commit.

## Why this belongs to MetalUI

`Region` is a Place: it owns area, names what happens to objects placed there, and remains after the gesture. Its current well has a local 16 px dot pattern from `well.region-dot`. Each Region restarts that pattern at its own origin. The Region page's board tracks a block and target separately, using the pointer position for the drop hit. The field trial on the Selection Frame page is an external React renderer, confined to documentation. MetalUI has no Place-level spatial contract that lets a canvas response read the same projected action as the Region. Kamui's current medium canvas intentionally hides its older 18-world-unit dot backdrop; a canvas-wide resting grid is not an established design requirement.

Surface Field demonstrates useful spatial responses: a field can yield to object footprints and reinforce a destination. MetalUI should make those responses part of its own Place system, using its token, motion and React/Swift contracts. The external trial is a visual reference, not the product implementation.

## Layer placement

| Layer | Responsibility |
| --- | --- |
| Foundations | Decide when a Place may show a field, coordinate conversions, optical clearance, inks, event priority, timing and reduced-motion rules in `tokens/tokens.json`. The existing 16 px Region paper dots are one material recipe, not an automatic canvas grid. |
| Part | A decorative field renderer. It paints no background or hit target, receives a spatial snapshot, and stays hidden from accessibility. One renderer per work surface. |
| Place | A canvas surface composes the field, Regions and objects. It owns the shared coordinate system and supplies scene/gesture snapshots. `Region` remains a Place within it; it does not create its own animation loop. |
| Instrument | Selection frame, snap guides and carried-object cues remain transient. The field responds to their actual gesture state; it never pretends to be a guide or a ruler. |

The canvas may stay blank at rest. A standalone Region keeps its token-generated paper dots. A Canvas Place can compose one optional field response around a carried object or eligible target. Test whether a continuous, phase-aligned floor helps before replacing Region's local texture. Region's material fill, edge and header stay its own; pointer light does not change the fixed upper-left material light.

## One source for state

The host already knows object positions, region geometry and what a drop would do. It publishes one projected action to Region's `over` state, its drop-rule text, the carried footprint and the field's clearance. The app's placement core remains authoritative for the eventual commit and rule effect. A field must not derive geometry from DOM scanning or its own hit testing.

```ts
type SpatialSnapshot = {
  camera: { x: number; y: number; zoom: number };
  regions: Array<{ id: string; rect: Rect; radius: number; state: 'rest' | 'dim' | 'past' }>;
  objects: Array<{ id: string; rect: Rect; radius: number }>;
  projection: null | {
    objectIds: string[];
    frames: Array<{ id: string; rect: Rect }>;
    targetId: string | null;
    phase: 'carry' | 'cancel' | 'commit';
  };
};
```

`Rect` uses world units in the host canvas coordinate system. The renderer converts to viewport points once; optical distance and hit tolerance use screen points. React may submit active gestures through an instance-owned controller to avoid re-rendering the tree on every pointer frame; Swift receives the same semantic snapshot. This is a proposed contract, not a finished API. The field receives no authority to choose a target or apply a drop.

## Causal response

1. **Rest:** the canvas may be blank; Region wells retain their own quiet paper texture and material depth. No wandering light or perpetual breathing.
2. **Carry:** the moving object's actual footprint stays clear. Dots recover behind it and gather subtly at its edge. Input remains direct; the object never chases the pointer through a spring.
3. **Target:** the Region that would accept the object gains a bounded field response at its edge. Its existing green well state and written drop rule change from the same `targetId`. Colour never carries the meaning alone.
4. **Commit:** the host applies its placement rule; the object lands on the existing object spring, the Region count updates, and the field settles to committed geometry. A cancelled gesture restores the previous scene without a success pulse.
5. **Reduced motion:** static dots and immediate geometry/state changes; Region's text and contrast still communicate the target. No ambient loop. Hide/pause the renderer when its canvas is offscreen or the document is hidden.

For a drop, use the host's projected object geometry and eligibility rule. Kamui currently uses the carried block center for target preview; whether an inset and entry/exit tolerance improves that rule needs a focused interaction trial. Compute the preview target once in the host, then reconcile with the authoritative placement result at commit. If they differ, the field must follow the actual result rather than emit a false success cue.

## React and Swift parity

- Generate field values for CSS/Canvas2D and SwiftUI `Canvas` from the same tokens. Compare blank/rest, carry and target specimens in Bone and Graphite at the same size and scale.
- Renderer works in canvas coordinates, respects device scale, clips to its host and caps work for dense scenes. One field instance covers multiple Regions.
- Dynamic updates invalidate only changed areas or run a short frame sequence for a gesture/settle. Rest has no animation loop.
- Decorative output is `aria-hidden` on web and accessibility-hidden on Swift. Region group name, drop rule, keyboard target choice and count remain semantic.
- An object may be rectangular in the first slice; radius is explicit. Irregular shapes are unsupported until an authored shape contract exists.

## First feature slice and review gates

1. **Foundation review:** compare Region paper on a blank canvas with a subdued continuous field. Settle field visibility, inks, optical clearance, phase if a continuous field is chosen, event priority and response strength in both colorways before adding a public renderer. Do not silently merge the 16 px Region texture with Kamui's unused 18-world-unit backdrop.
2. **One Place:** implement one optional field in the Region board. Two Regions and one block consume one projected action. The field and Region over text must agree while dragging, dropping, cancelling and using the keyboard; count updates from the committed result.
3. **Parity gate:** React and Swift specimens for the same snapshot; reduced motion, reduced transparency and increased contrast; one Playwright end-to-end Region slice; browser interaction in both colorways and narrow layout. Run the repo's build gates and report unrelated baseline failures separately.

After this slice proves the contract, other Places may compose the same field. Do not spread it across existing controls or add one renderer per Region.
