### Scrollspy

From "Components other libraries ship that we don't" § 2: marks the section being read in a table of contents; horizontal and vertical; a scroll container other than the window; an offset; smooth scrolling; the URL hash follows (ReUI Scrollspy, Bootstrap Scrollspy, Mantine `TableOfContents`, Docusaurus and Starlight "On this page").

Now: nothing in the library. The docs site's own "On this page" (`apps/docs/src/app/Shell.tsx`, `Toc`) does part of the job: it collects the page's `h2`s, lights a dot beside the section above a line 120 px down, and lets the browser jump. It breaks two performance rules (a scroll listener that reads every heading's box on every scroll event: `docs/PERFORMANCE.md` rules 1 and 5), knows only the window, never moves the URL, and the dot lights in place instead of travelling. It moves onto the component.

Two neighbours must not be duplicated:

- **`Tabs`** switches which panel is shown: every panel is a peer, only one exists at a time. Scrollspy's sections are all on the page at once, in order; you read through them.
- **`Sidebar`** marks the page you are on (`aria-current="page"`): where you are *between* pages. Scrollspy marks where you are *inside* one.

Read for jobs: ReUI Scrollspy, Bootstrap Scrollspy, Mantine TableOfContents, Docusaurus / Starlight / GitBook "On this page", Apple's developer docs, Stripe's API reference, the HIG's long pages, `scrollPosition(id:)` and `ScrollViewReader` in SwiftUI.

**Place (docs/COMPOSITION.md): a Component.** You operate it (pick an entry) to change something else: where the page is scrolled to. It stands for nothing of the person's (Object fails), it stays while you read rather than only while you act (Instrument fails), and it holds no objects (Place fails: the sections are the host's).

**Semantics.** A `nav` landmark the host names ("On this page"), an ordered list of ordinary links (`href="#id"`), the current one `aria-current="location"` (WAI-ARIA: "the current location within an environment or context"). Not tabs: entries go to places in one document, they don't choose panels, and Tab must walk them like links. Base UI has no part for this; links, `IntersectionObserver` and `scrollTo` are the platform's.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Know where you are in a long page | a docs page, a settings page, a report | the entry of the section being read is current: its label in ink, `aria-current="location"`, and one marker under it | Must |
| The marker travels, it doesn't blink | every change | one marker that glides from entry to entry: in a side rail it is the row's raised option plate with its green rail (Row `selected`, the Sidebar's "you are here"), on the settle spring like `ListGlide` (free travel, no stop to bounce on); in a strip it is the switcher's thumb on its track (the Tabs look), on the part spring. `SlidingIndicator` in both | Must |
| Jump to a section | pick an entry | the page scrolls smoothly to the section; the marker goes straight to the entry you picked and waits there, instead of ticking through every section the page passes on the way | Must |
| Land with the heading clear of a sticky header | any app with a header | `offset`: the line a section must cross to be current, and where a jump lands it. By default it is the scroller's own CSS `scroll-padding-top` (what a page sets for its sticky header already), so most hosts set nothing | Must |
| A scroll container other than the window | a pane, a dialog, a split view | `root`: the scrolling element (a ref or the element); the window when absent | Must |
| Follow along in a side rail | wide pages | `orientation="vertical"` (the default): a column of entries | Must |
| Follow along in a strip of tabs | a phone-width page, a header under the title | `orientation="horizontal"`: the switcher track; when the strip is wider than its box it scrolls, and the current entry is kept in view (the strip scrolls itself, never the page) | Must |
| The URL says where you are | sharing a link to a section | `hash`: the address bar follows the current section with `history.replaceState` (keeping the router's state); arriving at a page with a hash lands on that section | Must |
| Keyboard and readers land too | a jump | focus moves to the section (made focusable with `tabindex=-1` if it isn't), without a second scroll, so Tab continues from there and a reader hears where it landed | Must |
| Reduce Motion | every change | the marker moves at once and a jump is instant | Must |
| Sizes | a dense rail, a regular one | `size`: regular (32) or compact (28) entries; the strip uses the switcher's own two heights | Must |
| See progress through the page | long reads | covered: the marker's place in the list *is* how far you've read; a second bar would say it twice | covered |
| Nested headings (ReUI, Docusaurus) | an h3 under its h2 | `level: 2` on an entry: indented one step, the same marker | Should |
| Tell the host (ReUI `onUpdate`) | a header that shows the section's title | `onValueChange(id)` | Should |
| *ours*: the page's end is the last section | a short last section that can never reach the line | at the bottom of the scroll, the last entry is current | Must |
| A continuous reading bar | a blog's top edge | Later: a CSS scroll-driven animation (`animation-timeline: scroll()`), no script; not a table of contents' job | Later |
| Build the list from the headings (Mantine `getControlProps`, Bootstrap `data-spy`) | any page | dropped: the host knows its headings and their words; the docs site does it in three lines | dropped |
| Spy on the window's horizontal scroll | a horizontal gallery | dropped: sections stack in reading order; a gallery is a carousel's job | dropped |
| Bootstrap's `rootMargin` / `threshold` knobs | tuning | dropped: one line, `offset`, says it in words people mean | dropped |

Not doing: a dot or a lamp per entry (an LED here would say "live" for every row; green stays the one marker's rail); `aria-current="true"` or `"page"` (it's a place within the page); pushing history entries (reading position isn't a place Back should return to: `replaceState` only); a scroll listener (`IntersectionObserver` with a one-pixel line at the offset, plus `scrollend` for the bottom).

**Decide**

- **One marker look or two?** Two, by orientation, both reused: the rail is Row's selected plate and rail (a list's "you are here", like the Sidebar), the strip is the switcher's thumb (a track's "you are here", like Tabs). A plate under a horizontal strip with no track would be a third look for the same thing.
- **Which section is current?** The last one whose top has crossed the offset line; at the bottom of the scroll, the last one. Before the first section crosses, the first is current (a table of contents always says where you are).
- **What's the default offset?** The scroller's computed `scroll-padding-top`, read when the spy starts and on resize, not per frame. Hosts already set it so native anchor jumps clear the header; one fact, one place.
- **Does the hash push or replace?** Replace, always, and only when `hash` is set (a library doesn't change the URL unasked). It keeps `history.state`, so a router's own state survives.
- **What does the marker do during a jump?** It goes to the picked entry at once and holds there until the scroll ends (`scrollend`, or a timeout where it is missing), so it travels once.
- **SwiftUI.** `MetalScrollspy` owns the `ScrollView` and its sections (`scrollPosition(id:)` on macOS 14 / iOS 17, the modern `ScrollViewReader`) beside a rail or strip; `MetalScrollspyRail` is the list alone for a host's own scroll view. No hash: there is no URL.

**Must**
- [ ] React: `Scrollspy` (`items` with `id`, `label`, `level`; `root`, `offset`, `orientation`, `size`, `hash`, `onValueChange`, `aria-label`).
- [ ] Current entry from an IntersectionObserver line, the bottom rule, the jump hold; smooth jump with focus to the section; Reduce Motion instant.
- [ ] The rail (Row's selected plate and green rail gliding on settle) and the strip (switcher thumb on part; the strip keeps the current entry in view).
- [ ] SwiftUI `MetalScrollspy` and `MetalScrollspyRail`, both orientations.
- [ ] Recipe `scrollspy`, agent guide, meta.json, the page with its DialKit panel, the e2e slice; the docs' "On this page" moved onto it.

**Should**
- [ ] `level` for nested headings.
- [ ] `onValueChange`.

**Later**
- [ ] A continuous reading bar (scroll-driven animation).
