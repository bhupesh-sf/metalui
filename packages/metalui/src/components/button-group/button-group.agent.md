# Button group and split button

Related actions as one machined bar. React: `ButtonGroup`, `ButtonGroupReadout` and `SplitButton` from `@unlocalhosted/metalui`. SwiftUI: `MetalButtonGroup` and `MetalSplitButton`. The bar and its keys are the `button` recipe; the `button-group` recipe adds the seams, the hover light, the readout window and the rocker.

## Use it for

- A few actions on the same thing, side by side: Undo · Redo; Zoom out · 100 % · Zoom in.
- `latch`: a choice that stays, as latching keys in one bar: alignment (`one`), text marks (`several`).
- `SplitButton`: one main action with a few variants: Export PDF, and a chevron for PNG, SVG, Copy link.

## Don't use it for

- More than four actions (use a toolbar or a menu), or unrelated actions that happen to sit together.
- A value you can't change in place as a key: put it in a `ButtonGroupReadout`, never a Button that does nothing.

## Anatomy

- Bar: one raised cap in the keys' material (standard, compact, or primary when the keys are primary), the outer pill radius only, clipped to it.
- Keys: Buttons (or Toggles with `latch`), bare in the bar, square inside; the end keys keep the bar's pill ends.
- Seam: 2 wide, a dark line and a light edge beside it, between every two parts; the bar draws it, so it never moves.
- Window (`ButtonGroupReadout`): the field well cut into the bar, 4 inside its edges, at least 56 wide, radius 4, tabular figures on the drum.
- Split: the main Button, a seam, a 32 wide chevron key with the set's `chevron` as a `MorphIcon`.

## States and motion

| State | Look | Motion |
|---|---|---|
| rest | one cap, seams | – |
| hover | that key's light lifts; not the bar | fade 180 ms |
| pressed | that key in the button's pressed look, down 1; seams and the rest stay | the button's press and release |
| rocker pressed | the whole cap tips 1° toward the pressed end; the key doesn't slide | part spring |
| latched | the key stays sunk with its lamp lit | the toggle's latch |
| menu open (split) | the chevron key held down; the chevron points up | the chevron turns over on its axis (a `MorphIcon` half turn, edge-on midway) on the settle spring, the way the combobox's does; a CSS spin would swing it through pointing sideways |
| focus | the green ring 2 inside the key, following the bar's ends | – |
| disabled | a key at 40 %; `disabled` sets the whole bar at 40 % and refuses | – |
| waiting | the main key held with its arc (`Button` `state`, `useWait`) | the button's wait |

Reduce Motion: the rocker and the chevron turn at once; the drum cross-fades.

## API

| React | SwiftUI |
|---|---|
| `ButtonGroup` `aria-label`, `disabled`, `rocker`, children (Buttons, a `ButtonGroupReadout`) | `MetalButtonGroup(_:cap:size:rocker:parts:)` with `.key(…)`, `.readout(…)` |
| `ButtonGroup` `latch="one" \| "several"`, `value`, `defaultValue`, `onValueChange`, children (Toggles with `value`) | `.latch(_:isOn:)` parts |
| `ButtonGroupReadout` children (the value as words) | `.readout("100 %")` |
| `SplitButton` children (the main Button; its `cap` and `size` dress the bar), `menu` (MenuItem…), `menuLabel`, `heading`, `disabled` | `MetalSplitButton(_:icon:cap:size:menuLabel:heading:items:action:)` |

The bar takes its material from the keys: give every key the same `cap` and `size`. Pass Buttons directly (no fragments) so the bar can cut a seam between each.

## Keyboard and accessibility

- A `group` named by `aria-label` (a fieldset, so `disabled` disables every key). Each key is its own tab stop; with `latch` the bar is a toggle group (arrows move, Space latches).
- The readout is a polite `status`: a step is announced. Glyph-only keys need `aria-label`.
- The chevron is a menu button named by `menuLabel`; ↓ or Enter opens the menu, Esc closes it and returns focus.

## Rules

- Keep them related: one object, one kind of action. One primary bar at most per place.
- An action names itself with a glyph and a verb (`icon`); a stepper may be glyph-only.
- When a choice changes what the main action does (the last format chosen becomes the main action), turn its words with `SwapText` and morph its glyph with `MorphIcon`; while it works, hold it with `state` from `useWait`.
