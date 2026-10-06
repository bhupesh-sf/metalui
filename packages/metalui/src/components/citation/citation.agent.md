# Citation

Where an answer's words came from. React: `Citation` (and `Citation.Sources`) from `@unlocalhosted/metalui`. SwiftUI: `MetalCitation`, `MetalCitationSources`. An object: it stands for a source and stays with the words it backs. Every look is borrowed: the mark is the link cue's host pill (`mark-url`, as `MarkUrl`), the preview is `PreviewCard`, the list folds in `Collapsible`, each title is a quiet external `Link`. It builds on the provenance tooltip's idea (a cue says where it came from), but a source has a title, a line and a place to go, so it opens a preview card rather than a tooltip. The `citation` recipe holds only sizes.

## Use it for

- A claim in an assistant's answer that came from somewhere: `<Citation n={1} source={…} />` right after the words it backs.
- The sources under the answer: `<Citation.Sources sources={…} />`, in the order of the numbers.

## Don't use it for

- Where a recognised cue came from (a rule, a recognizer, a guess): use the `ProvenanceTooltip`.
- A link in a sentence: use `Link`; a URL at rest: use `MarkUrl`.

## Anatomy

- The mark: the source's number in meta type, tabular figures, on the link cue's pill (at least 18 wide, 5 each side), inline in the text. A link to `source.href`, opening in a new tab.
- The preview: `PreviewCard` after a steady hover (600 ms): the image if any, the title, the description, the host.
- `Citation.Sources`: Collapsible's 32 row with "4 sources" (or `label`), folded by default; open, an ordered list, 6 above and below, rows 6 apart: the number on the same pill (ink2), 8, the title as a quiet external `Link` (truncated), the host in meta type, ink3.
- The host defaults to the href's host without "www.".

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | the pill and its number | – |
| hover | the pill's hover tint; after 600 ms the preview card | the card rises one nest on the surface spring; lingers 300 ms |
| focus | the green ring | – |
| sources open | the list | Collapsible's reveal (settle) and close (release) |

Reduce Motion: the card and the fold crossfade.

## Rules

- Number sources in the order they first appear in the answer, and give `Citation.Sources` the same order: the mark's number is the list's.
- One mark per source per claim; several sources for one claim are several marks side by side.
- A source's `title` is the page's own title; `description` is one line, never the answer again.

## API

| React | SwiftUI |
|---|---|
| `Citation` `n`, `source` (`href`, `title`, `description`, `host`, `image`), anchor props | `MetalCitation(_ n:, source:)` |
| `Citation.Sources` `sources`, `label`, `open`, `defaultOpen`, `onOpenChange` | `MetalCitationSources(_ sources:, label:, isOpen:)` |
| `CitationSource` | `MetalCitationSource(url:, title:, description:, host:)` |

## Keyboard and accessibility

- The mark is a link named "Source 1: Springs" (its number stays in its name); Tab reaches it and Enter follows it. The preview card is for the pointer: everything on it is in the link's name or a step away.
- The list's row is Collapsible's button (`aria-expanded`); the list is an ordered list named "Sources"; each title is an external `Link` that says it opens in a new tab.
