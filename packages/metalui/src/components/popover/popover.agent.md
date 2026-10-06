# Popover

A small panel that comes out of its trigger. React: `Popover` from `@unlocalhosted/metalui`, on Base UI Popover. SwiftUI: `MetalPopover` (work in progress). The plate is the `menu` recipe's frosted plate; the `popover` recipe adds padding, width, text and motion.

## Use it for

- A small task beside the thing it acts on: rename, pick a colour, share a link, confirm a detail. It holds real content: a title, a line, a few controls.

## Don't use it for

- A list of commands (use a menu), a hint on hover (use a tooltip), a choice from options (use a select), or anything that must stop the page until answered (use a dialog).

## Anatomy

- Plate: the menu's frost, radius 18, padding 14, 220 to 320 wide, 6 from its trigger.
- Title (title type), Description (body type, ink2) 4 below it, Body 12 below that.

## States and motion

| State | Look | Motion |
|---|---|---|
| closed | nothing | – |
| opening | the plate starts one nest (6) back toward its trigger, at 0.97, transparent, grown from the trigger's side | rises and fades in together on the surface spring (no overshoot) |
| open | at rest beside the trigger; focus inside | – |
| closing | fades out where it is | release spring; no travel back |
| flipped | if there is no room, it opens on the other side and rises from that side | same |

Reduce Motion: a crossfade.

## API

| React | SwiftUI |
|---|---|
| `Popover.Root` `open`, `defaultOpen`, `onOpenChange`, `modal` | `isPresented:` |
| `Popover.Trigger` (children: the control) | `trigger:` |
| `Popover.Content` `side`, `align`, `anchor` (open from an element with no Trigger, such as a word in the text: pass `finalFocus` too, so focus returns to it) | `arrowEdge:` |
| `Popover.Title`, `Popover.Description`, `Popover.Body`, `Popover.Close` | slots |

## Keyboard and accessibility

- The trigger opens and closes it (Enter or Space). Focus moves into the plate; Tab stays within while open only if `modal`.
- Esc or a click outside closes it and returns focus to the trigger.
- Title and Description name and describe the popup (a dialog role with aria-labelledby and aria-describedby).

## Rules

- It comes from its trigger and goes back to nothing: open on the side with room, never centred on the page.
- Keep it small. If it needs scrolling or more than a few controls, it is a dialog.
- One popover at a time.
- **A confirm that commits a small edit is a Quick edit** (`QuickEdit` in `Popover.Body`; quick-edit.agent.md): Rename, Save region, Tag. The key leads with its glyph (`pen` for Rename) and stays off while the value is empty or unchanged; the name opens selected (a file's extension kept out); Enter commits, Esc cancels; a name it can't take keeps the plate open with the invalid ring and the reason; while it saves the key waits and the field locks; done, the glyph morphs to `check` and the word to "Renamed" on the drum, and the plate closes after the hold; a failure morphs to `sync-error` with Try again. Offer Undo in a toast: "Renamed to Lisbon · Undo". Control the popover (`open`, `onOpenChange`) so Quick edit's `onClose` can close it.
