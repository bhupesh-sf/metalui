# Fan

A compact control bar for a toolbar that must stay small: it shows the current state, and each cell opens in place.

## Parts
- `Fan` (the bar, `aria-label` required): keeps which cell is open, one at a time; Escape or a press outside folds it and focus returns to the cell that opened it.
- `Fan.Label`: what the bar is about now ("Canvas", "Text", "Ink", "3 selected").
- `Fan.Picker`: the current choice. Pressing it fans the other choices out from behind it: `direction="up"` for a bar at the bottom of the screen, `"both"` to open above and below, centred. Choosing one folds the fan. Arrows move along the fan, Enter picks.
- `Fan.Tray`: an options cap that stretches sideways into a capsule of more controls (any children: picks, buttons); a ‹ at its end folds it.

## Rules
- Use it where a full strip does not fit or would crowd the canvas. Every option is one press away and in view once opened: never put options in a dropdown menu instead.
- The picker holds one kind of choice (tools). The tray holds what goes with the current context (inks and widths while drawing; a selection's actions).
- Motion is the part spring; Reduce Motion keeps the layout and drops the travel.

## Example
```tsx
<Fan aria-label="Canvas tools">
  <Fan.Label>Ink</Fan.Label>
  <Fan.Picker label="Tool" value={tool} options={TOOLS} onValueChange={setTool} />
  <Fan.Tray label="Ink" icon={<InkBead ink={ink} />}>…</Fan.Tray>
</Fan>
```
