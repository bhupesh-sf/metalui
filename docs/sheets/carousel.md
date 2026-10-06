### Carousel

From "Components other libraries ship that we don't" § 5: shadcn's Carousel (Embla): slides in a row with previous and next buttons; one or several per view; vertical; loop; autoplay and other Embla plugins; an API to read and set the slide.

Now: nothing in the library. `ScrollArea` scrolls any box; `Tabs` switches panels; `Pagination` steps through pages of results; Card's frame lays out peers in a grid.

**Be critical first.** A carousel hides most of what it holds, and people rarely look past the first slide. Autoplaying ones are worse: content moves while you read it (WCAG 2.2.2), steals focus from readers, and costs frames at rest (`docs/PERFORMANCE.md` rule 1). Most carousels on the web should be something else:

- **Everything matters equally and fits** (a product's features, a dashboard's cards): a grid. Card's frame, or `grid-template-columns: repeat(auto-fill, minmax(…))`. Nothing hidden, nothing to operate.
- **Peers that each fill the box, one at a time, chosen by name** (Overview / Specs / Reviews): `Tabs`. The names say what's behind each one; "slide 3" says nothing.
- **Many results**: a list with `Pagination`, or a long list. A carousel of 40 is a list someone has hidden.
- **The page's headline** (a hero that rotates offers): don't. Pick one.

A carousel is right when the things are **a sequence of a few peers that are looked at, one or a few at a time, in a box narrower than all of them**:

