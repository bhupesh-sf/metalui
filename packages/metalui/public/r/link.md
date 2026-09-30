# Link

An inline link in text. React: `Link` from `@unlocalhosted/metalui` (Base UI `useRender`, so `render` can swap in a router's link). SwiftUI: `MetalLink` (work in progress). The `link` recipe draws the underline and the external arrow.

## Use it for

- Going somewhere from inside a sentence: another page, a document, a site.

## Don't use it for

- An action that changes something (use a button; the button's `link` cap for a quiet one), or navigation between sections (use tabs or the navigation menu).

## Anatomy

- The text in its surrounding type and ink, underlined with a 1 hairline 3 below the baseline.
- External: a small arrow after the text (0.72 em), and "(opens in a new tab)" for assistive tech.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | underline at 30 % ink | – |
| hover | underline in the text's ink | 160 ms |
| hover, external | the arrow one step up and out | part spring |
| pressed | dimmed | at once |
| focus | the green ring | – |

Reduce Motion: the arrow does not travel.

## API

| React | SwiftUI |
|---|---|
| `href`, and every anchor attribute | `destination:` |
| `external` | – |
| `render` (a router's link element) | – |

## Keyboard and accessibility

- A real link: Enter follows it; it is always underlined, so it is never marked by colour alone. External links say they open a new tab.

## Rules

- The text says where it goes: "the export guide", never "click here".
- Mark every link that leaves the site as external.
