# Tool strip

Verbs over a selection, adapted to what was clicked. A composition block on Base UI Toolbar. React: `ToolStrip` and `verbsFor` from `@unlocalhosted/metalui`. SwiftUI: `MetalToolStrip`, `MetalToolStrip.verbs(for:in:)` and `.metalToolStrip(over:)`.

## Use it for

- A click selection on the canvas. Each kind has its verbs: a text block **Tasks**, **Summarise**, **Region**; an image **Lift subject**, **Copy**, **Crop**; a link **Open**, **Copy link**; any one of them **Rename**; and every kind **Gather**, **Export**, **Send away** (with Undo). Several selected show only the verbs they share.
- Rows picked in a list (the task inbox): a count leads, verbs with choices open a menu, a close key ends the selection.

## Don't use it for

- A selection made by finishing (⎋, ⌘↩): that selection is quiet.
- While dragging, resizing, in the past, or with the palette open.
- App-level tools (select, write, region, ink). Those are the toolbar.

## Anatomy

- A plate of `Surface material="graphite-strip" radius="strip"` (16) under the keys, padding 4, gap 2.
- `Button cap="strip"` verbs (28 tall, radius 11, padding 10), each with its glyph (`icon`); on a canvas pass `wordClassName="sr-only"` so only glyphs show and the names are in tooltips.
- A `Rule tone="graphite"` 16 tall before the destructive verb, `Button cap="strip-danger"` in the warm red, always last.
- A More key (`more` glyph) before the destructive verb when the verbs don't fit.
- Placed (`anchor`): centred 12 above the selection's bounds, below them when there's no room above, kept 12 inside its positioned parent's edges.

## Choosing the verbs

```tsx
const items = verbsFor(selection.map((n) => n.kind), {
  text:  [tasks, summarise, region, rename, gather, exportIt, sendAway],
  image: [lift, copy, crop, rename, gather, exportIt, sendAway],
  link:  [open, copyLink, rename, gather, exportIt, sendAway],
});
<ToolStrip label={what} anchor={selectionBounds} items={items} wordClassName="sr-only" />
```

- The verbs every selected kind shares, in the first kind's order: list the shared verbs in the same order in every set so muscle memory holds.
- `single: true` (Rename) only for a selection of one.

## States and motion

| State | Look | Motion |
|---|---|---|
| appears (click selection) | the strip | rises 4 on part from the selection (comes down 4 when it sits below); instant under Reduce Motion |
| the selection changes (`items` or `label` changes) | the new verbs | settle spring: kept verbs glide from where they were, the plate's ends travel to the new width (two halves under a fixed clip; only transforms), leaving verbs fade where they stood (release), new ones fade in a beat later; at once under Reduce Motion |
| pan or zoom (`anchor` changes, nothing else) | the strip at the new place | follows at once |
| doesn't fit | the rest in More | – |
| button hover | `rgba(255,255,255,.08)`, white | settle |
| button pressed | down 1 on `rgba(0,0,0,.35)` | 50 ms, back on release |
| disabled | 40 %; the tooltip and accessible description say why (`disabledReason`) | – |
| waiting (`state`) | held down; the glyph turns into the arc after the show delay | the key's own wait |
| hold (`hold`, destructive) | a darker red fill runs across the key while held; runs only at the end | the Button's hold to confirm |

## API

| React | SwiftUI |
|---|---|
| `items: { label, onSelect, icon?, iconOnly?, menu?, destructive?, disabled?, disabledReason?, shortcut?, state?, hold?, single? }[]` | `items: [MetalToolStripItem]` (`icon:`, `iconOnly:`, `menu:`, `destructive:`, `disabled:`, `disabledReason:`, `shortcut:`, `state:`, `hold:`, `single:`) |
| `label` (what they act on; a new selection says something new) | `label:` |
| `count` (a lead before a separator, styled by you: `<span className="type-ui tabular-nums text-toolstrip-ink-hover"><SwapText value="3 selected" /></span>`) | `count:` (a string; it turns on the drum) |
| `wordClassName` (on every word: `sr-only` for glyphs only, `sr-only @lg:not-sr-only` for words when wide) | `glyphsOnly:` |
| `anchor: { x, y, width, height }` (the selection's bounds in the strip's positioned parent, after pan and zoom) | `.metalToolStrip(over: CGRect)` on the canvas (the strip in an overlay, placed the same way) |
| `verbsFor(kinds, sets)` | `MetalToolStrip.verbs(for:in:)` |

## Rules

- Verbs compose, and never own the data before or after.
- Every verb confirms with a toast that says what happened and offers Undo ("Made 3 tasks", "Sent away 3 blocks").
- One destructive verb, last, after the separator, never folded into More. Canvas delete is send away (DS-33), a plain press because it can be undone; an irreversible one holds to confirm (`hold`).
- A disabled verb always says why.
- A verb's glyph is the one whose act is that verb (`task`, `document`, `region`, `pen`, `group`, `share`, `send-away`, `capture`, `copy`, `fit`, `external`, `link`).

## Accessibility

- A Base UI toolbar named "Tools for 3 blocks": one tab stop, arrows between verbs (More included); the destructive verb is named, not only coloured.
- Glyph-only verbs keep their names (`aria-label`); the tooltip is visual. A disabled verb stays focusable and carries its reason as its accessible description. A waiting verb says `aria-busy`.

## Tokens

`--mu-toolstrip-*`, `.mu-frost-graphite`, `--mu-radius-plate`, `--mu-radius-row`, `--mu-spring-part`, `--mu-spring-settle`, `--mu-spring-release`, `--mu-travel-part`. Swift: `MetalToolStripMetrics`.
