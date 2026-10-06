# Scrollspy

Marks the section being read in a table of contents, and jumps to a section when you pick its entry. React: `Scrollspy` from `@unlocalhosted/metalui` (a `nav` with an ordered list of links, the current one `aria-current="location"`; Base UI has no scrollspy). SwiftUI: `MetalScrollspy` (the scroll view and its contents) and `MetalScrollspyRail` (the contents alone). Every look is borrowed: the row's raised option plate and green rail (the rail's marker), the switcher's track and thumb (the strip). The `scrollspy` recipe holds the entry sizes. A component: you operate it to change where the page is scrolled to.

## Use it for

- "On this page" beside a long document: docs, a settings page, a report, an API reference.
- A strip of section tabs under a title on a narrow page, that follows as you read.
- A long pane inside an app (a dialog, a split view) with its own contents.

## Don't use it for

- Panels where only one shows at a time: use `Tabs`.
- Moving between pages: use `Sidebar` (it marks the page, `aria-current="page"`).
- The steps of a task: use `Stepper`.

## Anatomy

- `nav` (named by `aria-label`, required: "On this page") holding an ordered list of links, `href="#id"`.
- Rail (`orientation="vertical"`, the default): entries in ui type and ink2, ink on hover and when current; regular 32 or compact 28 tall (they grow for a second line), padded 10 across, radius 10, 2 apart. A `level: 2` entry is indented 12. The marker is one plate under the current entry: the row's option-on plate with its green rail on the leading edge (inset 8 from top and bottom; 7 compact).
- Strip (`orientation="horizontal"`): the switcher's sunk track with its options (compact or regular heights) and its raised thumb under the current entry. Wider than its box, the strip scrolls sideways (no scrollbar) and keeps the current entry centred in view.

## States and motion

| State | Look | Motion |
|---|---|---|
| first view | the section at the top is current | still: the marker is placed without motion |
| reading | the entry of the last section whose top has crossed the offset line is current; at the end of the scroll, the last | the rail's plate glides on the settle spring (free travel); the strip's thumb on the part spring |
| jump | the picked entry is current at once | the page scrolls smoothly; the marker travels once and waits until the scroll ends |
| hover | the label in ink | – |
| focus | the green ring on the link | – |

Reduce Motion: the marker moves at once and the jump is instant.

## API

| React | SwiftUI |
|---|---|
| `items` (`id`, `label`, `level`) | `sections:` (`MetalScrollspySection(id, title:, level:)`) |
| `root` (a ref or element; the window when absent) | the `ScrollView` is `MetalScrollspy`'s own; `MetalScrollspyRail` beside yours |
| `offset` (default: the scroller's `scroll-padding-top`) | `offset:` |
| `orientation` (`vertical`, `horizontal`) | `orientation:` (`Axis`) |
| `size` (`regular`, `compact`) | `size:` |
| `hash` (the URL follows; off by default) | – (no URL) |
| `onValueChange(id)` | `MetalScrollspyRail` `current:` and `onSelect:` |
| `aria-label` | the first argument |

## How it reads the page

- An `IntersectionObserver` watches the sections against a one-pixel line at the offset, so the current entry is worked out only when a section's edge crosses it; nothing runs while you read. `scrollend` covers the bottom of the scroll. A resize re-measures.
- The offset is read from CSS (`scroll-padding-top` on the scroller, or `html` for the window) when the spy starts and on resize. Set it once in CSS for a sticky header and native anchor jumps land in the same place.
- A jump scrolls the scroller (never its ancestors), then focuses the section without scrolling again (it gets `tabindex="-1"` if it isn't focusable), so Tab continues from there and a reader hears it.
- With `hash`, the address follows by `history.replaceState` (keeping `history.state`, so a router's state survives), only after the first change; arriving with a hash lands on its section without motion. Back never steps through sections.

## Keyboard and accessibility

- Tab walks the entries like any links; Enter jumps. ⌘-, Ctrl-, Shift- and middle-click keep the browser's own behaviour.
- The current entry says `aria-current="location"`; colour is never the only sign (the plate, or the thumb, and the ink go with it).
- SwiftUI: the entries are buttons; the current one has the selected trait and the hint "Current section".

## Rules

- Entries name their sections exactly as the headings do.
- One contents per page region; don't nest a spy in a spy.
- Keep `hash` for the page's own contents (one per document); a pane's contents leaves the URL alone.
