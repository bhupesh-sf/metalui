# Link

An inline link in text. React: `Link` from `@unlocalhosted/metalui` (Base UI `useRender`, so `render` can swap in a router's link). SwiftUI: `MetalLink`, a link on its own line. The `link` recipe draws the line, its hover and press, the loading run and the glyphs.

## Use it for

- Going somewhere from inside a sentence: another page, a document, a site.
- `kind="standalone"`: a link on its own line ("All regions ›") under a section or a card.
- `kind="quiet"`: a list or table where every row is already a link (no line until hover).

## Don't use it for

- An action that changes something (use a button; the button's `link` cap for a quiet one), or navigation between sections (use tabs or the navigation menu).

## Anatomy

- The text in its surrounding type and ink, underlined with a 1 hairline under the descenders (`text-underline-position: under`) at 30 % ink.
- A faint tint of the text's ink behind the words, on hover only.
- Glyphs after the words, outside the line: `external` (and "(opens in a new tab)" for assistive tech), `download` then the size in a quieter ink ("· 2.4 MB"; assistive tech hears "(download, 2.4 MB)"), or a chevron for standalone. One glyph at most: download, else external, else the chevron.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | line at 30 % ink (quiet: no line) | – |
| hover | the line rises 1.5 and thickens to 1.5 in the text's ink; a 7 % tint behind the words | settle spring (colour 160 ms) |
| hover, with a glyph | the glyph plays its act (external: the arrow leaves its frame; download: it drops) | the icon's act |
| pressed | the words sink 1 (the press travel) and dim to 64 % | at once |
| focus | the green ring | – |
| visited (`visited`) | words ink2, line ink3 | – |
| current (`aria-current`) | no line, full ink, no pointer | – |
| disabled (`disabled`, `reason`) | ink3, no line, no pointer; the reason in a tooltip | – |
| loading (`loading`) | a run of the text's ink travels along the line, `aria-busy` | 1.1 s, while loading |

Reduce Motion: the line changes without rising, glyphs do not act, and loading breathes (the line fades between rest and full ink) instead of running.

Stills: `data-hovered` and `data-pressed` draw those states without a pointer, and `data-focused` draws the ring (a states strip, a row that owns the hover).

## API

| React | SwiftUI |
|---|---|
| `href`, and every anchor attribute | `destination:` |
| `external` | `external:` |
| `download`, `fileSize` | `fileSize:` (shows the glyph and size; the download itself is the app's) |
| `kind` (`inline`, `quiet`, `standalone`) | `kind:` (`.inline`, `.quiet`, `.standalone`) |
| `visited` | – (SwiftUI has no history) |
| `aria-current` | `current:` |
| `disabled`, `reason` | `.disabled(true)`, `reason:` (the help tag) |
| `loading` | `loading:` |
| `render` (a router's link element; ignored while disabled) | – |

## Keyboard and accessibility

- A real link: Enter follows it. It is underlined in every state but current and disabled, so it is never marked by colour alone; external links say they open a new tab; a loading link is `aria-busy` and says "(loading)".
- Disabled keeps focus (`role="link"`, `aria-disabled`, no `href`) so the keyboard can reach it and hear why.

## Rules

- The text says where it goes: "the export guide", never "click here".
- Mark every link that leaves the site as external.
- Give a download link its file size when you know it: "Tram map.pdf", `fileSize="2.4 MB"`.
- Turn `visited` on in documents (notes, guides), off in apps.
- Use `quiet` only where the context already says "these are links"; everywhere else keep the line.
- Give a disabled link its `reason`.
