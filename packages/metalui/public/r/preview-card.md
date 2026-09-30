# Preview card

What is behind a link, seen by resting on it. React: `PreviewCard` from `@unlocalhosted/metalui`, on Base UI Preview Card. SwiftUI: `MetalPreviewCard` (work in progress). The plate, rise and text are the `popover` recipe's; the `preview-card` recipe adds the width and timing.

## Use it for

- Links whose destination is worth a glance before going: a person, a document, another site.

## Don't use it for

- Anything people must see or act on (it only shows on hover), labels for icons (use a tooltip), or actions (use a popover).

## Anatomy

- The link, unchanged.
- Card: the popover's frosted plate, 300 wide, 6 below the link; an optional image (140 tall, radius 10), the title (title type), a line (body type, ink2), the host (meta type, ink3), 6 apart.

## States and motion

| State | Look | Motion |
|---|---|---|
| hover, under 600 ms | the link only | – |
| hover, 600 ms | the card | rises one nest out of the link on the surface spring |
| pointer on the card | the card stays | – |
| pointer away | the card stays 300 ms | then fades on the release spring |

Reduce Motion: a crossfade.

## API

| React | SwiftUI |
|---|---|
| children (the link) | – |
| `preview` (`title`, `description`, `host`, `image`) | – |
| `side` (`bottom`, `top`) | – |

## Keyboard and accessibility

- The card also opens when the link takes keyboard focus. It is a supplement: the link itself must say where it goes; nothing in the card is needed to use the page.

## Rules

- Only for links; never put controls in a preview card.
- Keep it to a glance: an image, a title and a line.
