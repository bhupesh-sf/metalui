### Collapsible

From "Components other libraries ship that we don't", section 3: a standalone show/hide wrapper. `Accordion` and `SplitPane` collapse, but nothing does on its own.

Now: nothing. People reach for a one-section `Accordion` (40-tall header, rules, padding of its own) or hand-roll a `<details>`. Accordion's panel grows by animating `height` (one of the transitions `lint-transitions` still allows); Table's group and row detail reveal by `clip-path` from the top edge while the rows after travel (`useRowMotion`).

Read for jobs: shadcn and Radix Collapsible, Base UI Collapsible, React Aria Disclosure, HTML `<details>`, Apple's HIG disclosure controls (`DisclosureGroup`, the "Show More" button), GitHub's "Show 3 more", Raycast and Things (sections that remember), Linear's sidebar groups.

Place (docs/COMPOSITION.md): a **Component**. It is a control you operate (open, close); it stands for nothing of the person's, has no area of its own and doesn't exist only while you act. What it holds can be anything.

**Jobs**

| Job | Where | Our form | Tier |
|---|---|---|---|
| Hide what most people skip, one section on its own | "Advanced" in a settings card, "More options" under a form | `Collapsible.Trigger`: a row (title, the set's `chevron` at the end, the row's panel hover). Its hover plate hangs past the column, so the title lines up with what it opens | Must |
| Open from a key beside something that already has a name | a heading with a disclosure, a card's header, a list's owner line (shadcn's "starred 3 repositories") | `Collapsible.Key`: a ghost `IconButton` with the chevron; the label says what it shows | Must |
| Show the rest of a list | "Show 3 more" under five tags, contributors, recent files | `Collapsible.More`: a quiet key **after** the panel; the words turn on the drum ("Show 3 more" ↔ "Show less") and the chevron turns over; what was hidden opens above it | Should |
| Content arriving | every open | the panel takes its place at once and is uncovered from its top edge (clip) as it slides out from one nest above, on the settle spring; everything after it travels down in step (transform only) | Must |
| Content leaving | every close | it slides back under its trigger on the release spring while everything after it travels up into the gap in step; then the panel goes | Must |
| Turning that tells | every trigger | the chevron turns a quarter (row, key) or half (more) on the part spring and may overshoot its stop | Must |
| Keyboard and reader | every trigger | Base UI Collapsible: a button with `aria-expanded` and `aria-controls`; Enter or Space; Tab order unchanged | Must |
| Reduce Motion | every open | the content crossfades in place; nothing slides, nothing travels; the chevron snaps | Must |
| Can't open now | a section only owners see | `disabled` on the root: 40 %, still focusable, says why in its title | Must |
| Found by the page's search | long help sections, a FAQ | `hiddenUntilFound` (Base UI): ⌘F finds closed text and opens its section, without motion | Must (free) |
| Keep what was typed while closed | a form's "More options" | `keepMounted` (Base UI) | covered |
| Opened by something else, or remembered | Raycast and Things remember sections | `open` / `onOpenChange`; storing it is the host's. A controlled change travels too | covered |
| Inside a collapsible | a settings section with an "Advanced" inside "Network" | nesting works with no extra API: the inner trigger lives in the outer panel, and the outer panel's followers travel when the inner one opens | Must |
| *ours*: what's inside, said while closed | "Advanced · 2 changed", "Export · PNG, 2×" | `summary` on the row trigger: a readout in ink3 before the chevron that fades out as the section opens (its content now says it) | Should |
| In a settings card | Network, with Proxy inside | covered with no new API: a `Settings.Row` whose control is a `Collapsible.Key` (the settings rule: only the control acts), its panel holding more rows | covered |
| A peek: the first lines showing under a fade | "Read more" on long text | Later. A closed height that isn't zero is a layout the clip can't reach, and a text fade over content is its own job (a truncation part) | Later |
| *ours*: changed inside | a closed section with edited fields | Later: the `ChangedMark` before the title when anything inside changed since saving, so a review of what you touched can't miss a closed section. `summary` covers it in words now | Later |

Not doing: animating `height` (layout every frame; docs/PERFORMANCE.md rule 4 — the clip and the travel do it with transform); a plus that turns into a minus (one disclosure glyph in the library: the chevron); a sideways collapse (SplitPane and Sidebar own that); the chevron at the start of the row (Accordion puts it at the end; one look, and the title keeps the content's column); a coloured or LED mark for open (the turned chevron says it); sizes (the row is 32, level with a regular field; a compact panel can wrap a compact row later if a real screen needs it).

**Decide**

- Is Accordion built on Collapsible? **No, on the web**: Base UI Accordion owns the item values, one-at-a-time and the header semantics, and rebuilding it on Collapsible would reimplement them. They share the set's chevron and its turn now (Accordion drops its hand-drawn path). Accordion keeps its height motion for now: moving it to the clip-and-travel motion means one item closing and another opening in the same frame, two travels over the same rows; that is its own change (Later, below).
- Row chevron at the start or the end? **The end**, as Accordion: a stack of collapsibles reads like an accordion, and the title stays in the content's column.
- The chevron turns with CSS `rotate` on the part spring, not `MorphIcon`'s `turn`: a quarter turn of a chevron is a rotation, it runs on the compositor, and the part spring gives it the stop it presses against. `MorphIcon` stays for glyphs that change meaning.
- Where the travel lives: `motion/rows.ts` (`useTravelAfter`), beside the rows' motion it extends, so Accordion and Table can take it.
- Does the containing plate travel? **No.** A `Card` or settings card around a collapsible takes its new size at once (only transform animates): on opening the space is there first and fills from the top; on closing the content slides away first and the plate closes after. Documented, not hidden.

**Must**
- [x] React on Base UI Collapsible: `Collapsible.Root` (`open`, `defaultOpen`, `onOpenChange`, `disabled`), `Collapsible.Trigger` (the row), `Collapsible.Key`, `Collapsible.Panel` (`keepMounted`, `hiddenUntilFound`).
- [x] The reveal: clip from the top edge and a nest of slide on settle; leaving on release; followers travel in step (`useTravelAfter`), controlled changes included.
- [x] The chevron turning on the part spring; Reduce Motion: crossfade, no travel, the chevron snaps.
- [x] Nested collapsibles; inside a Card, a Fieldset and a settings card, shown on the page.
- [x] SwiftUI `MetalCollapsible` (row), `MetalCollapsibleKey` and `MetalCollapsiblePanel`, the same reveal on the same springs.
- [x] Recipe `collapsible`, agent guide, meta.json, the page with its DialKit panel, the e2e slice.

**Should**
- [x] `Collapsible.More` with the drum, and `MetalCollapsible` `.more`.
- [x] `summary` on the row trigger.

**Later**
- [ ] Accordion on the shared reveal and travel (one closes while another opens).
- [ ] The changed-inside mark.
- [ ] A peek of the first lines.

- Done (2026-10-06): Must and Should. `Collapsible` (Root, Trigger with `summary`, Key, More, Panel) on Base UI; the reveal as keyframes (clip from the top edge with a 24 bleed, a nest of slide, a fade) and `useTravelAfter` in `motion/rows.ts`: followers travel down on open, and on close travel up to where they will be (the panel hidden for one layout) and hold until it goes; a controlled `open` travels too. `MetalCollapsible` (row, `more:`), `MetalCollapsibleKey`, `MetalCollapsiblePanel`. Accordion now draws the set's chevron with Collapsible's turn. Left: Accordion's panel on the shared reveal; SwiftUI slots for `check-slots` (trigger, panel) are pending; a plate around it (a Card, a settings card) takes its new size in one step on the web (at once on opening, when the panel goes on closing).
