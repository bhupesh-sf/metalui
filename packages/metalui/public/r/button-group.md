# Button group and split button

Related actions set together. React: `ButtonGroup` and `SplitButton` from `@unlocalhosted/metalui`. SwiftUI: `MetalButtonGroup` (work in progress). The caps are the `button` recipe; the `button-group` recipe adds the tray (the `switch` track's well) and the chevron.

## Use it for

- A few actions on the same thing, side by side: Undo · Redo; Zoom out · 100 % · Zoom in.
- `SplitButton`: one main action with a few variants: Export (PDF) and a chevron for PNG, SVG, Copy link.

## Don't use it for

- A choice that stays chosen (use a switcher, or a toggle group for modes), or more than four actions (use a toolbar or a menu).

## Anatomy

- Tray: a sunk pill, padding 2, keys 2 apart.
- Keys: button caps; the outer ends stay round, the inner corners are 8.
- Split: the main cap, then a 30 wide chevron key; the chevron is 12.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | caps in the tray | – |
| pressed | that key sinks 1 | the button's press; neighbours stay still |
| menu open (split) | the chevron turned over | part spring; back when it closes |
| focus | the green ring on the key | – |
| disabled | a key at 40 % | – |

Reduce Motion: the chevron turns at once.

## API

| React | SwiftUI |
|---|---|
| `ButtonGroup` `aria-label`, children (Buttons) | `MetalButtonGroup { … }` |
| `SplitButton` children (the main Button), `menu` (MenuItem…), `menuLabel`, `heading`, `disabled` | `primary:`, `menu:` |

## Keyboard and accessibility

- A `group` named by `aria-label`; each key is its own tab stop. The chevron is a menu button named by `menuLabel`; ↓ or Enter opens the menu, Esc closes it and returns focus.

## Rules

- Keep them related: one object, one kind of action.
- The main action of a split button is the one most people want; the menu holds the rest.
