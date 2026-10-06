# Carousel

A few peers looked at one or a few at a time, in a box narrower than all of them. React: `Carousel` and `Carousel.Slide` from `@unlocalhosted/metalui` (a `section` with `aria-roledescription="carousel"`, the WAI-ARIA APG basic carousel; Base UI has no carousel). SwiftUI: `MetalCarousel`. The slides scroll natively with CSS scroll snap; the keys are `IconButton` `tool` with the set's `chevron`; the readout turns on the drum (`SwapText`). The `carousel` recipe holds the peek, the gaps and the bleed. A component: you operate it to change which slides are in view; the slides are the host's.

## Use it for

- A gallery of a few pictures: a listing's photos, an upload's images, a project's screenshots (Attachment tiles).
- Onboarding or "what's new" cards read in order.
- A row of peers on a narrow screen where a grid won't fit: related items, a shelf of Cards, with the next one peeking.

## Don't use it for

- Things that all matter and fit: use a grid (Card's frame). Nothing hidden, nothing to operate.
- Peers chosen by name (Overview, Specs, Reviews): use `Tabs`.
- Many results: a list with `Pagination`. A carousel of 40 is a hidden list.
- A rotating hero. Pick one message.

## Anatomy

- `section` named by `aria-label` (required: what the slides are, "Listing photos").
- Box: a focusable group ("Slides") that scrolls sideways with mandatory snap, no scrollbar. Slides are 12 apart. It bleeds 10 above and below (a negative margin, so it takes no room) and pads 10 each side with the same scroll padding, so raised slides keep their shadows and focus rings.
- Slide (`Carousel.Slide`, a direct child): a group, roledescription "slide", named "3 of 8" unless you name it. Its start edge snaps to the box's start. Width: `slideWidth` (any CSS length), or the box minus a 40 peek, so the next slide shows at the edge.
- Controls, one row under the slides, inset 10 to line up with them: the readout at the start (readout type, ink2, tabular: "3 / 8", or "3–5 / 8" when several are fully in view; the number turns on the drum), and Previous and Next at the end, 8 apart: the graphite tool keys (38) with the chevron pointing left and right.

## States and motion

| State | Look | Motion |
|---|---|---|
| first view | the first slide (or `defaultIndex`) at the start; the next peeks; Previous off | still: placed without motion |
| swipe, trackpad, Shift-wheel | – | the platform's own scroll and snap |
| step (a key, ← →, Home, End) | the readout's number turns | the box glides (smooth `scrollTo`) so the slide's start lands at the box's start |
| at an end | that key at 40 %, `aria-disabled`, still focusable | – |
| settled | a polite status says "3 of 8" (or "3 to 5 of 8") | once, 400 ms after the slides stop changing |
| focus | the green ring on the box or the key | – |

Never rotates on its own: no autoplay, no loop.

Reduce Motion: a step jumps (`behavior: instant`); the drum crossfades. A swipe is the person's own motion and stays.

## API

| React | SwiftUI |
|---|---|
| `aria-label` | the first argument |
| children: `Carousel.Slide` | `items:` and the `slide:` builder |
| `slideWidth` (CSS length) | `slideWidth:` (points) |
| `defaultIndex` | `index:` binding's first value |
| `onIndexChange(index)` (the first slide fully in view) | `index:` (a `Binding<Int>`) |

## How it reads the slides

- An `IntersectionObserver` on the slides (root: the box) fires only when a slide crosses the edge; nothing runs at rest and there is no scroll listener. A slide counts as in view from 97 % of it; a slide wider than the box is in view when it is the most shown.
- A step counts from the slide it is already going to while the box glides, so pressing Next twice moves two.
- `scrollend` ends a step's glide; the status speaks after the slides have been still for 400 ms, so flicking past five slides says one thing.

## Keyboard and accessibility

- Tab reaches the box, then the slides' own controls in order (the browser scrolls a focused one into view: nothing is out of reach), then Previous and Next.
- On the box: ← and → step one slide, Home and End go to the ends. Arrows inside a slide's field stay the field's.
- Previous and Next `aria-controls` the box; at an end they are `aria-disabled` (never `disabled`), so focus is not thrown away.
- Slides are never a live region; the one polite status says where you landed.
- SwiftUI: the scroll view is focusable and ← → step it; each slide is an element named "3 of 8"; the keys are buttons.

## Rules

- Five to ten slides; more is a list.
- Give every picture its alt text; the slide's name is its place, not its content.
- Don't put a carousel in a carousel, and don't make a slide the only place something important lives.
