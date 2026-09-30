# Split pane

Two places side by side, or stacked, with a divider you can move. React: `SplitPane` from `@unlocalhosted/metalui` (the ARIA window-splitter pattern). SwiftUI: `MetalSplitPane` (work in progress; `HSplitView` and `NavigationSplitView` are the system's). A place: the divider is the `rule`'s hairline with the `switch` thumb as its grip; the `split-pane` recipe adds the hit area, the detents and the steps.

## Use it for

- A list beside its details, a canvas beside an inspector, an editor over its preview: two places whose balance people change.

## Don't use it for

- A sidebar that only opens and closes (use the sidebar place), or content that should reflow instead (use a responsive layout).

## Anatomy

- Two panes; the first takes `size` percent (default 30), the second the rest.
- Divider: a 1 hairline in a 12 hit area, with a 28 × 6 raised grip at its middle.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover | the grip lifts | settle spring |
| dragging | the grip pressed; panes follow the pointer | one to one, no spring |
| let go near the default (3 %) | the default size | snaps on the part spring (a detent) |
| let go past half the minimum (collapsible) | the first pane shut | snaps on the part spring |
| let go under the minimum | the minimum | snaps on the part spring |
| keys | a step of 8 | settle spring |

Reduce Motion: snaps and steps land at once.

## API

| React | SwiftUI |
|---|---|
| `orientation` (`horizontal`, `vertical`) | `HSplitView` / `VSplitView` |
| `size`, `defaultSize` (30), `onSizeChange` | – |
| `min` (15), `max` (85), `collapsible` | `.frame(minWidth:)` |
| `label` (names the divider), two children | – |

## Keyboard and accessibility

- The divider is a focusable `separator` named by `label`, with its value in percent. ← → (↑ ↓ when stacked) step by 8, Home goes to the minimum (or shut, when collapsible), End to the maximum, Enter restores the default. A double-click restores it too.

## Rules

- Give each pane a real minimum; never let content crush.
- Keep the default where most people want it: the detent is there to find it again.
