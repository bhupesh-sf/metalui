# Avatar

A person, as a small raised disc. React: `Avatar` and `AvatarGroup` from `@unlocalhosted/metalui`, on Base UI Avatar. SwiftUI: `MetalAvatar` (work in progress). An object: the disc is the raised `surface`, presence is the LED part; the `avatar` recipe adds sizes, the ring and the group's spread.

## Use it for

- Showing who: an author, who is here, who something is shared with.

## Don't use it for

- Things that are not people (use an icon or a glyph), or a person's details (link to them; a preview card can show more).

## Anatomy

- Disc: raised surface, round; small 24, regular 32, large 44.
- Initials: the first letters of the first and last names, ink2, in the size's type.
- Photo: covers the disc once it has loaded.
- Presence: the LED at the lower right on a 2 ring of the page's ground.
- Group: discs overlap by 8, each ringed in the ground; past `max` (4), a +N disc.

## States and motion

| State | Look | Motion |
|---|---|---|
| loading | the initials | – |
| loaded | the photo | fades in on the settle spring |
| broken photo | the initials stay | – |
| group, hover | the discs apart | one grid step each, on the object spring |
| group, leave | back together | release spring |

Reduce Motion: the photo appears at once; the group does not spread.

## API

| React | SwiftUI |
|---|---|
| `Avatar` `name`, `src`, `size` (`small`, `regular`, `large`), `presence` (`live`, `waiting`, `off`) | `MetalAvatar(name:image:)` |
| `Avatar` `label`: its accessible name when it differs from `name` ("Assigned to Marta"); `''` when the name is written beside it (decorative, silent) | `.accessibilityLabel`, `.accessibilityHidden(true)` |
| `AvatarGroup` `people`, `max` (4), `size`, `aria-label` | – |

## Keyboard and accessibility

- An avatar is an image named by the person's name (and presence: "Ana Rocha, here"). A group is a named `group`; the +N disc says "3 more". Avatars take no focus; wrap one in a link or button when it goes somewhere.

## Rules

- Always give the name; the initials and the label come from it.
- Colour never carries presence alone: the label says it too.