- a gallery of a few pictures (a listing's photos, an upload's images, a project's screenshots);
- onboarding or "what's new" cards that are read in order;
- a row of peers on a narrow screen where a grid won't fit (related items, a shelf of cards), with the next one peeking so you can see there's more.

Read for jobs: shadcn Carousel (Embla), ReUI, Mantine Carousel, Bootstrap Carousel, the WAI-ARIA APG Carousel pattern, Apple's App Store shelves and Photos, Airbnb's listing gallery, Nielsen Norman's "Carousel usability", SwiftUI `scrollTargetBehavior(.viewAligned)` and `.paging`.

**Place (docs/COMPOSITION.md): a Component.** You operate it (previous, next, a swipe, an arrow key) to change something else: which slides are in view. The slides are the host's objects (Attachment tiles, Cards); the carousel holds them the way a `ScrollArea` holds its content, so Place, which would win only if Component clearly failed, does not. It stays while you look, so it is not an Instrument.

**Semantics (WAI-ARIA APG, "Carousel", basic).** A `section` with `aria-roledescription="carousel"` and the host's `aria-label` ("Listing photos"). Each slide a `group` with `aria-roledescription="slide"` and the label "3 of 8". Previous and next are buttons with names ("Previous slide", "Next slide") that `aria-controls` the slides. Nothing rotates on its own, so there is no rotation control, and the slides are never a live region; a polite status says where you landed ("3 of 8") once the scroll settles. Base UI has no carousel; scroll snap, `scrollTo` and `IntersectionObserver` are the platform's.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Move through slides by touch, trackpad and wheel | every carousel | native horizontal scroll with `scroll-snap-type: x mandatory`; every slide snaps its start edge. Flicks, momentum, rubber-banding and Shift-wheel come from the platform for free | Must |
| See that there is more | the first look | the next slide peeks past the edge: by default a slide is the box's width minus a 40 pt peek; peers set their own width and the cut one at the edge is the peek | Must |
| Step one slide with a pointer | a mouse, no trackpad | Previous and Next: graphite tool keys (`IconButton` `tool`) carrying the set's `chevron` turned to point. At an end, the key is off (`aria-disabled`, 40 %), so focus is never thrown away | Must |
| Know where you are | every carousel | a readout at the start of the control row: "3 / 8", the number turning on the drum (`SwapText`); when several slides are fully in view it reads their range, "3–5 / 8" | Must |
| Hear where you are | readers | each slide is a group named "3 of 8"; a polite status says "3 of 8" (or "3 to 5 of 8") once the scroll settles, not on every slide passed | Must |
| Step by keyboard | the scroll box has focus | ← and → step one slide, Home and End go to the ends; Tab walks into the slides' own controls in order and the browser scrolls the focused one into view, so nothing is out of reach | Must |
| One per view, several per view | a gallery; a shelf | `slideWidth`: any CSS length ("240px", "48%"); absent, the box minus the peek | Must |
| Raised slides keep their shadows | Attachment tiles, Cards | the scroll box bleeds 10 pt above and below and pads 10 pt each side (scroll padding the same), so a plate's shadow and focus ring are never cut at rest | Must |
| Reduce Motion | every step | a step jumps (`behavior: instant`) instead of gliding; the drum crossfades. A swipe is the person's own motion and stays | Must |
| Nothing at rest | every carousel | an `IntersectionObserver` on the slides fires only when one crosses the edge; no scroll listener, no timer | Must |
| Tell the host | a caption under a gallery | `onIndexChange(index)`: the first slide fully in view, from 0 | Should |
| Start somewhere | open a gallery at the photo tapped | `defaultIndex`, landed without motion | Should |
| A gallery with a thumbnail strip | product photos | Later: a row of compact Attachment tiles under it that step it; composition, not a prop | Later |
| Open a slide large | a lightbox | covered: the slide is the host's (Attachment `onOpen` and a Dialog) | covered |
| Page dots (shadcn, Bootstrap, Mantine) | onboarding | dropped as a look, see Decide: the readout says the same in words and scales | dropped |
| Autoplay, with a pause control (Embla Autoplay, Bootstrap `ride`) | a hero | dropped: content that moves on its own fails people who read slowly, needs a pause control to be allowed at all (WCAG 2.2.2), and runs a clock at rest. If a product insists, it scrolls the box on its own timer and owns the pause key | dropped |
| Loop (the last wraps to the first) | Embla `loop` | dropped: a loop hides where the ends are, and the readout then lies; at an end the key is off | dropped |
| Vertical carousel | Embla `axis: 'y'` | dropped: slides stacked down a page are a list, and a vertical snap scroller traps the page's wheel | dropped |
| Drag with the mouse (Embla `dragFree`) | desktops | dropped: a mouse drag on a scroller selects text and fights links; the keys and the wheel do it | dropped |
| Tabbed carousel (a dot per slide as a tab) | APG's second form | dropped: when slides are picked by name, that is `Tabs` | dropped |
| Sizes | – | covered: the keys are the tool key's one size; slides are the host's | covered |

*Ours*:
- The readout counts what you can actually see (a range when several fit), so it never says "6 / 8" while the eighth is already in view.
- The keys turn off at the ends instead of disappearing, so the control row never jumps and focus stays put.
- The peek is the affordance; there is no gradient fade and no "swipe" hint.

**Decide**

- **Readout or page dots?** The readout on the drum, "3 / 8". It works for 3 slides or 30; it says the position in words, which a reader and a glance share; and it invents no LED meaning (a row of lamps with one lit would say "live" for a slide, and green stays the library's "live"). Dots are also tiny targets (WCAG 2.5.8) and, as tabs, a second way to do what the keys and swipe already do. Onboarding with three cards reads "1 / 3" just as well.
- **Where are the controls?** In one row under the slides: the readout at the start, Previous and Next together at the end, in DOM order after the slides (what you see is what Tab reaches). Together, so a pointer alternates between them without travelling; under, so they never sit on a picture.
- **What does a step move?** One slide, for the keys and the arrow keys alike, landing that slide's start at the box's start. With several in view that is slower than a page, but it is never lost: you see the row shift by exactly one.
- **Which slide is "current"?** The first one fully in view (at least 98 % of it); the readout's range ends at the last fully in view. At an end, the key that would go past it is off.
- **What's the default slide width?** The box minus a 40 pt peek, so a single gallery photo always shows the edge of the next.
- **Hidden slides: inert or reachable?** Reachable. Tab walks every slide's controls in order and the browser scrolls the focused one into view; making off-screen slides inert would hide content from keyboard users for the sake of a look.
- **SwiftUI.** `MetalCarousel(label, items:) { item in … }`: a horizontal `ScrollView` with `scrollTargetLayout()` and `scrollTargetBehavior(.viewAligned)` (macOS 14), `scrollPosition(id:)` for the readout and the keys, `containerRelativeFrame` for the peek, the same tool keys and the readout with `numericText`. ← and → step it when focused.

**Must**
- [x] React: `Carousel` and `Carousel.Slide` (`aria-label`, `slideWidth`); scroll snap, the peek, the bleed, the tool keys, the readout, the status, ← → Home End; Reduce Motion instant.
- [x] SwiftUI `MetalCarousel`.
- [x] Recipe `carousel`, agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Should**
- [x] `onIndexChange`, `defaultIndex`.

**Later**
- [ ] A thumbnail strip under a gallery.
- [ ] Right-to-left (the keys swap and the chevrons turn).
