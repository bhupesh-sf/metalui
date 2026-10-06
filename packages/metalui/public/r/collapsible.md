# Collapsible

Show and hide in place, on its own. React: `Collapsible` from `@unlocalhosted/metalui`, on Base UI Collapsible. SwiftUI: `MetalCollapsible`, `MetalCollapsibleKey`, `MetalCollapsiblePanel`. The row uses the `row` recipe's panel hover; the `collapsible` recipe adds the sizes, the chevron's turn and the reveal. A component: a control you operate; what it holds can be anything.

## Use it for

- One section most people skip, on its own: "Advanced" in a card, "More options" under a form.
- Opening detail from a key beside a line that already names it ("Ana starred 3 repositories").
- The rest of a list: five tags and "Show 3 more".

## Don't use it for

- Several sections in a stack where one replaces another: use `Accordion`.
- Switching between peers: use `Tabs`. Content everyone needs: show it.
- A sideways collapse: `SplitPane` and `Sidebar` own that.

## Anatomy

- Root (`Collapsible`): holds the trigger and the panel; `open`, `defaultOpen`, `onOpenChange`, `disabled`.
- Trigger: a row 32 tall (level with a regular field), padding 12, radius 10, ui type in ink; the title, an optional `summary` in meta type and ink3, and the set's `chevron` (14, ink2) at the end. The row's hover plate hangs 12 past the column on both sides, so the title lines up with the content it opens.
- Key: a ghost `IconButton` with the chevron; `label` says what it shows.
- More: a quiet key 28 tall after the panel, ui type in ink2 (ink on hover); "Show 3 more" (`count`, or `more` for other words) turning on the drum to "Show less" (`less`); the chevron after the words; it hangs 8 so its words line up with the list.
- Panel: what opens. It adds no padding: the host lays out what it holds. `keepMounted` keeps what was typed while it is closed; `hiddenUntilFound` lets the page's search find and open it.

## States and motion

| State | Look | Motion |
|---|---|---|
| closed | the row with its summary; the chevron points along (a quarter turn back), or down for More | – |
| hover | the row lifts (row panel hover) | the row's own fade |
| opening | the panel takes its place at once and is uncovered from its top edge as it slides out from one nest above, fading in; everything after it travels down in step | settle spring, no overshoot |
| open | chevron down (row, key) or up (More); the summary has faded; More says "Show less" | chevron on the part spring (may overshoot its stop); the words turn on the drum |
| closing | it slides back under its trigger, fading; what follows travels up into the gap in step; then the panel goes | release spring |
| focus | the green ring | – |
| disabled | 40 %, still focusable | – |

Only clip, transform and opacity move: never height. A plate around it (a Card, a settings card) takes its new size at once: opening, the room is there first and fills from the top; closing, the content slides away first and the plate closes after.

Reduce Motion: the content crossfades in place, nothing slides or travels, the chevron snaps. The drum crossfades.

## API

| React | SwiftUI |
|---|---|
| `Collapsible` `open`, `defaultOpen`, `onOpenChange`, `disabled` | `isOpen:` binding; `.disabled()` |
| `Collapsible.Trigger` (children: the title) `summary` | `MetalCollapsible(_ title:, isOpen:, summary:)` |
| `Collapsible.Key` `label` | `MetalCollapsibleKey(_ label:, isOpen:)` |
| `Collapsible.More` `count`, `more`, `less` | `MetalCollapsible(isOpen:, more: .count(3))` |
| `Collapsible.Panel` `keepMounted`, `hiddenUntilFound` | `MetalCollapsiblePanel(isOpen:)` |

## Keyboard and accessibility

- Every trigger is a button with `aria-expanded` and `aria-controls` (Base UI); Enter or Space opens and closes it; the Tab order doesn't change.
- A row trigger's name is its title and its summary. A key's name is its `label`.
- `hiddenUntilFound`: the browser's find opens a closed panel that holds the match, without motion.

## Rules

- Title it with what is inside ("Export options"), never "More"; the summary says what it's set to.
- Inside a settings card, the row's own key opens it (only its control acts); don't make the whole settings row a button.
- Nesting needs nothing: put the inner collapsible in the outer panel.
- Several stacked sections, one at a time: that's `Accordion`.
