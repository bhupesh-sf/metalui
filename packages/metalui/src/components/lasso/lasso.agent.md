# Lasso

The box a drag on empty canvas draws, with a count of what it will select. React: `Lasso` from `@unlocalhosted/metalui`. SwiftUI: `MetalLasso`. It uses the Size readout for its count.

## Use it for

- A drag that starts on empty canvas (the Select tool, or no tool). Every object the box touches is selected when the drag ends.

## Don't use it for

- Showing a selection that already exists (that is the Selection frame), or a region (a region is an object you made).

## Anatomy

- A rectangle in world coordinates from where the drag began to the pointer; a drag up or left works the same.
- Its edge is `presence.lasso-width` (1 pt) in `presence.guide`; its fill is `presence.lasso-fill` (intent green at 6 %). Graphite: `guide-dark` and `lasso-fill-dark`.
- Under it, centred, `presence.readout-gap` / 2 (8 pt) below: `SizeReadout` reading `● 3 blocks` (the count, then the unit dimmed). No readout while the count is 0.
- The line and the readout keep their screen size at every zoom: pass the canvas `scale`.

## States and motion

| State | Look |
|---|---|
| rest | nothing |
| drawing | the box and the count, updated in the same frame as the pointer |
| release | the box fades on the release spring; the Selection frame takes over |

No marching ants, no glow. Reduce Motion: it clears at once.

## API

| React | SwiftUI |
|---|---|
| `rect` (`x`, `y`, `width`, `height`, or `null`) | `rect:` |
| `count` | `count:` |
| `scale` | `scale:` |
| `unit` | `unit:` |

## Starting and ending the drag (the host's job)

`Lasso` only draws; the canvas host owns the pointer. These are the rules that make it reliable:

- **Empty space is anything that isn't an object.** Listen on the canvas element itself, not on the world or a layer inside it. A press on the guides layer, on a selection frame's gap, or on the canvas outside a zoomed-out world (at 50 % most of the canvas) is empty space. Only a press on an object is not: that one moves the object. Mark objects (e.g. `data-note`) and test `event.target.closest(...)`; never test `event.target === event.currentTarget`.
- **No native text selection.** Call `preventDefault()` on the lasso's `pointerdown` and put `user-select: none` (`select-none`) on the canvas, or the browser paints its own selection highlight over the objects' text while the box is drawn. Because `preventDefault` also stops the browser from clearing a selection made elsewhere on the page, call `getSelection().removeAllRanges()` on the press. Capture the pointer on the canvas so the drag survives leaving it.
- **Cursor.** A crosshair over empty space; a grab (grabbing while held) over an object that can be moved.
- **Threshold.** The box appears after 3 screen points of travel; a press without travel is a click on empty space and clears the selection.
- **Modifier keys.** Shift held at the press adds what the box touches to the current selection (a Shift-click keeps it). Escape clears the selection. ⌘ is left to the move (it turns snapping off).
- **After the release** the picked objects show the Selection frame only (`handles="none"`, `readout={false}` for a multi-selection); the size readouts belong to resizing one object, not to choosing several.
- Coordinates are world coordinates: `(clientX - worldRect.left) / scale`, which stays right outside the scaled world too.

## Rules

- The count is what the box touches now, never a guess.
- The box never moves objects; it only chooses them.
- A press on empty space always starts it, wherever on the canvas it lands.
